import { IconBox, IconCalendarEvent, IconKey, IconTool, IconUsers, type Icon } from '@tabler/icons-react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Card, IconTile } from '@/components/ui';
import { daysUntil } from '@/lib/format';
import { useMockState } from '@/mock/store';
import { space } from '@/theme/tokens';

/** Everything a tenant asks the building for: repairs, visitors, bookings, moving and access. */
export default function Requests() {
  const { t } = useTranslation();
  const state = useMockState();
  const open = state.requests.filter((r) => r.stage !== 'completed').length;
  const expected = state.visitors.filter((v) => v.status === 'expected').length;
  const upcoming = state.bookings.filter((b) => daysUntil(b.date) >= 0).length;

  const tiles: { icon: Icon; label: string; detail: string; href: Href }[] = [
    { icon: IconTool, label: t('maint.title'), detail: t('requests.openCount', { count: open }), href: '/requests/maintenance' },
    { icon: IconUsers, label: t('visit.title'), detail: t('requests.expectedCount', { count: expected }), href: '/requests/visitors' },
    { icon: IconCalendarEvent, label: t('fac.title'), detail: t('requests.bookingCount', { count: upcoming }), href: '/requests/facilities' },
    { icon: IconBox, label: t('move.title'), detail: t('requests.moveDetail'), href: '/requests/move' },
    { icon: IconKey, label: t('access.title'), detail: t('requests.accessDetail'), href: '/requests/access' },
  ];

  return (
    <Screen title={t('tabs.requests')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {tiles.map((tile) => (
          <Card key={tile.label} onPress={() => router.push(tile.href)} style={{ width: '47%', alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
            <IconTile icon={tile.icon} size={50} />
            <AppText variant="small" weight="semibold" align="center">
              {tile.label}
            </AppText>
            <AppText variant="caption" tone="muted" align="center">
              {tile.detail}
            </AppText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
