import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getStaffLeases, type StaffLease } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { space } from '@/theme/tokens';

export default function LeaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;

  const [lease, setLease] = useState<StaffLease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!id) return;
    setLoading(true);

    getStaffLeases()
      .then((allLeases) => {
        const found = allLeases.find((l) => l.id === id);
        setLease(found ?? null);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t('common.errorLoad'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, t]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getStaffLeases()
      .then((allLeases) => {
        if (!cancelled) {
          const found = allLeases.find((l) => l.id === id);
          setLease(found ?? null);
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
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  return (
    <Page
      title={lease?.leaseNumber || t('staff.leaseDetails')}
      loading={loading}
      error={error}
      onRetry={() => {
        fetchData();
      }}>
      {lease && (
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="bodyLarge" weight="bold">
              {lease.leaseNumber}
            </AppText>
            <Pill
              accent={lease.status === 'Active' ? 'success' : 'primary'}
              label={lease.status}
            />
          </View>

          <View style={{ gap: space.xs }}>
            <AppText variant="caption" tone="secondary">
              {t('staff.rentAmount')}
            </AppText>
            <AppText variant="heading" weight="bold" tone="primary">
              {omr(lease.rentAmount, code)} / {lease.rentFrequency}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: space.xs }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.startDate')}
              </AppText>
              <AppText weight="semibold">{lease.startDate?.slice(0, 10) ?? '—'}</AppText>
            </View>
            <View style={{ gap: space.xs }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.endDate')}
              </AppText>
              <AppText weight="semibold">{lease.endDate?.slice(0, 10) ?? '—'}</AppText>
            </View>
          </View>
        </Card>
      )}
    </Page>
  );
}
