import { IconLanguage, IconLogout, IconMoon, IconRobot } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Avatar, Button, Card, Details, ListRow, Pill, Segmented } from '@/components/ui';
import { setThemeChoice, useThemeChoice, type ThemeChoice } from '@/hooks/use-color-scheme';
import { useProfile, useSession } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { ltr } from '@/lib/format';
import { space, usePalette } from '@/theme/tokens';

/** Who is signed in, the app's language and look, and signing out. */
export default function Profile() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const theme = useThemeChoice();
  const { signOut } = useSession();
  const { tenant, property, loading, refreshing, error, refresh } = useProfile();

  return (
    <Page
      title={t('profile.title')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      footer={<Button label={t('profile.signOut')} icon={IconLogout} tone="danger" onPress={() => void signOut()} />}>
      <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.md }}>
        <Avatar name={tenant.name} size={80} />
        <AppText variant="title" weight="bold" align="center">
          {tenant.name}
        </AppText>
        <AppText tone="secondary" align="center">
          {t('home.unitLine', { building: property.building, floor: property.floor, unit: property.unitNo })}
        </AppText>
      </View>
      <Details
        rows={[
          [t('property.tenantCode'), tenant.tenantCode],
          [t('auth.mobile'), ltr(tenant.mobile)],
          [t('auth.email'), tenant.email],
        ]}
      />
      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        <ListRow first icon={IconLanguage} label={t('profile.language')} detail={language.nativeName} onPress={() => router.push('/language')} />
        <ListRow icon={IconRobot} accent="violet" label={t('profile.assistant')} detail={t('profile.assistantDetail')} right={<Pill label={t('profile.comingSoon')} accent="violet" />} />
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <IconMoon size={20} color={palette.textMuted} />
          <AppText weight="medium">{t('profile.appearance')}</AppText>
        </View>
        <Segmented<ThemeChoice>
          value={theme}
          onChange={setThemeChoice}
          options={[
            { value: 'system', label: t('profile.themeSystem') },
            { value: 'light', label: t('profile.themeLight') },
            { value: 'dark', label: t('profile.themeDark') },
          ]}
        />
      </Card>
    </Page>
  );
}
