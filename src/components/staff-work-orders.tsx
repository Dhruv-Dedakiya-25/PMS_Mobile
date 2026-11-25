import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffProperties,
  getStaffTickets,
  getStaffWorkOrders,
  type StaffProperty,
  type StaffTicket,
  type StaffWorkOrder,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Button, Card, Onward, Pill, SearchFilterBar } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { byLang, PAGE_STEP } from '@/lib/staff-helpers';
import { space, type Accent } from '@/theme/tokens';

const statusAccent: Record<StaffWorkOrder['status'], Accent> = {
  Pending: 'warning', Scheduled: 'primary', InProgress: 'teal', Completed: 'success', Cancelled: 'danger',
};

const WO_STATUSES: StaffWorkOrder['status'][] = ['Pending', 'Scheduled', 'InProgress', 'Completed', 'Cancelled'];

/**
 * The company's work orders, newest first, from the WorkOrder API. Each opens its
 * ticket. Loads on its own, so a role without work orders still sees the rest of the
 * screen; change reloadKey to load again after a pull to refresh.
 */
export function StaffWorkOrders({ reloadKey = 0 }: { reloadKey?: number }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const [items, setItems] = useState<StaffWorkOrder[]>([]);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('all');
  const [statusChip, setStatusChip] = useState<'all' | StaffWorkOrder['status']>('all');
  const [limit, setLimit] = useState(PAGE_STEP);

  useEffect(() => {
    let cancelled = false;
    const quiet = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
    Promise.all([
      getStaffWorkOrders(),
      quiet(getStaffTickets()),
      quiet(getStaffProperties()),
    ])
      .then(([list, tks, props]) => {
        if (cancelled) return;
        setItems(list);
        setTickets(tks);
        setProperties(props);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.errorLoad'));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, t]);

  const ticketById = useMemo(() => new Map(tickets.map((tk) => [tk.id, tk])), [tickets]);
  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const propertyOptions = useMemo(
    () => [
      { value: 'all', label: t('staff.allProperties') },
      ...properties.map((p) => ({
        value: p.id,
        label: byLang(code, p.propertyNameEn, p.propertyNameAr),
      })),
    ],
    [properties, code, t],
  );

  const propertyIdOf = (wo: StaffWorkOrder) =>
    wo.propertyId || ticketById.get(wo.serviceRequestId)?.propertyId || undefined;

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((wo) => propertyId === 'all' || propertyIdOf(wo) === propertyId)
      .filter((wo) => {
        if (!q) return true;
        const pId = propertyIdOf(wo);
        const prop = pId ? propertyById.get(pId) : undefined;
        return [
          wo.workOrderNumber,
          wo.ticketNumber,
          wo.technicianName,
          wo.contractorName,
          prop?.propertyNameEn,
          prop?.propertyNameAr,
        ].some((v) => v?.toLowerCase().includes(q));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, propertyId, ticketById, propertyById]);

  const chips = useMemo(
    () => [
      { value: 'all' as const, label: t('staff.filterAll'), count: searched.length },
      ...WO_STATUSES.map((st) => ({
        value: st,
        label: t(`staff.woStatus.${st}`),
        count: searched.filter((w) => w.status === st).length,
      })),
    ],
    [searched, t],
  );

  const visible = useMemo(
    () => (statusChip === 'all' ? searched : searched.filter((w) => w.status === statusChip)),
    [searched, statusChip],
  );

  if (error) {
    return (
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <AppText tone="danger">{error}</AppText>
      </Card>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <SearchFilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setLimit(PAGE_STEP);
        }}
        placeholder={t('staff.searchWorkOrders')}
        selects={
          properties.length > 1
            ? [
                {
                  key: 'property',
                  label: t('staff.property'),
                  value: propertyId,
                  onChange: (v) => {
                    setPropertyId(v);
                    setLimit(PAGE_STEP);
                  },
                  options: propertyOptions,
                },
              ]
            : undefined
        }
        chips={chips}
        chipValue={statusChip}
        onChipChange={(v) => {
          setStatusChip(v);
          setLimit(PAGE_STEP);
        }}
      />

      {visible.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <AppText tone="secondary">{t('staff.noWorkOrders')}</AppText>
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {visible.slice(0, limit).map((wo) => {
            const pId = propertyIdOf(wo);
            const prop = pId ? propertyById.get(pId) : undefined;
            return (
              <Card key={wo.id} onPress={() => router.push(`/staff/ticket/${wo.serviceRequestId}` as any)} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                  <AppText weight="bold" style={{ flexShrink: 1 }}>
                    {wo.workOrderNumber} {wo.ticketNumber ? `• ${wo.ticketNumber}` : ''}
                  </AppText>
                  <Pill accent={statusAccent[wo.status] ?? 'warning'} label={t(`staff.woStatus.${wo.status}`)} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="caption" tone="secondary" style={{ flexShrink: 1 }}>
                    {t('staff.assignedTo')}: {wo.technicianName || wo.contractorName || t('staff.unassigned')}
                    {prop ? ` • ${byLang(code, prop.propertyNameEn, prop.propertyNameAr)}` : ''}
                    {wo.cost != null ? ` • ${omr(wo.cost, language.code)}` : ''}
                  </AppText>
                  <Onward />
                </View>
              </Card>
            );
          })}
          {visible.length > limit ? (
            <Button
              tone="outline"
              compact
              label={t('staff.showMore', { count: visible.length - limit })}
              onPress={() => setLimit((n) => n + PAGE_STEP)}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}
