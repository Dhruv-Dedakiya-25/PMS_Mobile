import { Stack } from 'expo-router';

import { usePalette } from '@/theme/tokens';

// Signed out, every address lands on sign-in first.
export const unstable_settings = { initialRouteName: 'sign-in' };

export default function AuthLayout() {
  const palette = usePalette();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="create-account" />
    </Stack>
  );
}
