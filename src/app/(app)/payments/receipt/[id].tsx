import { IconCircleCheckFilled, IconDownload, IconInfoCircle } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GreenViewMark } from '@/components/art';
import { Page } from '@/components/page';
import { Button, Note } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, monthYear, omr } from '@/lib/format';
import { property, tenant } from '@/mock/data';
import { useMockState } from '@/mock/store';
import { space } from '@/theme/tokens';

/** A rent receipt as printed: white paper in either theme. */
export default function Receipt() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { payments } = useMockState();
  const [saved, setSaved] = useState(false);
  const payment = payments.find((p) => p.id === id) ?? payments[0];
  const code = language.code;
  const ink = '#14213D';
  const faint = '#5B6A82';
  const lines: [string, string][] = [
    [t('pay.receiptNo'), payment.receiptNo],
    [t('pay.invoiceNo'), payment.invoiceNo],
    [t('pay.paidOn'), longDate(payment.paidOn, code)],
    [t('pay.for'), t('pay.rentFor', { month: monthYear(payment.forMonth, code) })],
    [t('pay.method'), t(`pay.methods.${payment.method}`)],
    [t('property.tenant'), tenant.name],
    [t('pay.unit'), `${property.unitNo} · ${property.building}`],
  ];
  return (
    <Page title={t('pay.receipt')} footer={<Button label={t('pay.download')} icon={IconDownload} tone="outline" onPress={() => setSaved(true)} />}>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#DCE3EC', padding: space.xl, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <GreenViewMark size={40} />
          <View style={{ flex: 1 }}>
            <AppText weight="bold" style={{ color: ink }}>
              {property.name}
            </AppText>
            <AppText variant="caption" style={{ color: faint }}>
              {property.address}
            </AppText>
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.md }}>
          <IconCircleCheckFilled size={40} color="#15803D" />
          <AppText variant="caption" style={{ color: faint }}>
            {t('pay.amountPaid')}
          </AppText>
          <AppText variant="heading" weight="bold" style={{ color: ink }}>
            {omr(payment.amount, code, true)}
          </AppText>
        </View>
        {lines.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#EEF1F5' }}>
            <AppText variant="small" style={{ color: faint }}>
              {label}
            </AppText>
            <AppText variant="small" weight="medium" style={{ color: ink, flexShrink: 1 }}>
              {value}
            </AppText>
          </View>
        ))}
      </View>
      {saved ? <Note icon={IconInfoCircle} text={t('common.sample')} /> : null}
    </Page>
  );
}
