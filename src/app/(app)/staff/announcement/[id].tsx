import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SAMPLE_STAFF_NOTICES } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Pill } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function AnnouncementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const notice = SAMPLE_STAFF_NOTICES.find((n) => n.id === id) ?? SAMPLE_STAFF_NOTICES[0];

  return (
    <Page title={notice?.title || t('tabs.announcements')}>
      {notice && (
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pill accent="teal" label={notice.category} />
            <Pill accent="primary" label={t('staff.sampleDataBadge')} />
          </View>

          <AppText variant="bodyLarge" weight="bold">
            {notice.title}
          </AppText>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary">
              {notice.date}
            </AppText>
            <AppText variant="caption" tone="muted">
              {notice.target}
            </AppText>
          </View>

          <AppText style={{ lineHeight: 22 }}>{notice.body}</AppText>
        </Card>
      )}
    </Page>
  );
}
