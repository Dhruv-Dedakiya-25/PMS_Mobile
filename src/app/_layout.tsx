import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { clearLock, lockApplies, lockKeptSession, useLocked, watchAway } from '@/auth/lock';
import { LockScreen } from '@/components/app-lock';
import { restoreThemeChoice, useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-tenancy';
import { restoreLanguage } from '@/i18n';
import { usePalette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [settingsReady, setSettingsReady] = useState(false);
  const scheme = useColorScheme();
  const palette = usePalette();
  const { signedIn, user, ready: authReady, restore } = useSession();
  const locked = useLocked();

  // A kept session opens behind the lock, so nothing of it shows before Face ID or a fingerprint.
  useEffect(() => {
    Promise.all([restoreLanguage(), restoreThemeChoice(), restore().then(lockKeptSession)]).finally(() => setSettingsReady(true));
  }, [restore]);
  useEffect(() => (lockApplies ? watchAway() : undefined), []);
  useEffect(() => {
    if (!signedIn) clearLock();
  }, [signedIn]);

  // A font that fails to load falls back to the system font rather than holding the splash screen.
  const ready = (fontsLoaded || fontError != null) && settingsReady && authReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, primary: palette.primary, background: palette.bg, card: palette.card, text: palette.text, border: palette.border } }}>
      {/* In a laptop browser the app keeps a phone's width, centred; on a phone it fills the screen as usual. */}
      <View style={{ flex: 1, backgroundColor: palette.surfaceStrong }}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: Platform.OS === 'web' ? 480 : undefined,
            alignSelf: 'center',
            overflow: 'hidden',
            borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
            borderRightWidth: Platform.OS === 'web' ? 1 : 0,
            borderColor: palette.border,
          }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
            <Stack.Protected guard={signedIn}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          {/* Over the screens rather than instead of them: unlocking returns to where the person was. */}
          {lockApplies && locked && user ? (
            <View style={StyleSheet.absoluteFill}>
              <LockScreen name={(user.displayName || user.username).split(' ')[0]} />
            </View>
          ) : null}
        </View>
      </View>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
