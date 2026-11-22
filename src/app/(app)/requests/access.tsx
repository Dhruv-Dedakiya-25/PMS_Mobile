import { IconCar, IconId, IconInfoCircle, IconQrcode, IconRefresh } from '@tabler/icons-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { QrCode } from '@/components/qr-code';
import { Button, Card, Details, IconTile, Note, Pill } from '@/components/ui';
import type { MyAccessCardDto } from '@/api/types';
import { useAccessCards, useMobileKey } from '@/hooks/use-resident';
import { useProfile } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate } from '@/lib/format';
import { radius, space, usePalette, type Accent } from '@/theme/tokens';

const BARRIER: Record<'enabled' | 'pending' | 'off', { label: string; accent: Accent }> = {
  enabled: { label: 'access.enabled', accent: 'success' },
  pending: { label: 'access.pending', accent: 'warning' },
  off: { label: 'access.off', accent: 'danger' },
};

/** The mobile key the guard scans at the gate, the household's access cards and the car park barrier. */
export default function DigitalAccess() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const key = useMobileKey();
  const { cards, reportLost, loading, error, refresh, refreshing } = useAccessCards();
  const { property, parking } = useProfile();
  const [told, setTold] = useState(false);

  const confirmLost = (card: MyAccessCardDto) => {
    const go = async () => {
      try {
        await reportLost(card.id);
        setTold(true);
      } catch (e) {
        const reason = e instanceof Error ? e.message : t('common.errorLoad');
        if (Platform.OS === 'web') window.alert(reason);
        else Alert.alert(t('access.reportThisLost'), reason);
      }
    };
    const text = t('access.reportLostConfirm', { number: card.cardNumber });
    if (Platform.OS === 'web') {
      if (window.confirm(text)) go();
      return;
    }
    Alert.alert(t('access.reportThisLost'), text, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('access.reportThisLost'), style: 'destructive', onPress: go },
    ]);
  };

  const statusPill = (c: MyAccessCardDto) =>
    c.status === 'Active' ? (
      <Pill label={t(c.isPrimary ? 'access.primary' : 'access.family')} accent="success" />
    ) : (
      <Pill label={t(c.status === 'Lost' ? 'access.lost' : 'access.cancelled')} accent="danger" />
    );

  return (
    <Page title={t('access.title')} loading={loading} error={error} onRetry={refresh} refreshing={refreshing} onRefresh={refresh}>
      <View style={{ backgroundColor: palette.hero, borderRadius: radius.xl, padding: space.lg, gap: space.md, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" style={{ color: palette.heroMuted }}>
              {property.name}
            </AppText>
            <AppText weight="bold" style={{ color: palette.heroText }}>
              {t('access.mobileKey')}
            </AppText>
          </View>
          <IconQrcode size={28} color={palette.heroText} />
        </View>
        {key.code && !key.error ? (
          <>
            <View style={{ padding: space.sm, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
              <QrCode value={key.code} size={160} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconRefresh size={14} color={palette.heroMuted} />
              <AppText variant="caption" style={{ color: palette.heroMuted }}>
                {t('access.refreshesIn', { count: key.secondsLeft })}
              </AppText>
            </View>
            <AppText variant="small" align="center" style={{ color: palette.heroText }}>
              {t('access.howToScan')}
            </AppText>
          </>
        ) : (
          <AppText variant="small" align="center" style={{ color: palette.heroText }}>
            {key.error ?? t('common.loading')}
          </AppText>
        )}
      </View>

      <AppText variant="bodyLarge" weight="semibold">
        {t('access.cards')}
      </AppText>
      {cards.length === 0 ? <Note icon={IconInfoCircle} text={t('access.noCards')} /> : null}
      {cards.map((c) => (
        <Card key={c.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <IconTile icon={IconId} accent="violet" />
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{c.holderName}</AppText>
              <AppText variant="caption" tone="muted">
                {c.cardNumber}
              </AppText>
              {c.validUntil ? (
                <AppText variant="caption" tone="muted">
                  {t('access.validUntil', { date: longDate(c.validUntil.slice(0, 10), code) })}
                </AppText>
              ) : null}
            </View>
            {statusPill(c)}
          </View>
          {c.zones ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {c.zones.split(',').map((z) => z.trim()).filter(Boolean).map((z) => (
                <View key={z} style={{ backgroundColor: palette.surfaceStrong, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <AppText variant="caption" tone="secondary">
                    {z}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
          {c.status === 'Active' ? <Button label={t('access.reportThisLost')} tone="outline" compact onPress={() => confirmLost(c)} /> : null}
        </Card>
      ))}
      {told ? <Note icon={IconInfoCircle} accent="success" text={t('access.reportedLost')} /> : null}

      <AppText variant="bodyLarge" weight="semibold">
        {t('access.parkingAccess')}
      </AppText>
      {parking.length === 0 ? <Note icon={IconInfoCircle} text={t('access.noParking')} /> : null}
      {parking.map((p) => (
        <Details
          key={`${p.bay}-${p.plate}`}
          rows={[
            [t('property.bay', { bay: p.bay }), p.level],
            [t('property.vehicle'), `${p.vehicle} · ${p.plate}`],
            [t('property.tag'), p.tag],
            [t('access.barrier'), <Pill key="b" label={t(BARRIER[p.barrier].label)} accent={BARRIER[p.barrier].accent} />],
          ]}
        />
      ))}
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconTile icon={IconCar} accent="primary" />
        <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
          {t('access.guestParkingNote')}
        </AppText>
      </Card>
    </Page>
  );
}
