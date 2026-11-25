import { IconPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffAnnouncements,
  getStaffProperties,
  getStaffServiceCategories,
  getStaffTickets,
  type StaffAnnouncementItem,
  type StaffProperty,
  type StaffTicket,
} from '@/api/staff';
import type { ServiceCategoryOptionDto } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { StaffApprovals } from '@/components/staff-approvals';
import { StaffNoticeCard } from '@/components/staff-notice-card';
import { StaffWorkOrders } from '@/components/staff-work-orders';
import { Button, Card, Onward, Pill, SearchFilterBar, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { DEFAULT_SERVICE_CATEGORIES, formatTicketCategory } from '@/lib/service-categories';
import { byLang, PAGE_STEP, translatePriority, translateTicketStatus } from '@/lib/staff-helpers';
import { space } from '@/theme/tokens';

type Section = 'tickets' | 'workOrders' | 'approvals' | 'notices';
type TicketFilter = 'all' | 'open' | 'inProgress' | 'resolved';

export default function StaffOperations() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const [section, setSection] = useState<Section>('tickets');

  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOptionDto[]>(DEFAULT_SERVICE_CATEGORIES);
  const [reloadKey, setReloadKey] = useState(0);
  const { accessTo, isDemo } = useAppSession();
  const canSeeNotices = accessTo('/staff/announcements') !== null;
  const [notices, setNotices] = useState<StaffAnnouncementItem[]>([]);
  const [noticesError, setNoticesError] = useState<string | null>(null);

  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketPropertyId, setTicketPropertyId] = useState('all');
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all');
  const [ticketLimit, setTicketLimit] = useState(PAGE_STEP);

  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticePropertyId, setNoticePropertyId] = useState('all');
  const [noticeCategory, setNoticeCategory] = useState('all');

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

  const fetchData = useCallback(
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

  // Notices load on their own, so a role without them still sees its tickets.
  const loadNotices = useCallback(() => {
    if (!canSeeNotices) return;
    getStaffAnnouncements()
      .then((items) => {
        setNotices(items);
        setNoticesError(null);
      })
      .catch((e) => setNoticesError(e instanceof Error ? e.message : t('common.errorLoad')));
  }, [canSeeNotices, t]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const onRefresh = () => {
    fetchData(true);
    loadNotices();
    setReloadKey((k) => k + 1);
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

  const matchStatus = (tk: StaffTicket, f: TicketFilter) => {
    if (f === 'open') return tk.status === 'Open';
    if (f === 'inProgress') return tk.status === 'InProgress' || tk.status === 'OnHold';
    if (f === 'resolved') return tk.status === 'Resolved' || tk.status === 'Closed';
    return true;
  };

  const searchedTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    return tickets
      .filter((tk) => ticketPropertyId === 'all' || tk.propertyId === ticketPropertyId)
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
  }, [tickets, ticketSearch, ticketPropertyId, propertyById, categories, t, code]);

  const visibleTickets = useMemo(
    () => searchedTickets.filter((tk) => matchStatus(tk, ticketFilter)),
    [searchedTickets, ticketFilter],
  );

  const searchedNotices = useMemo(() => {
    const q = noticeSearch.trim().toLowerCase();
    const chosenProp = noticePropertyId !== 'all' ? propertyById.get(noticePropertyId) : undefined;
    return notices
      .filter((n) => {
        if (noticePropertyId === 'all') return true;
        return n.propertyId === noticePropertyId || (chosenProp && n.target === chosenProp.propertyNameEn);
      })
      .filter((n) => !q || [n.titleEn, n.titleAr, n.bodyEn, n.bodyAr, n.category, n.target].some((v) => v?.toLowerCase().includes(q)));
  }, [notices, noticeSearch, noticePropertyId, propertyById]);

  const noticeCategories = useMemo(
    () => Array.from(new Set(searchedNotices.map((n) => n.category || t('staff.general')))),
    [searchedNotices, t],
  );

  const visibleNotices = useMemo(
    () =>
      noticeCategory === 'all'
        ? searchedNotices
        : searchedNotices.filter((n) => (n.category || t('staff.general')) === noticeCategory),
    [searchedNotices, noticeCategory, t],
  );

  return (
    <Screen
      title={t('tabs.operations')}
      subtitle={t('staff.operations')}
      action={
        <Button
          label={t('staff.newTicket')}
          icon={IconPlus}
          compact
          onPress={() => router.push('/staff/ticket/new')}
        />
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      onRetry={() => {
        fetchData(false);
      }}>
      <Segmented<Section>
        value={section}
        onChange={setSection}
        options={[
          { value: 'tickets', label: t('tabs.tickets') },
          { value: 'workOrders', label: t('staff.workOrders') },
          { value: 'approvals', label: t('staff.approvals') },
          ...(canSeeNotices ? [{ value: 'notices' as const, label: t('staff.noticesTab') }] : []),
        ]}
      />

      {section === 'tickets' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar<TicketFilter>
            search={ticketSearch}
            onSearchChange={(v) => {
              setTicketSearch(v);
              setTicketLimit(PAGE_STEP);
            }}
            placeholder={t('staff.searchTickets')}
            selects={
              properties.length > 1
                ? [
                    {
                      key: 'property',
                      label: t('staff.property'),
                      value: ticketPropertyId,
                      onChange: (v) => {
                        setTicketPropertyId(v);
                        setTicketLimit(PAGE_STEP);
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
            chipValue={ticketFilter}
            onChipChange={(v) => {
              setTicketFilter(v);
              setTicketLimit(PAGE_STEP);
            }}
          />

          <View style={{ gap: space.sm }}>
            {visibleTickets.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noTicketsFound')}</AppText>
              </Card>
            ) : (
              <>
                {visibleTickets.slice(0, ticketLimit).map((tk) => {
                  const prop = tk.propertyId ? propertyById.get(tk.propertyId) : undefined;
                  return (
                    <Card
                      key={tk.id}
                      onPress={() => router.push(`/staff/ticket/${tk.id}` as any)}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <AppText weight="bold">{tk.ticketNumber || tk.id.slice(0, 8).toUpperCase()}</AppText>
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
                      <AppText numberOfLines={2} tone="secondary">
                        {tk.description}
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                        <AppText variant="caption" tone="muted">
                          {[
                            formatTicketCategory(tk.category, categories, t, code),
                            translatePriority(t, tk.priority),
                            prop ? byLang(code, prop.propertyNameEn, prop.propertyNameAr) : undefined,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </AppText>
                        <Onward />
                      </View>
                    </Card>
                  );
                })}
                {visibleTickets.length > ticketLimit ? (
                  <Button
                    tone="outline"
                    compact
                    label={t('staff.showMore', { count: visibleTickets.length - ticketLimit })}
                    onPress={() => setTicketLimit((n) => n + PAGE_STEP)}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {section === 'workOrders' && (
        <View style={{ gap: space.sm }}>
          <StaffWorkOrders reloadKey={reloadKey} />
        </View>
      )}

      {section === 'approvals' && <StaffApprovals />}

      {section === 'notices' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar
            search={noticeSearch}
            onSearchChange={setNoticeSearch}
            placeholder={t('staff.searchAnnouncements')}
            selects={
              properties.length > 1
                ? [
                    {
                      key: 'property',
                      label: t('staff.property'),
                      value: noticePropertyId,
                      onChange: setNoticePropertyId,
                      options: propertyOptions,
                    },
                  ]
                : undefined
            }
            chips={[
              { value: 'all', label: t('staff.filterAll'), count: searchedNotices.length },
              ...noticeCategories.map((cat) => ({
                value: cat,
                label: cat,
                count: searchedNotices.filter((n) => (n.category || t('staff.general')) === cat).length,
              })),
            ]}
            chipValue={noticeCategory}
            onChipChange={setNoticeCategory}
          />

          <View style={{ gap: space.sm }}>
            {noticesError || visibleNotices.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone={noticesError ? 'danger' : 'secondary'}>{noticesError ?? t('staff.noAnnouncements')}</AppText>
              </Card>
            ) : (
              visibleNotices.map((n) => <StaffNoticeCard key={n.id} notice={n} />)
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
