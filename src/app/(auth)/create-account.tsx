import { IconCircleCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Field } from '@/components/ui';
import { space, usePalette } from '@/theme/tokens';

/** A resident asks for an account; the management office checks the tenancy before it opens. */
export default function CreateAccount() {
  const { t } = useTranslation();
  const palette = usePalette();
  const [form, setForm] = useState({ name: '', mobile: '', email: '', unit: '', password: '', confirm: '' });
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value });
  const mismatch = !!form.confirm && form.confirm !== form.password;
  const complete = Object.values(form).every((v) => v.trim()) && !mismatch && form.password.length >= 8;

  if (sent)
    return (
      <Page title="" footer={<Button label={t('auth.backToSignIn')} onPress={() => router.replace('/sign-in')} />}>
        <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xxxl }}>
          <IconCircleCheck size={72} color={palette.success} strokeWidth={1.5} />
          <AppText variant="title" weight="bold" align="center">
            {t('auth.requestSent')}
          </AppText>
          <AppText tone="secondary" align="center">
            {t('auth.requestSentDetail', { mobile: form.mobile })}
          </AppText>
        </View>
      </Page>
    );

  return (
    <Page title={t('auth.createAccount')} footer={<Button label={t('auth.sendRequest')} disabled={!complete} onPress={() => setSent(true)} />}>
      <AppText tone="secondary">{t('auth.createIntro')}</AppText>
      <Field label={t('auth.fullName')} value={form.name} onChangeText={set('name')} autoComplete="name" />
      <Field
        label={t('auth.mobile')}
        value={form.mobile}
        onChangeText={set('mobile')}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="9123 4567"
        left={<AppText weight="medium" tone="secondary">+968</AppText>}
      />
      <Field label={t('auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label={t('auth.unit')} value={form.unit} onChangeText={set('unit')} placeholder={t('auth.unitPlaceholder')} />
      <Field label={t('auth.password')} value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" hint={t('auth.passwordHint')} />
      <Field label={t('auth.confirmPassword')} value={form.confirm} onChangeText={set('confirm')} secureTextEntry autoComplete="new-password" error={mismatch ? t('auth.passwordMismatch') : undefined} />
    </Page>
  );
}
