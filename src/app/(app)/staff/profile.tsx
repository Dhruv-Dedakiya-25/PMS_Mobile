import { IconLanguage, IconLogout, IconMoon } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Avatar, Button, Card, Details, ListRow, Pill, Segmented } from '@/components/ui';
import { setThemeChoice, useThemeChoice, type ThemeChoice } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { space, usePalette } from '@/theme/tokens';

export default function StaffProfile() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const theme = useThemeChoice();
  const { signOut } = useSession();
  const { user } = useAppSession();

  const displayName = user?.displayName || user?.username || 'Staff';
  const roleName = user ? t(`staff.roles.${user.role}`, { defaultValue: user.role }) : '—';

  return (
    <Page
      title={t('profile.title')}
      footer={<Button label={t('profile.signOut')} icon={IconLogout} tone="danger" onPress={() => void signOut()} />}>
      <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.md }}>
        <Avatar name={displayName} size={80} />
        <AppText variant="title" weight="bold" align="center">
          {displayName}
        </AppText>
        <Pill label={roleName} accent="teal" />
      </View>

      <Details
        rows={[
          [t('staff.role'), roleName],
          [t('auth.usernameLive'), user?.username || '—'],
          [t('auth.email'), user?.email || '—'],
        ]}
      />

      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        <ListRow first icon={IconLanguage} label={t('profile.language')} detail={language.nativeName} onPress={() => router.push('/language')} />
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
