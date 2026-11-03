import { IconAlertCircle, IconEye, IconEyeOff, IconInfoCircle, IconLock, IconUser } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { SignInError } from '@/auth/session';
import { AppText } from '@/components/app-text';
import { BuildingScene, GreenViewMark } from '@/components/art';
import { Page } from '@/components/page';
import { Button, Field, Note } from '@/components/ui';
import { brand } from '@/config';
import { useSession } from '@/hooks/use-tenancy';
import { tenant } from '@/mock/data';
import { radius, space, usePalette } from '@/theme/tokens';

export default function SignIn() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { isDemo, signIn } = useSession();
  // Demo mode fills the sample tenant so a demo is one tap; api mode starts empty.
  const [username, setUsername] = useState(isDemo ? tenant.email : '');
  const [password, setPassword] = useState(isDemo ? 'sample-password' : '');
  const [shown, setShown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const Eye = shown ? IconEyeOff : IconEye;

  const handlePress = async () => {
    if (submitting) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signIn(username, password);
    } catch (e) {
      if (e instanceof SignInError) {
        if (e.reason === 'noApi') {
          setErrorMessage(t('common.errorLoad'));
        } else {
          setErrorMessage(e.message && e.message !== 'invalid' ? e.message : t('auth.invalidCredentials'));
        }
      } else {
        setErrorMessage(e instanceof Error ? e.message : t('common.errorLoad'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page
      title=""
      back={false}
      footer={
        <Button
          label={t('auth.signIn')}
          disabled={!username.trim() || !password || submitting}
          onPress={() => void handlePress()}
        />
      }>
      {/* The residence itself, with its mark, so the page is GreenView's before anything is typed. */}
      <View>
        <BuildingScene style={{ height: 180, borderRadius: radius.xl }} />
        <View
          style={{
            position: 'absolute',
            top: space.md,
            left: space.md,
            padding: space.sm,
            borderRadius: radius.lg,
            backgroundColor: palette.card,
          }}>
          <GreenViewMark size={32} color={palette.primary} />
        </View>
      </View>
      <View style={{ gap: space.xs }}>
        <AppText variant="heading" weight="bold" accessibilityRole="header">
          {t('auth.signIn')}
        </AppText>
        <AppText tone="secondary">{t('auth.signInFor', { name: `${brand.name} ${brand.subtitle}` })}</AppText>
      </View>
      {errorMessage ? <Note icon={IconAlertCircle} accent="danger" text={errorMessage} /> : null}
      <Field
        // A live account signs in with its PMS username, not the sample's email.
        label={isDemo ? t('auth.username') : t('auth.usernameLive')}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username"
        keyboardType={isDemo ? 'email-address' : 'default'}
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
      {isDemo ? (
        <Pressable onPress={() => router.push('/create-account')} accessibilityRole="button" style={{ alignSelf: 'flex-end' }} hitSlop={8}>
          <AppText variant="small" weight="semibold" tone="primary">
            {t('auth.noAccount')}
          </AppText>
        </Pressable>
      ) : null}
      {isDemo ? <Note icon={IconInfoCircle} text={t('auth.sampleNote', { name: tenant.name })} /> : null}
    </Page>
  );
}
