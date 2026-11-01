import { IconCar, IconId, IconInfoCircle, IconNfc, IconRefresh } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { QrCode } from '@/components/qr-code';
import { Button, Card, Details, IconTile, Note, Pill } from '@/components/ui';
import { brand } from '@/config';
import { useLanguage } from '@/i18n';
import { longDate } from '@/lib/format';
import { accessCards, parking, property, tenant } from '@/mock/data';
import { radius, space, usePalette } from '@/theme/tokens';

const REFRESH_SECONDS = 30;

/** The mobile key, the household's access cards and the car park's tag. */
export default function DigitalAccess() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const [tick, setTick] = useState(0);
  const [reported, setReported] = useState(false);
  const code = language.code;

  // The mobile key's code changes every 30 seconds, so a screenshot of it soon stops working.
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = REFRESH_SECONDS - (tick % REFRESH_SECONDS);
  const key = `GV-${property.unitNo}-${Math.floor(tick / REFRESH_SECONDS)}`;

  return (
    <Page title={t('access.title')}>
      <View style={{ backgroundColor: palette.hero, borderRadius: radius.xl, padding: space.lg, gap: space.md, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" style={{ color: palette.heroMuted }}>
              {brand.name} {brand.subtitle}
            </AppText>
            <AppText weight="bold" style={{ color: palette.heroText }}>
              {t('access.mobileKey')}
            </AppText>
          </View>
          <IconNfc size={28} color={palette.heroText} />
        </View>
        <View style={{ padding: space.sm, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
          <QrCode value={key} size={160} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconRefresh size={14} color={palette.heroMuted} />
          <AppText variant="caption" style={{ color: palette.heroMuted }}>
            {t('access.refreshesIn', { count: left })}
          </AppText>
        </View>
        <AppText variant="small" align="center" style={{ color: palette.heroText }}>
          {t('access.howTo')}
        </AppText>
      </View>

      <AppText variant="bodyLarge" weight="semibold">
        {t('access.cards')}
      </AppText>
      {accessCards.map((c) => (
        <Card key={c.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <IconTile icon={IconId} accent="violet" />
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{c.holder}</AppText>
              <AppText variant="caption" tone="muted">
                {c.number}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('access.validUntil', { date: longDate(c.expires, code) })}
              </AppText>
            </View>
            <Pill label={t(c.holder === tenant.name ? 'access.primary' : 'access.family')} accent={c.active ? 'success' : 'danger'} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {c.zones.map((z) => (
              <View key={z} style={{ backgroundColor: palette.surfaceStrong, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                <AppText variant="caption" tone="secondary">
                  {z}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ))}
      <Button label={t('access.reportLost')} tone="outline" onPress={() => setReported(true)} />
      {reported ? <Note icon={IconInfoCircle} text={t('common.sample')} /> : null}

      <AppText variant="bodyLarge" weight="semibold">
        {t('access.parkingAccess')}
      </AppText>
      {parking.map((p) => (
        <Details
          key={p.bay}
          rows={[
            [t('property.bay', { bay: p.bay }), p.level],
            [t('property.vehicle'), `${p.vehicle} · ${p.plate}`],
            [t('property.tag'), p.tag],
            [t('access.barrier'), <Pill key="b" label={t('access.enabled')} accent="success" />],
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
