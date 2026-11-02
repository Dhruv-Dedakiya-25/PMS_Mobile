import { IconAlertCircle, IconArrowLeft, IconArrowRight } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button, Card } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { contentColumn, space, usePalette } from '@/theme/tokens';

type PageProps = {
  title: string;
  /** Shown at the end of the title bar, such as a status. */
  right?: ReactNode;
  children: ReactNode;
  /** Pinned to the bottom, above the safe area: the screen's main actions. */
  footer?: ReactNode;
  /** Off for the first screen, which has nowhere to go back to. */
  back?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** A screen opened from a tab: a back button and title, scrolling content, and optional actions pinned at the bottom. */
export function Page({ title, right, children, footer, back = true, loading, error, onRetry, refreshing, onRefresh }: PageProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const Back = isRTL ? IconArrowRight : IconArrowLeft;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ ...contentColumn, paddingTop: insets.top + space.sm, paddingHorizontal: space.md, paddingBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: palette.bg }}>
        {back && (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? palette.surfaceStrong : 'transparent' })}>
            <Back size={22} color={palette.text} />
          </Pressable>
        )}
        <AppText variant="bodyLarge" weight="semibold" style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
          {title}
        </AppText>
        {right}
      </View>
      <ScrollView
        contentContainerStyle={{ ...contentColumn, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: footer ? space.xl : insets.bottom + space.xxxl, gap: space.lg }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} />
          ) : undefined
        }>
        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxxl, gap: space.sm }}>
            <ActivityIndicator size="large" color={palette.primary} />
            <AppText variant="small" tone="secondary">
              {t('common.loading')}
            </AppText>
          </View>
        ) : error ? (
          <Card style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.md }}>
            <IconAlertCircle size={36} color={palette.danger} strokeWidth={1.8} />
            <AppText align="center" tone="secondary">
              {error}
            </AppText>
            {onRetry ? <Button label={t('common.retry')} tone="outline" compact onPress={onRetry} /> : null}
          </Card>
        ) : (
          children
        )}
      </ScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.lg), borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.card }}>
          <View style={{ ...contentColumn, gap: space.sm }}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
