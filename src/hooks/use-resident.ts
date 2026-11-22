/**
 * Contacts, renewal and move-out requests, the mobile key and access cards: live from /api/My
 * in api mode, from src/mock in demo mode.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getMyAccessCards,
  getMyAccessKey,
  getMyContacts,
  getMyLeaseRequests,
  giveMyNotice,
  reportMyAccessCardLost,
  requestMyRenewal,
} from '@/api/my';
import type { ApiContactRole, ApiMoveOutReason, MyAccessCardDto, MyLeaseRequestDto } from '@/api/types';
import { authMode } from '@/config';
import { omanToday } from '@/mock/clock';
import { accessCards as mockCards, contacts as mockContacts, property as mockProperty, tenant as mockTenant, type ContactRole } from '@/mock/data';
import { requestMoveOut, requestRenewal, useMockState } from '@/mock/store';

const isDemo = authMode === 'demo';

/** Loads once, keeps the last result, and reloads on refresh. */
function useLoad<T>(fetcher: () => Promise<T>, demo: T) {
  const [data, setData] = useState<T | undefined>(isDemo ? demo : undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    fetcher()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const refresh = useCallback(async () => {
    if (isDemo) return;
    setRefreshing(true);
    try {
      setData(await fetcher());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setRefreshing(false);
    }
  }, [fetcher]);

  return { data, loading: !isDemo && data === undefined && !error, error, refresh, refreshing };
}

const ROLE: Record<ApiContactRole, ContactRole> = {
  PropertyManager: 'propertyManager',
  MaintenanceDesk: 'maintenanceDesk',
  Reception: 'reception',
  Security: 'security',
  Emergency: 'emergency',
};

export interface Contact {
  role: ContactRole;
  name: string;
  phone: string;
  email?: string;
  hours?: string;
}

export function useContacts() {
  const fetcher = useCallback(
    async (): Promise<Contact[]> =>
      (await getMyContacts()).map((c) => ({
        role: ROLE[c.role] ?? 'propertyManager',
        name: c.propertyName ? `${c.name} · ${c.propertyName}` : c.name,
        phone: c.phone,
        email: c.email ?? undefined,
        hours: c.hours ?? undefined,
      })),
    [],
  );
  const { data, ...status } = useLoad(fetcher, mockContacts.map((c) => ({ ...c, email: c.email || undefined })));
  return { contacts: data ?? [], ...status };
}

const demoRequest = (type: MyLeaseRequestDto['type'], on: string): MyLeaseRequestDto => ({
  id: type,
  requestNumber: type === 'Renewal' ? 'REN-2026-0031' : 'TRM-2026-0012',
  type,
  status: 'Pending',
  createdOn: on,
});

/**
 * The tenant's renewal requests and notices, newest first, with the latest of each kind
 * and how the renewal stands for the lease menu.
 */
export function useLeaseRequests() {
  const mock = useMockState();
  const fetcher = useCallback(() => getMyLeaseRequests(), []);
  const { data, ...status } = useLoad(fetcher, [] as MyLeaseRequestDto[]);

  const requests = isDemo
    ? [
        ...(mock.renewal === 'requested' ? [demoRequest('Renewal', omanToday())] : []),
        ...(mock.moveOutRequested ? [demoRequest('Termination', mock.moveOutRequested)] : []),
      ]
    : (data ?? []);
  const renewal = requests.find((r) => r.type === 'Renewal');
  const notice = requests.find((r) => r.type === 'Termination');
  const renewalState: 'open' | 'requested' | 'renewed' =
    renewal?.status === 'Pending' ? 'requested' : renewal?.status === 'Accepted' ? 'renewed' : 'open';

  const askRenewal = useCallback(async (years: 1 | 2, note: string) => {
    if (isDemo) {
      requestRenewal();
      return demoRequest('Renewal', omanToday()).requestNumber;
    }
    const created = await requestMyRenewal(years === 2 ? 24 : 12, note.trim() || undefined);
    return created.requestNumber;
  }, []);

  const sendNotice = useCallback(async (date: string, reason: ApiMoveOutReason, note: string) => {
    if (isDemo) {
      requestMoveOut();
      return demoRequest('Termination', omanToday()).requestNumber;
    }
    const created = await giveMyNotice(date, reason, note.trim() || undefined);
    return created.requestNumber;
  }, []);

  return { requests, renewal, notice, renewalState, askRenewal, sendNotice, ...status };
}

const KEY_PERIOD = 30;

/** Demo mode's stand-in code, changing on the same 30-second clock as the real one. */
const demoKey = () => {
  const seconds = Math.floor(Date.now() / 1000);
  return { code: `EFK-${mockProperty.unitNo}-${Math.floor(seconds / KEY_PERIOD)}`, left: KEY_PERIOD - (seconds % KEY_PERIOD) };
};

/**
 * The mobile key's code, asked for again each time it runs out so the QR on screen is always
 * the one the gate accepts.
 */
export function useMobileKey() {
  const [code, setCode] = useState<string | undefined>(() => (isDemo ? demoKey().code : undefined));
  const [left, setLeft] = useState(() => (isDemo ? demoKey().left : KEY_PERIOD));
  const [error, setError] = useState<string | null>(null);
  const leftRef = useRef(left);

  useEffect(() => {
    let cancelled = false;
    const show = (next: string, seconds: number) => {
      if (cancelled) return;
      setCode(next);
      leftRef.current = seconds;
      setLeft(seconds);
      setError(null);
    };
    const fetchKey = () => {
      if (isDemo) {
        const k = demoKey();
        show(k.code, k.left);
        return;
      }
      getMyAccessKey()
        .then((key) => show(key.code, key.secondsLeft))
        .catch((e: unknown) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : 'Error');
          // Tries again after one period rather than straight away.
          leftRef.current = KEY_PERIOD;
          setLeft(KEY_PERIOD);
        });
    };
    if (!isDemo) {
      getMyAccessKey()
        .then((key) => show(key.code, key.secondsLeft))
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
        });
    }
    // Counts down on the phone and asks again when the code runs out.
    const timer = setInterval(() => {
      leftRef.current -= 1;
      if (leftRef.current <= 0) fetchKey();
      else setLeft(leftRef.current);
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { code, secondsLeft: left, error };
}

export function useAccessCards() {
  const demo: MyAccessCardDto[] = mockCards.map((c) => ({
    id: c.id,
    cardNumber: c.number,
    holderName: c.holder,
    isPrimary: c.holder === mockTenant.name,
    zones: c.zones.join(', '),
    validUntil: c.expires,
    status: c.active ? 'Active' : 'Cancelled',
  }));
  const fetcher = useCallback(() => getMyAccessCards(), []);
  const { data, refresh, ...status } = useLoad(fetcher, demo);
  const [lostInDemo, setLostInDemo] = useState<string[]>([]);

  const cards = (data ?? []).map((c) => (lostInDemo.includes(c.id) ? { ...c, status: 'Lost' as const } : c));

  const reportLost = useCallback(
    async (id: string) => {
      if (isDemo) {
        setLostInDemo((ids) => [...ids, id]);
        return;
      }
      await reportMyAccessCardLost(id);
      await refresh();
    },
    [refresh],
  );

  return { cards, reportLost, refresh, ...status };
}
