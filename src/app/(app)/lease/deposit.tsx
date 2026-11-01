import { IconShieldCheck } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Details, IconTile, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import { lease } from '@/mock/data';
import { space } from '@/theme/tokens';

/** The security deposit: how much is held, since when, and how it comes back. */
export default function Deposit() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  return (
    <Page title={t('lease.deposit')}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <IconTile icon={IconShieldCheck} accent="success" size={56} />
        <AppText variant="caption" tone="secondary">
          {t('lease.depositHeld')}
        </AppText>
        <AppText variant="heading" weight="bold">
          {omr(lease.deposit, code, true)}
        </AppText>
        <Pill label={t('lease.held')} accent="success" />
      </Card>
      <Details
        rows={[
          [t('lease.paidOn'), longDate(lease.start, code)],
          [t('lease.receiptNo'), 'RCP-DEP-2024-0412'],
          [t('lease.heldBy'), 'GreenView Development LLC'],
          [t('lease.deductions'), omr(0, code, true)],
        ]}
      />
      <Card>
        <AppText weight="semibold">{t('lease.refundTitle')}</AppText>
        {['refundStep1', 'refundStep2', 'refundStep3'].map((key, i) => (
          <View key={key} style={{ flexDirection: 'row', gap: space.sm }}>
            <AppText variant="small" weight="bold" tone="primary">
              {i + 1}.
            </AppText>
            <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
              {t(`lease.${key}`)}
            </AppText>
          </View>
        ))}
      </Card>
    </Page>
  );
}
