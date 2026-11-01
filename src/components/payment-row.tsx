import { IconReceipt } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { IconTile, Onward } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, monthYear, omr } from '@/lib/format';
import type { Payment } from '@/mock/data';
import { space, usePalette } from '@/theme/tokens';

/** One rent payment: the month it covers, when and how it was paid, and its receipt. */
export function PaymentRow({ payment, first }: { payment: Payment; first?: boolean }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/payments/receipt/[id]', params: { id: payment.id } })}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border, backgroundColor: pressed ? palette.surface : 'transparent' })}>
      <IconTile icon={IconReceipt} accent="success" size={36} />
      <View style={{ flex: 1 }}>
        <AppText weight="medium">{t('pay.rentFor', { month: monthYear(payment.forMonth, code) })}</AppText>
        <AppText variant="caption" tone="muted">
          {longDate(payment.paidOn, code)} · {t(`pay.methods.${payment.method}`)}
        </AppText>
      </View>
      <AppText weight="semibold">{omr(payment.amount, code)}</AppText>
      <Onward />
    </Pressable>
  );
}
