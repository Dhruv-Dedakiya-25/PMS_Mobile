import { Stack } from 'expo-router';

import { usePalette } from '@/theme/tokens';

// Signed out, every address lands on the welcome screen first.
export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  const palette = usePalette();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="create-account" />
    </Stack>
  );
}
