import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SAMPLE_STAFF_NOTICES, type SampleStaffNotice } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Card, Onward, Pill } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function StaffAnnouncements() {
  const { t } = useTranslation();
  const [notices] = useState<SampleStaffNotice[]>(SAMPLE_STAFF_NOTICES);

  return (
    <Screen
      title={t('tabs.announcements')}
      subtitle={t('staff.announcements')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <Pill accent="primary" label={t('staff.sampleDataBadge')} />
        <AppText variant="caption" tone="muted">
          {t('staff.sampleDataNote')}
        </AppText>
      </View>

      <View style={{ gap: space.sm }}>
        {notices.map((n) => (
          <Card
            key={n.id}
            onPress={() => router.push(`/staff/announcement/${n.id}` as any)}
            style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText weight="bold">{n.title}</AppText>
              <Pill accent="teal" label={n.category} />
            </View>
            <AppText numberOfLines={2} tone="secondary">
              {n.body}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
              <AppText variant="caption" tone="muted">
                {n.date} • {n.target}
              </AppText>
              <Onward />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
