import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { PaymentRow } from '@/components/payment-row';
import { Card } from '@/components/ui';
import { useMockState } from '@/mock/store';

/** Every rent receipt, newest first; each opens as the receipt itself. */
export default function Receipts() {
  const { t } = useTranslation();
  const { payments } = useMockState();
  return (
    <Page title={t('pay.receipts')}>
      <AppText tone="secondary">{t('pay.receiptsIntro')}</AppText>
      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        {payments.map((p, i) => (
          <PaymentRow key={p.id} payment={p} first={i === 0} />
        ))}
      </Card>
    </Page>
  );
}
