import { Stack } from 'expo-router';

import { usePalette } from '@/theme/tokens';

/** Everything a signed-in tenant sees: the four tabs, and the pages they open. */
export default function AppLayout() {
  const palette = usePalette();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="done" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
