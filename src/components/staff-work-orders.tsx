import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getStaffWorkOrders, type StaffWorkOrder } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Card, Onward, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { space, type Accent } from '@/theme/tokens';

const statusAccent: Record<StaffWorkOrder['status'], Accent> = {
  Pending: 'warning', Scheduled: 'primary', InProgress: 'teal', Completed: 'success', Cancelled: 'danger',
};

/**
 * The company's work orders, newest first, from the WorkOrder API. Each opens its
 * ticket. Loads on its own, so a role without work orders still sees the rest of the
 * screen; change reloadKey to load again after a pull to refresh.
 */
export function StaffWorkOrders({ reloadKey = 0 }: { reloadKey?: number }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [items, setItems] = useState<StaffWorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStaffWorkOrders()
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.errorLoad'));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, t]);

  if (error || items.length === 0) {
    return (
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <AppText tone={error ? 'danger' : 'secondary'}>{error ?? t('staff.noWorkOrders')}</AppText>
      </Card>
    );
  }

  return (
    <>
      {items.map((wo) => (
        <Card key={wo.id} onPress={() => router.push(`/staff/ticket/${wo.serviceRequestId}` as any)} style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
            <AppText weight="bold" style={{ flexShrink: 1 }}>
              {wo.workOrderNumber} • {wo.ticketNumber}
            </AppText>
            <Pill accent={statusAccent[wo.status] ?? 'warning'} label={t(`staff.woStatus.${wo.status}`)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary" style={{ flexShrink: 1 }}>
              {t('staff.assignedTo')}: {wo.technicianName || wo.contractorName || t('staff.unassigned')}
              {wo.cost != null ? ` • ${omr(wo.cost, language.code)}` : ''}
            </AppText>
            <Onward />
          </View>
        </Card>
      ))}
    </>
  );
}
