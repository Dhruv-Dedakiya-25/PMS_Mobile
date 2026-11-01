import { IconEye, IconEyeOff, IconInfoCircle, IconLock, IconUser } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GreenViewMark } from '@/components/art';
import { Page } from '@/components/page';
import { Button, Field, Note } from '@/components/ui';
import { brand } from '@/config';
import { tenant } from '@/mock/data';
import { signIn } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

export default function SignIn() {
  const { t } = useTranslation();
  const palette = usePalette();
  // Filled with the sample tenant, so a demo is one tap.
  const [username, setUsername] = useState(tenant.email);
  const [password, setPassword] = useState('sample-password');
  const [shown, setShown] = useState(false);
  const Eye = shown ? IconEyeOff : IconEye;

  return (
    <Page
      title=""
      footer={<Button label={t('auth.signIn')} disabled={!username.trim() || !password} onPress={signIn} />}>
      <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.lg }}>
        <GreenViewMark size={56} color={palette.primary} />
        <AppText variant="heading" weight="bold" align="center" style={{ marginTop: space.sm }}>
          {t('auth.welcomeBack')}
        </AppText>
        <AppText tone="secondary" align="center">
          {t('auth.signInTo', { name: `${brand.name} ${brand.subtitle}` })}
        </AppText>
      </View>
      <Field
        label={t('auth.username')}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username"
        keyboardType="email-address"
        left={<IconUser size={18} color={palette.textMuted} />}
      />
      <Field
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!shown}
        autoComplete="current-password"
        left={<IconLock size={18} color={palette.textMuted} />}
        right={
          <Pressable onPress={() => setShown(!shown)} accessibilityRole="button" accessibilityLabel={t(shown ? 'auth.hidePassword' : 'auth.showPassword')} hitSlop={8}>
            <Eye size={20} color={palette.textMuted} />
          </Pressable>
        }
      />
      <Pressable onPress={() => router.push('/create-account')} accessibilityRole="button" style={{ alignSelf: 'flex-end' }} hitSlop={8}>
        <AppText variant="small" weight="semibold" tone="primary">
          {t('auth.noAccount')}
        </AppText>
      </Pressable>
      <Note icon={IconInfoCircle} text={t('auth.sampleNote', { name: tenant.name })} />
    </Page>
  );
}
