import { IconQrcode, IconUserPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Empty, Field, Onward, Pill, Segmented, Select, Avatar } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, weekday } from '@/lib/format';
import { dateDaysAgo } from '@/mock/clock';
import type { VisitPurpose, VisitStatus } from '@/mock/data';
import { inviteVisitor, useMockState } from '@/mock/store';
import { space, type Accent } from '@/theme/tokens';

const purposes: VisitPurpose[] = ['family', 'friend', 'delivery', 'service', 'other'];
const statusAccent: Record<VisitStatus, Accent> = { expected: 'primary', arrived: 'success', expired: 'warning' };

/** Invites a visitor with a QR pass for the gate, and lists who has been invited before. */
export default function Visitors() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { visitors } = useMockState();
  const [tab, setTab] = useState<'invite' | 'history'>('invite');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [date, setDate] = useState(dateDaysAgo(0));
  const [purpose, setPurpose] = useState<VisitPurpose>();
  const [vehicle, setVehicle] = useState('');
  const code = language.code;
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => dateDaysAgo(-d));
  const ready = !!name.trim() && mobile.replace(/\D/g, '').length >= 8 && !!purpose;

  const generate = () => {
    const visitor = inviteVisitor({ name: name.trim(), mobile: `+968 ${mobile.trim()}`, date, purpose: purpose!, vehicle: vehicle.trim() });
    router.push({ pathname: '/requests/visitor-pass/[id]', params: { id: visitor.id } });
  };

  return (
    <Page title={t('visit.title')} footer={tab === 'invite' ? <Button label={t('visit.generate')} icon={IconQrcode} disabled={!ready} onPress={generate} /> : undefined}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'invite', label: t('visit.invite') },
          { value: 'history', label: t('visit.history') },
        ]}
      />

      {tab === 'invite' ? (
        <>
          <Field label={t('visit.name')} value={name} onChangeText={setName} placeholder={t('visit.namePlaceholder')} autoComplete="name" />
          <Field
            label={t('auth.mobile')}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            placeholder={t('visit.mobilePlaceholder')}
            left={
              <AppText weight="medium" tone="secondary">
                🇴🇲 +968
              </AppText>
            }
          />
          <Select label={t('visit.date')} value={date} onChange={setDate} options={days.map((d) => ({ value: d, label: `${weekday(d, code)}, ${longDate(d, code)}` }))} />
          <Select label={t('visit.purpose')} placeholder={t('visit.selectPurpose')} value={purpose} onChange={setPurpose} options={purposes.map((p) => ({ value: p, label: t(`visit.purposes.${p}`) }))} />
          <Field label={t('visit.vehicle')} value={vehicle} onChangeText={setVehicle} placeholder={t('visit.vehiclePlaceholder')} autoCapitalize="characters" />
        </>
      ) : visitors.length === 0 ? (
        <Empty icon={IconUserPlus} title={t('visit.none')} />
      ) : (
        visitors.map((v) => (
          <Card key={v.id} style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push({ pathname: '/requests/visitor-pass/[id]', params: { id: v.id } })}>
            <Avatar name={v.name} size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="medium">{v.name}</AppText>
              <AppText variant="caption" tone="muted">
                {longDate(v.date, code)} · {t(`visit.purposes.${v.purpose}`)}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: space.xs }}>
              <Pill label={t(`visit.status.${v.status}`)} accent={statusAccent[v.status]} />
              <AppText variant="caption" tone="muted">
                {v.passNo}
              </AppText>
            </View>
            <Onward />
          </Card>
        ))
      )}
    </Page>
  );
}
