import { IconPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffAnnouncements,
  getStaffTickets,
  type StaffAnnouncementItem,
  type StaffTicket,
} from '@/api/staff';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Onward, Pill, Segmented } from '@/components/ui';
import { StaffApprovals } from '@/components/staff-approvals';
import { StaffNoticeCard } from '@/components/staff-notice-card';
import { StaffWorkOrders } from '@/components/staff-work-orders';
import { space } from '@/theme/tokens';

type Section = 'tickets' | 'workOrders' | 'approvals' | 'notices';

export default function StaffOperations() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('tickets');

  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const { accessTo } = useAppSession();
  const canSeeNotices = accessTo('/staff/announcements') !== null;
  const [notices, setNotices] = useState<StaffAnnouncementItem[]>([]);
  const [noticesError, setNoticesError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    getStaffTickets()
      .then((data) => {
        setTickets(data);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t('common.errorLoad'));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    getStaffTickets()
      .then((data) => {
        if (!cancelled) {
          setTickets(data);
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
  }, [t]);

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
        <View style={{ gap: space.sm }}>
          {tickets.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noTicketsFound')}</AppText>
            </Card>
          ) : (
            tickets.map((tk) => (
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
                    label={tk.status}
                  />
                </View>
                <AppText numberOfLines={2} tone="secondary">
                  {tk.description}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                  <AppText variant="caption" tone="muted">
                    {tk.category} • {tk.priority}
                  </AppText>
                  <Onward />
                </View>
              </Card>
            ))
          )}
        </View>
      )}

      {section === 'workOrders' && (
        <View style={{ gap: space.sm }}>
          <StaffWorkOrders reloadKey={reloadKey} />
        </View>
      )}

      {section === 'approvals' && <StaffApprovals />}

      {section === 'notices' && (
        <View style={{ gap: space.sm }}>
          {noticesError || notices.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone={noticesError ? 'danger' : 'secondary'}>{noticesError ?? t('staff.noAnnouncements')}</AppText>
            </Card>
          ) : (
            notices.map((n) => <StaffNoticeCard key={n.id} notice={n} />)
          )}
        </View>
      )}
    </Screen>
  );
}
