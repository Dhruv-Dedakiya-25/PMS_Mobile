import { IconCalendarCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FacilityArt } from '@/components/art';
import { Page } from '@/components/page';
import { Card, Chips, IconTile, Onward } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, omr } from '@/lib/format';
import { facilities, type FacilityKind } from '@/mock/data';
import { useMockState } from '@/mock/store';
import { space } from '@/theme/tokens';

type Filter = 'all' | FacilityKind;

/** The building's shared spaces to book, with the tenant's own upcoming bookings first. */
export default function Facilities() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { bookings } = useMockState();
  const [filter, setFilter] = useState<Filter>('all');
  const code = language.code;
  const upcoming = bookings.filter((b) => daysUntil(b.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  const shown = facilities.filter((f) => filter === 'all' || f.kind === filter);

  return (
    <Page title={t('fac.title')}>
      <Chips<Filter>
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: t('common.all') }, ...facilities.map((f) => ({ value: f.kind, label: t(`fac.kinds.${f.kind}`) }))]}
      />

      {upcoming.length && filter === 'all' ? (
        <View style={{ gap: space.sm }}>
          <AppText weight="semibold">{t('fac.myBookings')}</AppText>
          {upcoming.map((b) => {
            const f = facilities.find((x) => x.id === b.facilityId)!;
            return (
              <Card key={b.id} style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push({ pathname: '/requests/facilities/[id]', params: { id: f.id, booking: b.id } })}>
                <IconTile icon={IconCalendarCheck} accent="success" />
                <View style={{ flex: 1 }}>
                  <AppText weight="medium">{f.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {longDate(b.date, code)} · {b.slot}
                  </AppText>
                </View>
                <Onward />
              </Card>
            );
          })}
          <AppText weight="semibold" style={{ marginTop: space.sm }}>
            {t('fac.bookASpace')}
          </AppText>
        </View>
      ) : null}

      {shown.map((f) => (
        <Card key={f.id} style={{ flexDirection: 'row', alignItems: 'center', padding: space.md }} onPress={() => router.push({ pathname: '/requests/facilities/[id]', params: { id: f.id } })}>
          <FacilityArt kind={f.kind} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="semibold">{f.name}</AppText>
            <AppText variant="caption" tone="secondary">
              {f.location}
            </AppText>
            <AppText variant="caption" weight="semibold" tone={f.fee ? 'default' : 'success'}>
              {f.fee ? t('fac.perSlot', { amount: omr(f.fee, code) }) : t('common.free')}
            </AppText>
          </View>
          <Onward />
        </Card>
      ))}
    </Page>
  );
}
