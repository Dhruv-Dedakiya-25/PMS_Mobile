import { IconArrowRight, IconEye, IconEyeOff, IconLock, IconShieldCheck, IconUser } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { SignInError } from '@/auth/session';
import { AppText } from '@/components/app-text';
import { EstateFlowMark } from '@/components/art';
import { AuthField, useAuthColors } from '@/components/auth-ui';
import { useSession } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { tenant } from '@/mock/data';
import { contentColumn, radius, space } from '@/theme/tokens';

export default function SignIn() {
  const { t } = useTranslation();
  const c = useAuthColors();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const { isDemo, signIn } = useSession();
  // Demo mode fills the sample tenant so a demo is one tap; api mode starts empty.
  const [username, setUsername] = useState(isDemo ? tenant.email : '');
  const [password, setPassword] = useState(isDemo ? 'sample-password' : '');
  const [shown, setShown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const Eye = shown ? IconEyeOff : IconEye;
  const ready = Boolean(username.trim() && password) && !submitting;

  const handlePress = async () => {
    if (!ready) return;
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg, direction: isRTL ? 'rtl' : 'ltr' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          ...contentColumn,
          maxWidth: 420,
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: space.xl,
          paddingTop: insets.top + space.xxl,
          paddingBottom: insets.bottom + space.xl,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
          <EstateFlowMark size={40} />
          <AppText weight="bold" style={{ fontSize: 21, lineHeight: 26, letterSpacing: -0.5, color: c.ink }}>
            EstateFlow
          </AppText>
        </View>

        <View
          style={{
            flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginBottom: 18,
            paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.pill,
            backgroundColor: c.badge, borderWidth: 1, borderColor: c.badgeBorder,
          }}>
          <IconShieldCheck size={14} color={c.accent} />
          <AppText weight="bold" style={{ fontSize: 11.5, lineHeight: 15, color: c.accent }}>
            {t('auth.secureSignIn')}
          </AppText>
        </View>

        <View style={{ gap: space.sm, marginBottom: space.xxl }}>
          <AppText variant="heading" weight="bold" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.7, color: c.ink }}>
            {t('auth.welcomeBack')}
          </AppText>
          <AppText weight="medium" style={{ fontSize: 14.5, color: c.muted }}>
            {t('auth.signInDashboard')}
          </AppText>
        </View>

        <View
          style={{
            gap: space.xl, padding: space.xl, paddingTop: space.xxl, borderRadius: 16, overflow: 'hidden',
            backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
            shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3,
          }}>
          {/* The website's accent across the top of the card. */}
          <Svg width="100%" height={3} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <Defs>
              <LinearGradient id="signInAccent" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#3B6FF6" />
                <Stop offset="0.5" stopColor="#7C5CF6" />
                <Stop offset="1" stopColor="#0EA36B" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={3} fill="url(#signInAccent)" />
          </Svg>

          <AuthField
            // A live account signs in with its PMS username, not the sample's email.
            label={isDemo ? t('auth.username') : t('auth.usernameLive')}
            icon={IconUser}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            keyboardType={isDemo ? 'email-address' : 'default'}
            returnKeyType="next"
          />
          <AuthField
            label={t('auth.password')}
            icon={IconLock}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!shown}
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => void handlePress()}
            right={
              <Pressable onPress={() => setShown(!shown)} accessibilityRole="button" accessibilityLabel={t(shown ? 'auth.hidePassword' : 'auth.showPassword')} hitSlop={8}>
                <Eye size={18} color={c.faint} />
              </Pressable>
            }
          />

          <Pressable onPress={() => router.push('/forgot-password')} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: -space.sm }}>
            <AppText weight="semibold" style={{ fontSize: 12.5, color: c.accent }}>
              {t('auth.forgotPassword')}
            </AppText>
          </Pressable>

          {/* Shown above the button, not as a toast, so it stays while the field is corrected. */}
          {errorMessage ? (
            <View accessibilityRole="alert" style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: c.errorBg, borderWidth: 1, borderColor: c.errorBorder }}>
              <AppText weight="medium" style={{ fontSize: 13, lineHeight: 18, color: c.error }}>
                {errorMessage}
              </AppText>
            </View>
          ) : null}

          <Pressable
            onPress={() => void handlePress()}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready, busy: submitting }}
            style={({ pressed }) => ({
              height: 48, borderRadius: radius.md, backgroundColor: c.button,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
              opacity: submitting ? 0.85 : !ready ? 0.6 : pressed ? 0.9 : 1,
            })}>
            {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
            <AppText weight="bold" style={{ fontSize: 14.5, color: '#FFFFFF' }}>
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </AppText>
            {submitting ? null : <IconArrowRight size={18} color="#FFFFFF" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />}
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xl }}>
          {isDemo ? (
            <AppText variant="caption" align="center" style={{ color: c.muted }}>
              {t('auth.sampleNote', { name: tenant.name })}
            </AppText>
          ) : null}
          {/* Latin text, so it keeps its order in a right-to-left language. */}
          <AppText variant="caption" align="center" style={{ color: c.faint, writingDirection: 'ltr' }}>
            © {new Date().getFullYear()} EstateFlow · Sactech
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
