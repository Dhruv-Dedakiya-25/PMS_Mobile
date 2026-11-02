import { IconReceipt } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { PaymentRow } from '@/components/payment-row';
import { Card, Empty } from '@/components/ui';
import { usePayments } from '@/hooks/use-tenancy';

/** Every rent receipt, newest first; each opens as the receipt itself. */
export default function Receipts() {
  const { t } = useTranslation();
  const { payments, loading, refreshing, error, refresh } = usePayments();
  return (
    <Page
      title={t('pay.receipts')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}>
      <AppText tone="secondary">{t('pay.receiptsIntro')}</AppText>
      {payments.length === 0 ? (
        <Empty icon={IconReceipt} title={t('maint.none')} />
      ) : (
        <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
          {payments.map((p, i) => (
            <PaymentRow key={p.id} payment={p} first={i === 0} />
          ))}
        </Card>
      )}
    </Page>
  );
}
