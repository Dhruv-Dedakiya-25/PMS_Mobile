import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { StaffAnnouncementItem } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Card, Onward, Pill } from '@/components/ui';
import { space } from '@/theme/tokens';

/** One published notice in a staff list; opens its detail page. */
export function StaffNoticeCard({ notice: n }: { notice: StaffAnnouncementItem }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const title = (isArabic && n.titleAr) ? n.titleAr : (n.titleEn || n.title || t('tabs.announcements'));
  const body = (isArabic && n.bodyAr) ? n.bodyAr : (n.bodyEn || n.body || '');

  return (
    <Card onPress={() => router.push(`/staff/announcement/${n.id}` as any)} style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText weight="bold">{title}</AppText>
        <Pill accent="teal" label={n.category || t('staff.general')} />
      </View>
      <AppText numberOfLines={2} tone="secondary">
        {body}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
        <AppText variant="caption" tone="muted">
          {n.date} • {n.target || t('staff.buildingWide')}
        </AppText>
        <Onward />
      </View>
    </Card>
  );
}
