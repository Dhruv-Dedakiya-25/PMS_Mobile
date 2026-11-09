import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getStaffAnnouncements, type StaffAnnouncementItem } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { StaffNoticeCard } from '@/components/staff-notice-card';
import { Button, Card, Pill } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function StaffAnnouncements() {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<StaffAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getStaffAnnouncements()
      .then((items) => {
        if (!cancelled) {
          setNotices(items);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t('common.errorLoad'));
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
  }, [t, retryCount]);

  const handleRetry = () => {
    setLoading(true);
    setLoadError(null);
    setRetryCount((c) => c + 1);
  };

  const hasSample = notices.some((n) => n.isSample);

  return (
    <Screen
      title={t('tabs.announcements')}
      subtitle={t('staff.announcements')}>
      {loadError ? (
        <Card style={{ gap: space.md, alignItems: 'center', paddingVertical: space.xl }}>
          <IconAlertTriangle size={36} color="#E0413F" />
          <AppText weight="medium" tone="danger" style={{ textAlign: 'center' }}>
            {loadError}
          </AppText>
          <Button
            label={t('common.retry')}
            icon={IconRefresh}
            tone="outline"
            onPress={handleRetry}
          />
        </Card>
      ) : !loading && notices.length === 0 ? (
        <Card style={{ gap: space.sm, alignItems: 'center', paddingVertical: space.xl }}>
          <AppText tone="secondary">{t('staff.noAnnouncements')}</AppText>
        </Card>
      ) : (
        <>
          {hasSample ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Pill accent="primary" label={t('staff.sampleDataBadge')} />
              <AppText variant="caption" tone="muted">
                {t('staff.sampleDataNote')}
              </AppText>
            </View>
          ) : null}

          <View style={{ gap: space.sm }}>
            {notices.map((n) => (
              <StaffNoticeCard key={n.id} notice={n} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
