import { IconBuildingBank, IconCheck, IconCreditCard, IconInfoCircle, IconWallet, type Icon } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Details, IconTile, Note } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { monthYear, omr } from '@/lib/format';
import { lease, property } from '@/mock/data';
import { nextRentMonth, payRent, useMockState } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

type Method = 'card' | 'bankTransfer' | 'wallet';

const methods: { value: Method; icon: Icon }[] = [
  { value: 'card', icon: IconCreditCard },
  { value: 'bankTransfer', icon: IconBuildingBank },
  { value: 'wallet', icon: IconWallet },
];

/** Pays the next month's rent: the amount, a way to pay, and a receipt at the end. */
export default function PayRent() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const state = useMockState();
  const [method, setMethod] = useState<Method>('card');
  const code = language.code;
  const month = nextRentMonth(state);

  const pay = () => {
    const payment = payRent(method === 'bankTransfer' ? 'bankTransfer' : 'card', month);
    router.replace({ pathname: '/done', params: { kind: 'payment', ref: payment.receiptNo } });
  };

  return (
    <Page title={t('pay.payRent')} footer={<Button label={t('pay.payAmount', { amount: omr(lease.rent, code) })} onPress={pay} />}>
      <Details
        rows={[
          [t('pay.for'), t('pay.rentFor', { month: monthYear(month, code) })],
          [t('pay.unit'), t('property.unitNo', { unit: property.unitNo })],
          [t('pay.amount'), omr(lease.rent, code, true)],
        ]}
      />
      <AppText weight="semibold">{t('pay.method')}</AppText>
      {methods.map((m) => {
        const on = m.value === method;
        return (
          <Pressable
            key={m.value}
            onPress={() => setMethod(m.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: on ? palette.primary : palette.border, backgroundColor: on ? palette.primarySoft : palette.card }}>
            <IconTile icon={m.icon} size={38} />
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{t(`pay.methods.${m.value}`)}</AppText>
              <AppText variant="caption" tone="muted">
                {t(`pay.methodHint.${m.value}`)}
              </AppText>
            </View>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? palette.primary : palette.border, backgroundColor: on ? palette.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on ? <IconCheck size={13} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}
      <Note icon={IconInfoCircle} text={t('pay.sampleNote')} />
    </Page>
  );
}
