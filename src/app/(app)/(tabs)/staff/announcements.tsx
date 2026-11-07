import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getStaffAnnouncements, type StaffAnnouncementItem } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Onward, Pill } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function StaffAnnouncements() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
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
            {notices.map((n) => {
              const title = (isArabic && n.titleAr) ? n.titleAr : (n.titleEn || n.title || t('tabs.announcements'));
              const body = (isArabic && n.bodyAr) ? n.bodyAr : (n.bodyEn || n.body || '');
              const category = n.category || t('staff.general');
              const target = n.target || t('staff.buildingWide');

              return (
                <Card
                  key={n.id}
                  onPress={() => router.push(`/staff/announcement/${n.id}` as any)}
                  style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText weight="bold">{title}</AppText>
                    <Pill accent="teal" label={category} />
                  </View>
                  <AppText numberOfLines={2} tone="secondary">
                    {body}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                    <AppText variant="caption" tone="muted">
                      {n.date} • {target}
                    </AppText>
                    <Onward />
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}
