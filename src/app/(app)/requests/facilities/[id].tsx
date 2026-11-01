import { IconClock, IconMinus, IconPlus, IconUsers } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FacilityArt } from '@/components/art';
import { Page } from '@/components/page';
import { Button, Card, Details, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, omr, weekday } from '@/lib/format';
import { dateDaysAgo } from '@/mock/clock';
import { facilities } from '@/mock/data';
import { book, cancelBooking, useMockState } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

/** Two-hour slots from opening to closing time. */
const slotsFor = (opens: string, closes: string) => {
  const start = Number(opens.slice(0, 2));
  const end = closes === '23:59' ? 24 : Number(closes.slice(0, 2));
  const out: string[] = [];
  for (let h = start; h + 2 <= end; h += 2) out.push(`${String(h).padStart(2, '0')}:00–${String(h + 2).padStart(2, '0')}:00`);
  return out;
};

/** A facility's page: its details, then a day, a slot and the number of guests to book it. */
export default function FacilityBooking() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { id, booking: bookingId } = useLocalSearchParams<{ id: string; booking?: string }>();
  const { bookings } = useMockState();
  const facility = facilities.find((f) => f.id === id) ?? facilities[0];
  const existing = bookings.find((b) => b.id === bookingId);
  const code = language.code;
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => dateDaysAgo(-d));
  const [date, setDate] = useState(days[1]);
  const [slot, setSlot] = useState<string>();
  const [guests, setGuests] = useState(2);
  const slots = slotsFor(facility.opens, facility.closes);
  // The sample marks some slots taken, differently each day, as other residents' bookings would.
  const taken = new Set(slots.filter((_, i) => (i + Number(date.slice(8))) % 3 === 0));
  const header = (
    <>
      <FacilityArt kind={facility.kind} width="100%" height={170} rounded={radius.xl} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" weight="bold">
            {facility.name}
          </AppText>
          <AppText tone="secondary">{facility.location}</AppText>
        </View>
        <Pill label={facility.fee ? t('fac.perSlot', { amount: omr(facility.fee, code) }) : t('common.free')} accent={facility.fee ? 'primary' : 'success'} />
      </View>
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconClock size={16} color={palette.textMuted} />
          <AppText variant="small" tone="secondary">
            {facility.opens}–{facility.closes}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconUsers size={16} color={palette.textMuted} />
          <AppText variant="small" tone="secondary">
            {t('fac.capacity', { count: facility.capacity })}
          </AppText>
        </View>
      </View>
    </>
  );

  if (existing)
    return (
      <Page
        title={t('fac.booking')}
        footer={
          <Button
            label={t('fac.cancelBooking')}
            tone="danger"
            onPress={() => {
              cancelBooking(existing.id);
              router.back();
            }}
          />
        }>
        {header}
        <Details
          rows={[
            [t('fac.date'), `${weekday(existing.date, code)}, ${longDate(existing.date, code)}`],
            [t('fac.time'), existing.slot],
            [t('fac.guests'), String(existing.guests)],
            [t('fac.status'), <Pill key="s" label={t('fac.confirmed')} accent="success" />],
          ]}
        />
      </Page>
    );

  return (
    <Page
      title={t('fac.book')}
      footer={
        <Button
          label={facility.fee ? t('fac.bookFor', { amount: omr(facility.fee, code) }) : t('fac.book')}
          disabled={!slot}
          onPress={() => {
            book({ facilityId: facility.id, date, slot: slot!, guests });
            router.replace({ pathname: '/done', params: { kind: 'booking', ref: `${facility.name} · ${longDate(date, code)} · ${slot}` } });
          }}
        />
      }>
      {header}

      <AppText weight="semibold">{t('fac.date')}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
        {days.map((d) => {
          const on = d === date;
          return (
            <Pressable
              key={d}
              onPress={() => {
                setDate(d);
                setSlot(undefined);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{ width: 58, paddingVertical: space.sm, borderRadius: radius.lg, alignItems: 'center', backgroundColor: on ? palette.primary : palette.card, borderWidth: 1, borderColor: on ? palette.primary : palette.border }}>
              <AppText variant="caption" align="center" style={{ color: on ? palette.onPrimary : palette.textMuted }}>
                {weekday(d, code)}
              </AppText>
              <AppText variant="bodyLarge" weight="bold" align="center" style={{ color: on ? palette.onPrimary : palette.text }}>
                {Number(d.slice(8))}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <AppText weight="semibold">{t('fac.time')}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {slots.map((s) => {
          const on = s === slot;
          const busy = taken.has(s);
          return (
            <Pressable
              key={s}
              disabled={busy}
              onPress={() => setSlot(s)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: busy }}
              style={{ width: '31%', flexGrow: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', borderWidth: 1.5, borderColor: on ? palette.primary : palette.border, backgroundColor: on ? palette.primarySoft : busy ? palette.surfaceStrong : palette.card }}>
              <AppText variant="small" weight={on ? 'semibold' : 'medium'} align="center" tone={on ? 'primary' : busy ? 'muted' : 'default'} style={busy ? { textDecorationLine: 'line-through' } : undefined}>
                {s}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText weight="medium" style={{ flex: 1 }}>
          {t('fac.guests')}
        </AppText>
        {[
          { icon: IconMinus, label: t('fac.fewer'), change: -1 },
          { icon: IconPlus, label: t('fac.more'), change: 1 },
        ].map((b, i) => (
          <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            {i === 1 ? (
              <AppText variant="bodyLarge" weight="bold" style={{ minWidth: 24 }} align="center">
                {guests}
              </AppText>
            ) : null}
            <Pressable
              onPress={() => setGuests(Math.min(facility.capacity, Math.max(1, guests + b.change)))}
              accessibilityRole="button"
              accessibilityLabel={b.label}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: pressed ? palette.primarySoft : palette.surfaceStrong, alignItems: 'center', justifyContent: 'center', marginStart: i === 1 ? space.md : 0 })}>
              <b.icon size={18} color={palette.primary} />
            </Pressable>
          </View>
        ))}
      </Card>
    </Page>
  );
}
