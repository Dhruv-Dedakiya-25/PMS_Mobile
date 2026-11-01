import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { PaymentRow } from '@/components/payment-row';
import { Card } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { omanToday } from '@/mock/clock';
import { useMockState } from '@/mock/store';
import { space } from '@/theme/tokens';

export default function PaymentHistory() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { payments } = useMockState();
  const year = omanToday().slice(0, 4);
  const thisYear = payments.filter((p) => p.paidOn.startsWith(year)).reduce((sum, p) => sum + p.amount, 0);
  return (
    <Page title={t('pay.history')}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Card style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" tone="secondary">
            {t('pay.paidThisYear')}
          </AppText>
          <AppText variant="bodyLarge" weight="bold">
            {omr(thisYear, language.code)}
          </AppText>
        </Card>
        <Card style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" tone="secondary">
            {t('pay.payments')}
          </AppText>
          <AppText variant="bodyLarge" weight="bold">
            {payments.length}
          </AppText>
        </Card>
      </View>
      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        {payments.map((p, i) => (
          <PaymentRow key={p.id} payment={p} first={i === 0} />
        ))}
      </Card>
    </Page>
  );
}
