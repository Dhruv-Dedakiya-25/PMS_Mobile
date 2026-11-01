import { IconCircleCheck } from '@tabler/icons-react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/ui';
import { space, usePalette } from '@/theme/tokens';

type Kind = 'maintenance' | 'renewal' | 'moveOut' | 'booking' | 'payment' | 'utility';

// Where each finished task's second button leads: to the list the new record joined.
const onward: Record<Kind, Href> = {
  maintenance: '/requests/maintenance',
  renewal: '/lease',
  moveOut: '/requests/move',
  booking: '/requests/facilities',
  payment: '/payments/history',
  utility: '/utilities',
};

/** The tick after something is sent or paid, with its reference and the way on. */
export default function Done() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { kind, ref } = useLocalSearchParams<{ kind: Kind; ref?: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space.lg), paddingHorizontal: space.xl }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: palette.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <IconCircleCheck size={60} color={palette.success} strokeWidth={1.5} />
        </View>
        <AppText variant="title" weight="bold" align="center">
          {t(`done.${kind}.title`)}
        </AppText>
        <AppText tone="secondary" align="center">
          {t(`done.${kind}.body`, { ref })}
        </AppText>
        {ref ? (
          <View style={{ backgroundColor: palette.surfaceStrong, borderRadius: 8, paddingHorizontal: space.md, paddingVertical: space.xs }}>
            <AppText variant="small" weight="semibold">
              {ref}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ gap: space.sm }}>
        <Button label={t(`done.${kind}.onward`)} onPress={() => router.replace(onward[kind])} />
        <Button label={t('done.home')} tone="ghost" onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}
