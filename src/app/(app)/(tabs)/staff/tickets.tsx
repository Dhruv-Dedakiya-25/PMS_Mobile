import { IconPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffProperties,
  getStaffServiceCategories,
  getStaffTickets,
  type StaffProperty,
  type StaffTicket,
} from '@/api/staff';
import type { ServiceCategoryOptionDto } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Onward, Pill, SearchFilterBar } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { DEFAULT_SERVICE_CATEGORIES, formatTicketCategory } from '@/lib/service-categories';
import { byLang, PAGE_STEP, translatePriority, translateTicketStatus } from '@/lib/staff-helpers';
import { space } from '@/theme/tokens';

type Filter = 'all' | 'open' | 'inProgress' | 'resolved';

export default function StaffTickets() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const { permissionsFor, isDemo } = useAppSession();
  const permissions = permissionsFor('staff/tickets');

  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOptionDto[]>(DEFAULT_SERVICE_CATEGORIES);
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE_STEP);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [tks, props, cats] = await Promise.all([
      getStaffTickets(),
      getStaffProperties().catch(() => [] as StaffProperty[]),
      isDemo ? Promise.resolve(DEFAULT_SERVICE_CATEGORIES) : getStaffServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
    ]);
    return { tks, props, cats: cats.length > 0 ? cats : DEFAULT_SERVICE_CATEGORIES };
  }, [isDemo]);

  const fetchTickets = useCallback(
    (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      loadAll()
        .then(({ tks, props, cats }) => {
          setTickets(tks);
          setProperties(props);
          setCategories(cats);
          setError(null);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : t('common.errorLoad'));
        })
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [loadAll, t],
  );

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .then(({ tks, props, cats }) => {
        if (!cancelled) {
          setTickets(tks);
          setProperties(props);
          setCategories(cats);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('common.errorLoad'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadAll, t]);

  const onRefresh = () => {
    fetchTickets(true);
  };

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

  const searchedTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter((tk) => propertyId === 'all' || tk.propertyId === propertyId)
      .filter((tk) => {
        if (!q) return true;
        const prop = tk.propertyId ? propertyById.get(tk.propertyId) : undefined;
        return [
          tk.ticketNumber,
          tk.category,
          formatTicketCategory(tk.category, categories, t, code),
          tk.subcategory,
          tk.description,
          tk.assignedTo,
          prop?.propertyNameEn,
          prop?.propertyNameAr,
        ].some((v) => v?.toLowerCase().includes(q));
      });
  }, [tickets, search, propertyId, propertyById, categories, t, code]);

  const matchStatus = (tk: StaffTicket, f: Filter) => {
    if (f === 'open') return tk.status === 'Open';
    if (f === 'inProgress') return tk.status === 'InProgress' || tk.status === 'OnHold';
    if (f === 'resolved') return tk.status === 'Resolved' || tk.status === 'Closed';
    return true;
  };

  const filteredTickets = useMemo(
    () => searchedTickets.filter((tk) => matchStatus(tk, filter)),
    [searchedTickets, filter],
  );

  return (
    <Screen
      title={t('staff.tickets')}
      action={
        permissions.canAdd ? (
          <Button
            label={t('staff.newTicket')}
            icon={IconPlus}
            compact
            onPress={() => router.push('/staff/ticket/new')}
          />
        ) : undefined
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      onRetry={() => {
        fetchTickets(false);
      }}>
      <SearchFilterBar<Filter>
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setLimit(PAGE_STEP);
        }}
        placeholder={t('staff.searchTickets')}
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
        chips={[
          { value: 'all', label: t('staff.filterAll'), count: searchedTickets.length },
          { value: 'open', label: t('staff.filterOpen'), count: searchedTickets.filter((tk) => matchStatus(tk, 'open')).length },
          { value: 'inProgress', label: t('staff.filterProgress'), count: searchedTickets.filter((tk) => matchStatus(tk, 'inProgress')).length },
          { value: 'resolved', label: t('staff.filterResolved'), count: searchedTickets.filter((tk) => matchStatus(tk, 'resolved')).length },
        ]}
        chipValue={filter}
        onChipChange={(v) => {
          setFilter(v);
          setLimit(PAGE_STEP);
        }}
      />

      {filteredTickets.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <AppText tone="secondary">{t('staff.noTicketsFound')}</AppText>
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {filteredTickets.slice(0, limit).map((tk) => {
            const prop = tk.propertyId ? propertyById.get(tk.propertyId) : undefined;
            return (
              <Card
                key={tk.id}
                onPress={() => router.push(`/staff/ticket/${tk.id}` as any)}
                style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{tk.ticketNumber || tk.id.slice(0, 8).toUpperCase()}</AppText>
                  <View style={{ flexDirection: 'row', gap: space.xs }}>
                    <Pill
                      accent={
                        tk.priority === 'Emergency'
                          ? 'danger'
                          : tk.priority === 'High'
                          ? 'warning'
                          : 'primary'
                      }
                      label={translatePriority(t, tk.priority)}
                    />
                    <Pill
                      accent={
                        tk.status === 'Resolved' || tk.status === 'Closed'
                          ? 'success'
                          : tk.status === 'InProgress'
                          ? 'teal'
                          : 'warning'
                      }
                      label={translateTicketStatus(t, tk.status)}
                    />
                  </View>
                </View>
                <AppText numberOfLines={2} tone="secondary">
                  {tk.description}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                  <AppText variant="caption" tone="muted">
                    {[
                      formatTicketCategory(tk.category, categories, t, code),
                      prop ? byLang(code, prop.propertyNameEn, prop.propertyNameAr) : undefined,
                      tk.assignedTo,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </AppText>
                  <Onward />
                </View>
              </Card>
            );
          })}
          {filteredTickets.length > limit ? (
            <Button
              tone="outline"
              compact
              label={t('staff.showMore', { count: filteredTickets.length - limit })}
              onPress={() => setLimit((n) => n + PAGE_STEP)}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
