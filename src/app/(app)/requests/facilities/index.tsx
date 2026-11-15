import { IconCalendarCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { ApiFacilityBookingStatus } from '@/api/types';
import { AppText } from '@/components/app-text';
import { FacilityArt } from '@/components/art';
import { Page } from '@/components/page';
import { Card, Chips, Empty, IconTile, Onward, Pill } from '@/components/ui';
import { type MappedBooking, useFacilities } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, ltr, omr } from '@/lib/format';
import type { FacilityKind } from '@/mock/data';
import { space, type Accent } from '@/theme/tokens';

type Filter = 'all' | FacilityKind;

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

/** The building's shared spaces to book, with the tenant's own reservations first. */
export default function Facilities() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { facilities, bookings, loading, refreshing, error, refresh } = useFacilities();
  const [filter, setFilter] = useState<Filter>('all');
  const code = language.code;

  const kinds = useMemo(
    () => Array.from(new Set(facilities.map((f) => f.kind))),
    [facilities],
  );
  const shown = useMemo(
    () => facilities.filter((f) => filter === 'all' || f.kind === filter),
    [facilities, filter],
  );
  const upcomingBookings = useMemo(
    () => bookings.filter((b) => (b.status === 'Pending' || b.status === 'Confirmed') && daysUntil(b.date) >= 0),
    [bookings],
  );
  const pastBookings = useMemo(
    () => bookings.filter((b) => !((b.status === 'Pending' || b.status === 'Confirmed') && daysUntil(b.date) >= 0)),
    [bookings],
  );

  const renderBooking = (b: MappedBooking) => {
    const f = facilities.find((x) => x.id === b.facilityId);
    return (
      <Card
        key={b.id}
        style={{ flexDirection: 'row', alignItems: 'center' }}
        onPress={() =>
          router.push({
            pathname: '/requests/facilities/[id]',
            params: { id: b.facilityId, booking: b.id },
          })
        }
      >
        <IconTile icon={IconCalendarCheck} accent={statusAccent[b.status] ?? 'primary'} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText weight="medium">{f?.name ?? b.facilityName}</AppText>
          <AppText variant="caption" tone="muted">
            {longDate(b.date, code)} · {ltr(b.slot)}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: space.xs }}>
          <Pill label={t(statusKey[b.status])} accent={statusAccent[b.status] ?? 'primary'} />
          <AppText variant="caption" tone="muted">
            {ltr(b.number)}
          </AppText>
        </View>
        <Onward />
      </Card>
    );
  };

  return (
    <Page
      title={t('fac.title')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      {kinds.length > 0 ? (
        <Chips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('common.all') },
            ...kinds.map((k) => ({ value: k, label: t(`fac.kinds.${k}`) })),
          ]}
        />
      ) : null}

      {upcomingBookings.length > 0 && filter === 'all' ? (
        <View style={{ gap: space.sm }}>
          <AppText weight="semibold">{t('fac.myBookings')}</AppText>
          {upcomingBookings.map(renderBooking)}
        </View>
      ) : null}

      {shown.length === 0 ? (
        <Empty icon={IconCalendarCheck} title={t('fac.noFacilitiesYet')} />
      ) : (
        <View style={{ gap: space.sm }}>
          {(upcomingBookings.length > 0 || pastBookings.length > 0) && filter === 'all' ? (
            <AppText weight="semibold">{t('fac.bookASpace')}</AppText>
          ) : null}
          {shown.map((f) => (
            <Card
              key={f.id}
              style={{ flexDirection: 'row', alignItems: 'center', padding: space.md }}
              onPress={() => router.push({ pathname: '/requests/facilities/[id]', params: { id: f.id } })}
            >
              <FacilityArt kind={f.kind} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' }}>
                  <AppText weight="semibold">{f.name}</AppText>
                  <Pill
                    label={f.requiresApproval ? t('fac.requiresApproval') : t('fac.instantBooking')}
                    accent={f.requiresApproval ? 'warning' : 'success'}
                  />
                </View>
                <AppText variant="caption" tone="secondary">
                  {f.location} · {ltr(`${f.opens}–${f.closes}`)} · {f.slotMinutes} {t('fac.min')}
                </AppText>
                <AppText variant="caption" weight="semibold" tone={f.fee ? 'default' : 'success'}>
                  {f.fee ? t('fac.perSlot', { amount: omr(f.fee, code) }) : t('common.free')}
                </AppText>
              </View>
              <Onward />
            </Card>
          ))}
        </View>
      )}

      {pastBookings.length > 0 && filter === 'all' ? (
        <View style={{ gap: space.sm }}>
          <AppText weight="semibold">{t('fac.pastBookings')}</AppText>
          {pastBookings.map(renderBooking)}
        </View>
      ) : null}
    </Page>
  );
}
