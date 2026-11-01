import { IconInfoCircle, IconShare } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { QrCode } from '@/components/qr-code';
import { Button, Card, Details, Note, Pill } from '@/components/ui';
import { brand } from '@/config';
import { useLanguage } from '@/i18n';
import { longDate, ltr } from '@/lib/format';
import { property } from '@/mock/data';
import { useMockState } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

/** The visitor's pass: a QR code the gate scans, with the visit's details. */
export default function VisitorPass() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { visitors } = useMockState();
  const [shared, setShared] = useState(false);
  const v = visitors.find((x) => x.id === id) ?? visitors[0];
  const code = language.code;
  return (
    <Page title={t('visit.pass')} footer={<Button label={t('visit.sharePass')} icon={IconShare} onPress={() => setShared(true)} />}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.md }}>
        <AppText variant="small" weight="semibold" tone="primary">
          {brand.name} {brand.subtitle}
        </AppText>
        <View style={{ padding: space.sm, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: palette.border }}>
          <QrCode value={`${v.passNo}|${property.unitNo}|${v.date}`} size={200} />
        </View>
        <AppText variant="title" weight="bold">
          {v.name}
        </AppText>
        <Pill label={t(`visit.status.${v.status}`)} accent={v.status === 'arrived' ? 'success' : 'primary'} />
      </Card>
      <Details
        rows={[
          [t('visit.passNo'), v.passNo],
          [t('visit.date'), longDate(v.date, code)],
          [t('visit.purpose'), t(`visit.purposes.${v.purpose}`)],
          [t('auth.mobile'), ltr(v.mobile)],
          [t('visit.vehicle'), v.vehicle || t('visit.noVehicle')],
          [t('visit.host'), t('visit.hostLine', { unit: property.unitNo, building: property.building })],
        ]}
      />
      <Note icon={IconInfoCircle} text={shared ? t('common.sample') : t('visit.gateNote')} />
    </Page>
  );
}
