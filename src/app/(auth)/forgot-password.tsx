import { IconArrowLeft, IconArrowRight, IconMail, IconMailCheck, IconSend } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { requestPasswordReset } from '@/auth/session';
import { AppText } from '@/components/app-text';
import { EstateFlowMark } from '@/components/art';
import { AuthField, useAuthColors } from '@/components/auth-ui';
import { authMode } from '@/config';
import { useLanguage } from '@/i18n';
import { contentColumn, radius, space } from '@/theme/tokens';

/**
 * Asks for a reset link by email. It says the same thing whether or not the email has an
 * account, so it cannot be used to find out who has one. The emailed link opens the website.
 */
export default function ForgotPassword() {
  const { t } = useTranslation();
  const c = useAuthColors();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = /\S+@\S+\.\S+/.test(email.trim()) && !sending;
  const Back = isRTL ? IconArrowRight : IconArrowLeft;

  const send = async () => {
    if (!ready) return;
    setFailed(false);
    setSending(true);
    try {
      // The sample app has no mail server; it shows the same answer the live one would.
      if (authMode === 'api') await requestPasswordReset(email);
      setSent(true);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  const card = {
    gap: space.xl, padding: space.xl, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  } as const;

  const backLink = (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))} accessibilityRole="button" hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.xl }}>
      <Back size={16} color={c.muted} />
      <AppText weight="semibold" style={{ fontSize: 13.5, color: c.muted }}>
        {t('auth.backToSignIn')}
      </AppText>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg, direction: isRTL ? 'rtl' : 'ltr' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          ...contentColumn, maxWidth: 420, flexGrow: 1, justifyContent: 'center',
          paddingHorizontal: space.xl, paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
          <EstateFlowMark size={40} />
          <AppText weight="bold" style={{ fontSize: 21, lineHeight: 26, letterSpacing: -0.5, color: c.ink }}>
            EstateFlow
          </AppText>
        </View>

        {sent ? (
          <View style={{ ...card, alignItems: 'center', paddingVertical: space.xxxl }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,163,107,0.10)' }}>
              <IconMailCheck size={36} color="#0EA36B" />
            </View>
            <AppText variant="title" weight="bold" align="center" accessibilityRole="header" style={{ color: c.ink }}>
              {t('auth.checkEmail')}
            </AppText>
            <AppText align="center" style={{ color: c.muted, lineHeight: 21 }}>
              {t('auth.resetLinkSent', { email: email.trim() })}
            </AppText>
          </View>
        ) : (
          <>
            <View style={{ gap: space.sm, marginBottom: space.xxl }}>
              <AppText variant="heading" weight="bold" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.7, color: c.ink }}>
                {t('auth.forgotPassword')}
              </AppText>
              <AppText weight="medium" style={{ fontSize: 14.5, color: c.muted }}>
                {t('auth.forgotIntro')}
              </AppText>
            </View>

            <View style={card}>
              <AuthField
                label={t('auth.email')}
                icon={IconMail}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={() => void send()}
              />

              {failed ? (
                <View accessibilityRole="alert" style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: c.errorBg, borderWidth: 1, borderColor: c.errorBorder }}>
                  <AppText weight="medium" style={{ fontSize: 13, lineHeight: 18, color: c.error }}>
                    {t('auth.resetFailed')}
                  </AppText>
                </View>
              ) : null}

              <Pressable
                onPress={() => void send()}
                disabled={!ready}
                accessibilityRole="button"
                accessibilityState={{ disabled: !ready, busy: sending }}
                style={({ pressed }) => ({
                  height: 48, borderRadius: radius.md, backgroundColor: c.button,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
                  opacity: sending ? 0.85 : !ready ? 0.6 : pressed ? 0.9 : 1,
                })}>
                {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <AppText weight="bold" style={{ fontSize: 14.5, color: '#FFFFFF' }}>
                  {sending ? t('auth.sending') : t('auth.sendResetLink')}
                </AppText>
                {sending ? null : <IconSend size={18} color="#FFFFFF" />}
              </Pressable>
            </View>
          </>
        )}
        {backLink}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
