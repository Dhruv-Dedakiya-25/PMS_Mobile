import { IconAlertCircle } from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button, Card } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { contentColumn, space, usePalette } from '@/theme/tokens';

type ScreenProps = {
  /** The tab's title; the dashboard draws its own header instead. */
  title?: string;
  subtitle?: string;
  /** Shown at the top end of the title row. */
  action?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** A tab's page: safe-area aware, scrolls, title row at the top. */
export function Screen({ title, subtitle, action, children, loading, error, onRetry, refreshing, onRefresh }: ScreenProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }}>
      <ScrollView
        contentContainerStyle={{
          ...contentColumn,
          paddingTop: insets.top + space.lg,
          paddingHorizontal: space.xl,
          paddingBottom: space.xxxl,
          gap: space.lg,
        }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} />
          ) : undefined
        }>
        {title ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="heading" weight="bold" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? <AppText tone="secondary">{subtitle}</AppText> : null}
            </View>
            {action}
          </View>
        ) : null}
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
    </View>
  );
}
