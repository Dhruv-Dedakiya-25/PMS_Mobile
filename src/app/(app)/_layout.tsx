import { IconAlertCircle, IconLogout } from '@tabler/icons-react-native';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { accessTo, homeFor } from '@/auth/page-access';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, IconTile } from '@/components/ui';
import { useSession } from '@/hooks/use-tenancy';
import { space, usePalette } from '@/theme/tokens';

/** Everything a signed-in user sees: the four tabs, and the pages they open. */
export default function AppLayout() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { notLinked, signOut } = useSession();
  const { role } = useAppSession();
  const pathname = usePathname();

  if (notLinked) {
    return (
      <Page
        title=""
        back={false}
        footer={<Button label={t('profile.signOut')} icon={IconLogout} tone="danger" onPress={() => void signOut()} />}>
        <View style={{ paddingVertical: space.xxxl }}>
          <Card style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.md }}>
            <IconTile icon={IconAlertCircle} accent="warning" size={56} />
            <AppText align="center">{t('auth.notLinked')}</AppText>
          </Card>
        </View>
      </Page>
    );
  }

  // Page guard: redirect to homeFor(role) when accessTo(pathname) is null
  const access = accessTo(pathname, role);
  if (access === null) {
    const target = homeFor(role);
    if (pathname !== target) {
      return <Redirect href={target as any} />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="done" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
