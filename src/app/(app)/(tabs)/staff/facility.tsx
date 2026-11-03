import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconPlus,
  IconTool,
} from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import {
  getStaffTickets,
  SAMPLE_WORK_ORDERS,
  type SampleWorkOrder,
  type StaffTicket,
} from '@/api/staff';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Avatar, Button, Card, IconTile, Onward, Pill } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function FacilityDashboard() {
  const { t } = useTranslation();
  const { user, permissionsFor } = useAppSession();
  const ticketPermissions = permissionsFor('staff/tickets');

  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [workOrders] = useState<SampleWorkOrder[]>(SAMPLE_WORK_ORDERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback((isRefresh = false) => {
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

  const onRefresh = () => {
    fetchTickets(true);
  };

  const openTickets = tickets.filter((tk) => tk.status === 'Open');
  const urgentTickets = tickets.filter(
    (tk) => tk.priority === 'Emergency' || tk.priority === 'High',
  );
  const inProgressTickets = tickets.filter((tk) => tk.status === 'InProgress');
  const resolvedTickets = tickets.filter(
    (tk) => tk.status === 'Resolved' || tk.status === 'Closed',
  );

  const staffName = user?.displayName || user?.username || 'Maintenance';

  return (
    <Screen
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      onRetry={() => {
        fetchTickets(false);
      }}>
      {/* Header Profile Entry - same place as tenant Home */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('profile.title')}>
          <Avatar name={staffName} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="small" tone="secondary">
            {t('staff.facilityDashboard')}
          </AppText>
          <AppText variant="bodyLarge" weight="bold" numberOfLines={1}>
            {staffName}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" weight="bold">
            {t('staff.facilityDashboard')}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {t('staff.priorityQueue')}
          </AppText>
        </View>
        {ticketPermissions.canAdd ? (
          <Button
            label={t('staff.newTicket')}
            icon={IconPlus}
            compact
            onPress={() => router.push('/staff/ticket/new')}
          />
        ) : null}
      </View>

      {/* 4 Metrics cards: Open, Urgent, In Progress, Resolved */}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary">
              {t('staff.openTickets')}
            </AppText>
            <IconTile icon={IconClock} accent="teal" size={32} />
          </View>
          <AppText variant="heading" weight="bold">
            {openTickets.length}
          </AppText>
        </Card>
        <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary">
              {t('staff.urgentTickets')}
            </AppText>
            <IconTile icon={IconAlertTriangle} accent="danger" size={32} />
          </View>
          <AppText variant="heading" weight="bold" tone="danger">
            {urgentTickets.length}
          </AppText>
        </Card>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary">
              {t('staff.inProgress')}
            </AppText>
            <IconTile icon={IconTool} accent="warning" size={32} />
          </View>
          <AppText variant="heading" weight="bold">
            {inProgressTickets.length}
          </AppText>
        </Card>
        <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary">
              {t('staff.resolved')}
            </AppText>
            <IconTile icon={IconCheck} accent="success" size={32} />
          </View>
          <AppText variant="heading" weight="bold">
            {resolvedTickets.length}
          </AppText>
        </Card>
      </View>

      {/* Urgent Priority Queue */}
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="bodyLarge" weight="bold">
            {t('staff.priorityQueue')}
          </AppText>
          <Pressable onPress={() => router.push('/staff/tickets')}>
            <AppText variant="caption" weight="semibold" tone="primary">
              {t('common.viewAll')}
            </AppText>
          </Pressable>
        </View>

        {urgentTickets.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
            <AppText tone="secondary">{t('staff.noTicketsFound')}</AppText>
          </Card>
        ) : (
          urgentTickets.slice(0, 4).map((tk) => (
            <Card
              key={tk.id}
              onPress={() => router.push(`/staff/ticket/${tk.id}` as any)}
              style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight="bold">{tk.ticketNumber || tk.id.slice(0, 8).toUpperCase()}</AppText>
                <Pill
                  accent={tk.priority === 'Emergency' ? 'danger' : 'warning'}
                  label={tk.priority}
                />
              </View>
              <AppText numberOfLines={2} tone="secondary">
                {tk.description}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                <AppText variant="caption" tone="muted">
                  {tk.category} • {tk.status}
                </AppText>
                <Onward />
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Work Orders (Sample) */}
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <AppText variant="bodyLarge" weight="bold">
              {t('staff.workOrders')}
            </AppText>
            <Pill accent="primary" label={t('staff.sampleDataBadge')} />
          </View>
        </View>
        <AppText variant="caption" tone="muted">
          {t('staff.sampleDataNote')}
        </AppText>

        {workOrders.map((wo) => (
          <Card key={wo.id} style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText weight="bold">{wo.ticketNumber} • {wo.assetName}</AppText>
              <Pill
                accent={wo.status === 'Completed' ? 'success' : wo.status === 'InProgress' ? 'teal' : 'warning'}
                label={wo.status}
              />
            </View>
            <AppText variant="caption" tone="secondary">
              {t('staff.assignedTo')}: {wo.technicianName}
            </AppText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
