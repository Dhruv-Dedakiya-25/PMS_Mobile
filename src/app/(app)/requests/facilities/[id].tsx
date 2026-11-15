import { IconClock, IconInfoCircle, IconMinus, IconPlus, IconUsers } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';

import type { ApiFacilityBookingStatus, MyFacilitySlotDto } from '@/api/types';
import { AppText } from '@/components/app-text';
import { FacilityArt } from '@/components/art';
import { Page } from '@/components/page';
import { Button, Card, Details, Empty, Field, Note, Pill } from '@/components/ui';
import { useFacilities } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, ltr, omr, weekday } from '@/lib/format';
import { dateDaysAgo } from '@/mock/clock';
import { radius, space, usePalette, type Accent } from '@/theme/tokens';

const statusAccent: Record<ApiFacilityBookingStatus, Accent> = {
  Pending: 'warning',
  Confirmed: 'success',
  Rejected: 'danger',
  Cancelled: 'primary',
};

const statusKey: Record<ApiFacilityBookingStatus, string> = {
  Pending: 'fac.statusValues.pending',
  Confirmed: 'fac.statusValues.confirmed',
  Rejected: 'fac.statusValues.rejected',
  Cancelled: 'fac.statusValues.cancelled',
};

const slotStateKey = (s: MyFacilitySlotDto): 'free' | 'pending' | 'booked' | 'past' => {
  if (s.isAvailable) return 'free';
  if (s.isPast) return 'past';
  if (s.bookingStatus === 'Pending') return 'pending';
  return 'booked';
};

/** A facility's page: its details, then a day, a free slot and the number of guests to book it. */
export default function FacilityBooking() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { id, booking: bookingId } = useLocalSearchParams<{ id: string; booking?: string }>();
  const {
    isDemo,
    facilities,
    bookings,
    loadAvailability,
    bookFacility,
    cancel,
    loading,
    error,
    refresh,
  } = useFacilities();

  const facility = facilities.find((f) => f.id === id) ?? (isDemo ? facilities[0] : undefined);
  const existing = bookings.find((b) => b.id === bookingId);
  const code = language.code;

  const days = useMemo(
    () => Array.from({ length: isDemo ? 7 : 31 }, (_, d) => dateDaysAgo(-d)),
    [isDemo],
  );
  const [date, setDate] = useState(days[isDemo ? 1 : 0]);
  const [slots, setSlots] = useState<MyFacilitySlotDto[]>([]);
  const [loadedSlotKey, setLoadedSlotKey] = useState('');
  const [startTime, setStartTime] = useState<string>();
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const currentSlotKey = !existing && facility?.id && date ? `${facility.id}:${date}` : '';
  const loadingSlots = Boolean(currentSlotKey) && loadedSlotKey !== currentSlotKey;

  const selectedSlot = useMemo(
    () => slots.find((s) => s.startTime === startTime && s.isAvailable),
    [slots, startTime],
  );

  useEffect(() => {
    if (!currentSlotKey || !facility?.id || !date) {
      return;
    }
    let active = true;
    loadAvailability(facility.id, date)
      .then((res) => {
        if (!active) return;
        setSlots(res);
        setLoadedSlotKey(currentSlotKey);
        setStartTime((prev) => {
          if (prev && res.some((s) => s.startTime === prev && s.isAvailable)) return prev;
          return res.find((s) => s.isAvailable)?.startTime;
        });
      })
      .catch((e) => {
        if (!active) return;
        setSlots([]);
        setLoadedSlotKey(currentSlotKey);
        const reason = e instanceof Error ? e.message : t('common.errorLoad');
        if (Platform.OS === 'web') window.alert(reason);
        else Alert.alert(t('common.errorLoad'), reason);
      });
    return () => {
      active = false;
    };
  }, [currentSlotKey, facility?.id, date, loadAvailability, t]);

  const showRefusal = (title: string, e: unknown) => {
    const reason = e instanceof Error ? e.message : '';
    if (Platform.OS === 'web') window.alert(reason || title);
    else Alert.alert(title, reason || undefined);
  };

  const doCancel = async () => {
    if (!existing) return;
    setCancelling(true);
    try {
      await cancel(existing.id);
      router.back();
    } catch (e) {
      showRefusal(t('fac.cancelBooking'), e);
    } finally {
      setCancelling(false);
    }
  };

  const confirmCancel = () => {
    if (!existing) return;
    if (isDemo) {
      void doCancel();
      return;
    }
    const title = t('fac.cancelTitle', { number: existing.number });
    const body = t('fac.cancelTenantHint');
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${body}`)) void doCancel();
      return;
    }
    Alert.alert(title, body, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('fac.cancelBooking'), style: 'destructive', onPress: () => void doCancel() },
    ]);
  };

  const submitBooking = async () => {
    if (!facility || !selectedSlot) return;
    setSaving(true);
    try {
      const created = await bookFacility({
        facilityId: facility.id,
        date,
        startTime: selectedSlot.startTime,
        slotLabel: selectedSlot.label,
        guests,
        notes: notes.trim() || undefined,
      });
      router.replace({
        pathname: '/done',
        params: {
          kind: 'booking',
          status: created.status,
          ref: `${created.number} · ${facility.name} · ${longDate(date, code)} · ${selectedSlot.label}`,
        },
      });
    } catch (e) {
      showRefusal(t('fac.book'), e);
    } finally {
      setSaving(false);
    }
  };

  const header = facility ? (
    <>
      <FacilityArt kind={facility.kind} width="100%" height={170} rounded={radius.xl} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" weight="bold">
            {facility.name}
          </AppText>
          <AppText tone="secondary">{facility.location}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: space.xs }}>
          <Pill
            label={facility.fee ? t('fac.perSlot', { amount: omr(facility.fee, code) }) : t('common.free')}
            accent={facility.fee ? 'primary' : 'success'}
          />
          <Pill
            label={facility.requiresApproval ? t('fac.requiresApproval') : t('fac.instantBooking')}
            accent={facility.requiresApproval ? 'warning' : 'success'}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconClock size={16} color={palette.textMuted} />
          <AppText variant="small" tone="secondary">
            {ltr(`${facility.opens}–${facility.closes}`)} · {facility.slotMinutes} {t('fac.min')}
          </AppText>
        </View>
        {facility.capacity > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconUsers size={16} color={palette.textMuted} />
            <AppText variant="small" tone="secondary">
              {t('fac.capacity', { count: facility.capacity })}
            </AppText>
          </View>
        ) : null}
      </View>
    </>
  ) : existing ? (
    <View style={{ gap: 4 }}>
      <AppText variant="title" weight="bold">
        {existing.facilityName}
      </AppText>
      <AppText tone="secondary">{ltr(existing.number)}</AppText>
    </View>
  ) : null;

  if (existing) {
    return (
      <Page
        title={t('fac.booking')}
        footer={
          existing.canCancel ? (
            <Button
              label={t('fac.cancelBooking')}
              tone="danger"
              disabled={cancelling}
              onPress={confirmCancel}
            />
          ) : undefined
        }
      >
        {header}
        <Details
          rows={[
            [t('fac.reference'), ltr(existing.number)],
            [t('fac.date'), `${weekday(existing.date, code)}, ${longDate(existing.date, code)}`],
            [t('fac.time'), ltr(existing.slot)],
            [t('fac.guests'), String(existing.guests)],
            [t('fac.fee'), existing.fee ? omr(existing.fee, code) : t('common.free')],
            [
              t('fac.status'),
              <Pill
                key="s"
                label={t(statusKey[existing.status])}
                accent={statusAccent[existing.status] ?? 'primary'}
              />,
            ],
            ...(existing.notes ? ([[t('fac.notes'), existing.notes]] as [string, string][]) : []),
            ...(existing.reason ? ([[t('fac.reason'), existing.reason]] as [string, string][]) : []),
          ]}
        />
      </Page>
    );
  }

  if (!facility) {
    return (
      <Page title={t('fac.book')} loading={loading} error={error} onRetry={() => void refresh()}>
        <Empty icon={IconClock} title={t('fac.noFacilitiesYet')} />
      </Page>
    );
  }

  const maxGuests = facility.capacity > 0 ? facility.capacity : 50;

  return (
    <Page
      title={t('fac.book')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      footer={
        <Button
          label={facility.fee ? t('fac.bookFor', { amount: omr(facility.fee, code) }) : t('fac.book')}
          disabled={!selectedSlot || saving}
          onPress={() => void submitBooking()}
        />
      }
    >
      {header}

      <AppText weight="semibold">{t('fac.date')}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm }}
        style={{ flexGrow: 0 }}
      >
        {days.map((d) => {
          const on = d === date;
          return (
            <Pressable
              key={d}
              onPress={() => {
                setDate(d);
                setStartTime(undefined);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{
                width: 58,
                paddingVertical: space.sm,
                borderRadius: radius.lg,
                alignItems: 'center',
                backgroundColor: on ? palette.primary : palette.card,
                borderWidth: 1,
                borderColor: on ? palette.primary : palette.border,
              }}
            >
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
      {loadingSlots ? (
        <AppText variant="small" tone="secondary">
          {t('common.loading')}
        </AppText>
      ) : slots.length === 0 ? (
        <AppText variant="small" tone="secondary">
          {t('fac.noSlots')}
        </AppText>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {slots.map((s) => {
            const on = s.startTime === startTime && s.isAvailable;
            const busy = !s.isAvailable;
            const state = slotStateKey(s);
            return (
              <Pressable
                key={s.startTime}
                disabled={busy}
                onPress={() => setStartTime(s.startTime)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: busy }}
                style={{
                  width: '31%',
                  flexGrow: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: on ? palette.primary : palette.border,
                  backgroundColor: on ? palette.primarySoft : busy ? palette.surfaceStrong : palette.card,
                }}
              >
                <AppText
                  variant="small"
                  weight={on ? 'semibold' : 'medium'}
                  align="center"
                  tone={on ? 'primary' : busy ? 'muted' : 'default'}
                  style={busy ? { textDecorationLine: 'line-through' } : undefined}
                >
                  {ltr(s.label)}
                </AppText>
                {busy ? (
                  <AppText variant="caption" tone="muted" align="center">
                    {t(`fac.slotStatus.${state}`)}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

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
              onPress={() => setGuests(Math.min(maxGuests, Math.max(1, guests + b.change)))}
              accessibilityRole="button"
              accessibilityLabel={b.label}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: pressed ? palette.primarySoft : palette.surfaceStrong,
                alignItems: 'center',
                justifyContent: 'center',
                marginStart: i === 1 ? space.md : 0,
              })}
            >
              <b.icon size={18} color={palette.primary} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Field
        label={t('fac.notes')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('fac.notesPlaceholder')}
      />

      {facility.fee > 0 || facility.requiresApproval ? (
        <Note
          icon={IconInfoCircle}
          text={[
            facility.fee > 0 ? t('fac.officeFeeNote') : '',
            facility.requiresApproval ? t('fac.approvalNote') : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : null}
    </Page>
  );
}
