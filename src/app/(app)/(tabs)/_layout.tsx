import { IconBuilding, IconLayoutDashboard, IconSpeakerphone, IconTool } from '@tabler/icons-react-native';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabButton } from '@/components/tab-button';
import { useLanguage } from '@/i18n';
import { space, usePalette } from '@/theme/tokens';

/** The design's four main buttons along the bottom: Dashboard, My Property, Requests, Announcements. */
export default function TabLayout() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          direction: isRTL ? 'rtl' : 'ltr',
          backgroundColor: palette.card,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          paddingHorizontal: space.xs,
          paddingBottom: Math.max(insets.bottom, space.sm),
          shadowColor: palette.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        }}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon={IconLayoutDashboard} label={t('tabs.dashboard')} />
        </TabTrigger>
        <TabTrigger name="property" href="/property" asChild>
          <TabButton icon={IconBuilding} label={t('tabs.property')} />
        </TabTrigger>
        <TabTrigger name="requests" href="/requests" asChild>
          <TabButton icon={IconTool} label={t('tabs.requests')} />
        </TabTrigger>
        <TabTrigger name="announcements" href="/announcements" asChild>
          <TabButton icon={IconSpeakerphone} label={t('tabs.announcements')} />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
