import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BuildingScene, GreenViewMark } from '@/components/art';
import { Button } from '@/components/ui';
import { brand } from '@/config';
import { radius, space, usePalette } from '@/theme/tokens';

/** The first screen: the residence under its own name, and the way in. */
export default function Welcome() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#E3F0FB' }}>
      <BuildingScene sky={190} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ paddingTop: insets.top + 56, alignItems: 'center', gap: 6, paddingHorizontal: space.xl }}>
        <GreenViewMark size={78} />
        {/* The sky behind the title is light in either theme, so the title keeps its own navy. */}
        <AppText variant="display" weight="bold" align="center" style={{ color: '#173C78', marginTop: space.sm }}>
          {brand.name}
        </AppText>
        <AppText variant="title" weight="semibold" align="center" style={{ color: '#173C78', marginTop: -6 }}>
          {brand.subtitle}
        </AppText>
        <AppText variant="bodyLarge" align="center" style={{ color: '#2A4C7F', marginTop: space.md }}>
          {t('auth.tagline')}
        </AppText>
      </View>
      <View style={{ flex: 1 }} />
      <View
        style={{
          marginHorizontal: space.xl,
          marginBottom: insets.bottom + space.xl,
          padding: space.xl,
          gap: space.md,
          borderRadius: radius.xl,
          backgroundColor: palette.card,
          shadowColor: palette.shadow,
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}>
        <Button label={t('auth.signIn')} onPress={() => router.push('/sign-in')} />
        <Button label={t('auth.createAccount')} tone="outline" onPress={() => router.push('/create-account')} />
      </View>
    </View>
  );
}
