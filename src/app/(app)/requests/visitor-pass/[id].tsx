import { IconInfoCircle, IconShare, IconUserPlus } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Share, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { QrCode } from '@/components/qr-code';
import { Button, Card, Details, Empty, Note, Pill } from '@/components/ui';
import { useVisitors } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, ltr } from '@/lib/format';
import { property } from '@/mock/data';
import { space, usePalette, type Accent } from '@/theme/tokens';

const statusAccent: Record<string, Accent> = { arrived: 'success', left: 'teal', expired: 'warning', cancelled: 'danger' };

/**
 * The visitor's pass: a QR code the gate scans, with the visit's details. In the live app
 * the QR carries the pass's own code, the pass is shared through the phone's share menu,
 * and it can be cancelled until the visitor arrives.
 */
export default function VisitorPass() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { visitors, isDemo, cancel, loading, error, refresh } = useVisitors();
  const [shared, setShared] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const v = visitors.find((x) => x.id === id) ?? (isDemo ? visitors[0] : undefined);
  const code = language.code;

  if (!v) {
    return (
      <Page title={t('visit.pass')} loading={loading} error={error} onRetry={refresh}>
        <Empty icon={IconUserPlus} title={t('visit.none')} />
      </Page>
    );
  }

  const building = v.building ?? property.name;
  const unit = v.unit ?? property.unitNo;
  const hostBuilding = v.building ?? property.building;

  const share = () => {
    if (isDemo || !v.code) {
      setShared(true);
      return;
    }
    // The visitor needs the code, the place and the day; the share menu sends it however they like.
    Share.share({ message: t('visit.shareText', { number: v.passNo, property: building, date: longDate(v.date, code), code: v.code }) })
      .catch(() => undefined);
  };

  const doCancel = async () => {
    setCancelling(true);
    try {
      await cancel(v.id);
    } catch (e) {
      const reason = e instanceof Error ? e.message : '';
      if (Platform.OS === 'web') window.alert(reason || t('common.errorLoad'));
      else Alert.alert(t('common.errorLoad'), reason);
    } finally {
      setCancelling(false);
    }
  };

  const confirmCancel = () => {
    // React Native's Alert shows nothing in a browser, so the web build asks the browser instead.
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('visit.cancelTitle')}\n${t('visit.cancelBody', { name: v.name })}`)) void doCancel();
      return;
    }
    Alert.alert(t('visit.cancelTitle'), t('visit.cancelBody', { name: v.name }), [
      { text: t('visit.keep'), style: 'cancel' },
      { text: t('visit.cancel'), style: 'destructive', onPress: () => void doCancel() },
    ]);
  };

  const open = v.status !== 'cancelled' && v.status !== 'expired';
  return (
    <Page
      title={t('visit.pass')}
      footer={open ? (
        <View style={{ gap: space.sm }}>
          <Button label={t('visit.sharePass')} icon={IconShare} onPress={share} />
          {!isDemo && v.status === 'expected' && <Button label={t('visit.cancel')} tone="outline" disabled={cancelling} onPress={confirmCancel} />}
        </View>
      ) : undefined}
    >
      <Card style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.md }}>
        <AppText variant="small" weight="semibold" tone="primary">
          {building}
        </AppText>
        {open && (
          <View style={{ padding: space.sm, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: palette.border }}>
            <QrCode value={v.code ?? `${v.passNo}|${unit}|${v.date}`} size={200} />
          </View>
        )}
        {v.code && open && (
          <AppText variant="title" weight="bold" style={{ letterSpacing: 4 }}>
            {ltr(v.code)}
          </AppText>
        )}
        <AppText variant="title" weight="bold">
          {v.name}
        </AppText>
        <Pill label={t(`visit.status.${v.status}`)} accent={statusAccent[v.status] ?? 'primary'} />
      </Card>
      <Details
        rows={[
          [t('visit.passNo'), v.passNo],
          [t('visit.date'), longDate(v.date, code)],
          [t('visit.purpose'), t(`visit.purposes.${v.purpose}`)],
          [t('auth.mobile'), v.mobile ? ltr(v.mobile) : '—'],
          [t('visit.vehicle'), v.vehicle || t('visit.noVehicle')],
          [t('visit.host'), t('visit.hostLine', { unit, building: hostBuilding })],
        ]}
      />
      <Note icon={IconInfoCircle} text={shared ? t('common.sample') : t('visit.gateNote')} />
    </Page>
  );
}
