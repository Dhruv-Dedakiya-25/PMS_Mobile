import {
  IconBuilding,
  IconClipboardList,
  IconLayoutDashboard,
  IconPackage,
  IconReceipt,
  IconSpeakerphone,
  IconTool,
} from '@tabler/icons-react-native';
import { Redirect, usePathname } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSession } from '@/auth/use-app-session';
import { TabButton } from '@/components/tab-button';
import { useLanguage } from '@/i18n';
import { space, usePalette } from '@/theme/tokens';

export default function TabLayout() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const { isMaintenance, isPropertyManager, isSuperAdmin } = useAppSession();
  const pathname = usePathname();

  // If a staff user lands on root '/', redirect them immediately to their role's home
  if (isMaintenance && pathname === '/') {
    return <Redirect href="/staff/facility" />;
  }
  if ((isPropertyManager || isSuperAdmin) && pathname === '/') {
    return <Redirect href="/staff/dashboard" />;
  }

  const renderTabs = () => {
    if (isMaintenance) {
      return (
        <>
          <TabTrigger name="staff/facility" href="/staff/facility" asChild>
            <TabButton icon={IconLayoutDashboard} label={t('tabs.facility')} />
          </TabTrigger>
          <TabTrigger name="staff/tickets" href="/staff/tickets" asChild>
            <TabButton icon={IconTool} label={t('tabs.tickets')} />
          </TabTrigger>
          <TabTrigger name="staff/facilities" href="/staff/facilities" asChild>
            <TabButton icon={IconBuilding} label={t('tabs.facilities')} />
          </TabTrigger>
          <TabTrigger name="staff/announcements" href="/staff/announcements" asChild>
            <TabButton icon={IconSpeakerphone} label={t('tabs.announcements')} />
          </TabTrigger>
          <TabTrigger name="staff/inventory" href="/staff/inventory" asChild>
            <TabButton icon={IconPackage} label={t('tabs.inventory')} />
          </TabTrigger>
        </>
      );
    }

    if (isPropertyManager || isSuperAdmin) {
      return (
        <>
          <TabTrigger name="staff/dashboard" href="/staff/dashboard" asChild>
            <TabButton icon={IconLayoutDashboard} label={t('tabs.dashboard')} />
          </TabTrigger>
          <TabTrigger name="staff/properties" href="/staff/properties" asChild>
            <TabButton icon={IconBuilding} label={t('tabs.properties')} />
          </TabTrigger>
          <TabTrigger name="staff/finance" href="/staff/finance" asChild>
            <TabButton icon={IconReceipt} label={t('tabs.finance')} />
          </TabTrigger>
          <TabTrigger name="staff/operations" href="/staff/operations" asChild>
            <TabButton icon={IconClipboardList} label={t('tabs.operations')} />
          </TabTrigger>
        </>
      );
    }

    // Default: Tenant
    return (
      <>
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
      </>
    );
  };

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
        {renderTabs()}
      </TabList>
    </Tabs>
  );
}
