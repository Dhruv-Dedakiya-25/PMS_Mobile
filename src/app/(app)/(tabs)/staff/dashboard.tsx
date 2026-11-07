import {
  IconAlertTriangle,
  IconBuilding,
  IconClock,
  IconFileText,
  IconPlus,
  IconReceipt,
} from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { getStaffDashboardSummary, type StaffDashboardSummary } from '@/api/staff';
import { accountLabel, useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Avatar, Button, Card, IconTile, Onward, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { space } from '@/theme/tokens';

export default function StaffDashboard() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAppSession();
  const code = language.code;

  const [summary, setSummary] = useState<StaffDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    getStaffDashboardSummary()
      .then((data) => {
        setSummary(data);
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
    getStaffDashboardSummary()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
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
    fetchSummary(true);
  };

  const staffName = user?.displayName || user?.username || 'Property Manager';

  return (
    <Screen
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      onRetry={() => {
        fetchSummary(false);
      }}>
      {/* Header Profile Entry - same place as tenant Home */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('profile.title')}>
          <Avatar name={staffName} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="small" tone="secondary">
            {accountLabel(user, t, language.code) || null}
          </AppText>
          <AppText variant="bodyLarge" weight="bold" numberOfLines={1}>
            {staffName}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" weight="bold">
            {t('staff.portfolioDashboard')}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {summary?.companyName ?? ''}
          </AppText>
        </View>
        <Button
          label={t('staff.newTicket')}
          icon={IconPlus}
          compact
          onPress={() => router.push('/staff/ticket/new')}
        />
      </View>

      {/* Units & Occupancy */}
      <View style={{ gap: space.xs }}>
        <AppText variant="bodyLarge" weight="bold">
          {t('staff.occupancyRate')} ({Math.round(summary?.occupancyRate ?? 0)}%)
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.totalUnits')}
              </AppText>
              <IconTile icon={IconBuilding} accent="teal" size={32} />
            </View>
            <AppText variant="heading" weight="bold">
              {summary?.totalUnits ?? 0}
            </AppText>
          </Card>
          <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.occupiedUnits')}
              </AppText>
              <IconTile icon={IconBuilding} accent="success" size={32} />
            </View>
            <AppText variant="heading" weight="bold" tone="success">
              {summary?.occupiedUnits ?? 0}
            </AppText>
          </Card>
        </View>
      </View>

      {/* Financials & Collections */}
      <View style={{ gap: space.xs, marginTop: space.xs }}>
        <AppText variant="bodyLarge" weight="bold">
          {t('staff.finance')}
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.billedThisMonth')}
              </AppText>
              <IconTile icon={IconFileText} accent="teal" size={32} />
            </View>
            <AppText variant="bodyLarge" weight="bold">
              {omr(summary?.billedThisMonth ?? 0, code)}
            </AppText>
          </Card>
          <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.collectedThisMonth')}
              </AppText>
              <IconTile icon={IconReceipt} accent="success" size={32} />
            </View>
            <AppText variant="bodyLarge" weight="bold" tone="success">
              {omr(summary?.collectedThisMonth ?? 0, code)}
            </AppText>
          </Card>
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.outstanding')}
              </AppText>
              <IconTile icon={IconClock} accent="warning" size={32} />
            </View>
            <AppText variant="bodyLarge" weight="bold">
              {omr(summary?.outstanding ?? 0, code)}
            </AppText>
          </Card>
          <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.overdue')}
              </AppText>
              <IconTile icon={IconAlertTriangle} accent="danger" size={32} />
            </View>
            <AppText variant="bodyLarge" weight="bold" tone="danger">
              {omr(summary?.overdue ?? 0, code)}
            </AppText>
          </Card>
        </View>
      </View>

      {/* Leases Overview */}
      <View style={{ gap: space.xs, marginTop: space.xs }}>
        <AppText variant="bodyLarge" weight="bold">
          {t('staff.activeLeases')}
        </AppText>
        <Card style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText tone="secondary">{t('staff.activeLeases')}</AppText>
            <AppText weight="bold">{summary?.activeLeases ?? 0}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText tone="secondary">{t('staff.monthlyRentRoll')}</AppText>
            <AppText weight="bold">{omr(summary?.monthlyRentRoll ?? 0, code)}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText tone="secondary">{t('staff.expiringIn30Days')}</AppText>
            <AppText weight="bold" tone="warning">{summary?.expiringIn30Days ?? 0}</AppText>
          </View>
        </Card>
      </View>

      {/* Priority Requests Queue */}
      <View style={{ gap: space.sm, marginTop: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="bodyLarge" weight="bold">
            {t('staff.priorityQueue')} ({summary?.openServiceRequests ?? 0})
          </AppText>
          <Pressable onPress={() => router.push('/staff/operations')}>
            <AppText variant="caption" weight="semibold" tone="primary">
              {t('common.viewAll')}
            </AppText>
          </Pressable>
        </View>

        {(summary?.priorityRequests?.length ?? 0) === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
            <AppText tone="secondary">{t('staff.noTicketsFound')}</AppText>
          </Card>
        ) : (
          summary?.priorityRequests.slice(0, 4).map((item) => (
            <Card
              key={item.id}
              onPress={() => router.push(`/staff/ticket/${item.id}` as any)}
              style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight="bold">{item.ticketNumber}</AppText>
                <Pill
                  accent={item.priority === 'Emergency' ? 'danger' : 'warning'}
                  label={item.priority}
                />
              </View>
              <AppText numberOfLines={2} tone="secondary">
                {item.description}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                <AppText variant="caption" tone="muted">
                  {item.category} {item.unitCode ? `• ${item.unitCode}` : ''}
                </AppText>
                <Onward />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
