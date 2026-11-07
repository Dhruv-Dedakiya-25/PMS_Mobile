import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getStaffAnnouncement, type StaffAnnouncementItem } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Pill } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function AnnouncementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');

  const [notice, setNotice] = useState<StaffAnnouncementItem | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    getStaffAnnouncement(id)
      .then((res) => {
        if (!cancelled) {
          if (res) {
            setNotice(res);
          } else {
            setLoadError(t('common.errorLoad'));
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t('common.errorLoad'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, t, retryCount]);

  const handleRetry = () => {
    setLoadError(null);
    setRetryCount((c) => c + 1);
  };

  const title = notice ? ((isArabic && notice.titleAr) ? notice.titleAr : (notice.titleEn || notice.title || t('tabs.announcements'))) : t('tabs.announcements');
  const body = notice ? ((isArabic && notice.bodyAr) ? notice.bodyAr : (notice.bodyEn || notice.body || '')) : '';
  const category = notice ? (notice.category || t('staff.general')) : '';
  const target = notice ? (notice.target || t('staff.buildingWide')) : '';

  return (
    <Page title={title}>
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
      ) : notice ? (
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pill accent="teal" label={category} />
            {notice.isSample ? <Pill accent="primary" label={t('staff.sampleDataBadge')} /> : null}
          </View>

          <AppText variant="bodyLarge" weight="bold">
            {title}
          </AppText>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary">
              {notice.date}
            </AppText>
            <AppText variant="caption" tone="muted">
              {target}
            </AppText>
          </View>

          <AppText style={{ lineHeight: 22 }}>{body}</AppText>
        </Card>
      ) : null}
    </Page>
  );
}
