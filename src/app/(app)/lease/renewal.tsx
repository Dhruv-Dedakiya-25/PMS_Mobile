import { IconCircleCheck, IconClockHour4, IconInfoCircle } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Details, Field, Note, Pill, Segmented } from '@/components/ui';
import { useLeaseRequests } from '@/hooks/use-resident';
import { useLease } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, omr } from '@/lib/format';
import { space, usePalette } from '@/theme/tokens';

/** Asks to keep the home for another term, at the rent the escalation sets. The office answers on the lease page. */
export default function Renewal() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const { lease, loading, error, refresh } = useLease();
  const requests = useLeaseRequests();
  const [years, setYears] = useState<'1' | '2'>('1');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const code = language.code;
  const newRent = Math.round(lease.rent * (1 + lease.escalationPercent / 100) * 1000) / 1000;
  const { renewal, notice } = requests;

  const send = async () => {
    setSending(true);
    setFailure(null);
    try {
      const ref = await requests.askRenewal(years === '2' ? 2 : 1, note);
      router.replace({ pathname: '/done', params: { kind: 'renewal', ref } });
    } catch (e) {
      setFailure(e instanceof Error ? e.message : t('common.errorLoad'));
    } finally {
      setSending(false);
    }
  };

  const pageProps = {
    title: t('lease.renewal'),
    loading: loading || requests.loading,
    error: error ?? requests.error,
    onRetry: () => Promise.all([refresh(), requests.refresh()]),
  };

  if (renewal && renewal.status !== 'Declined') {
    const accepted = renewal.status === 'Accepted';
    return (
      <Page {...pageProps}>
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          {accepted ? (
            <IconCircleCheck size={48} color={palette.success} strokeWidth={1.5} />
          ) : (
            <IconClockHour4 size={48} color={palette.orange} strokeWidth={1.5} />
          )}
          <AppText variant="bodyLarge" weight="semibold" align="center">
            {t(accepted ? 'lease.renewalAccepted' : 'lease.renewalWaiting')}
          </AppText>
          <AppText variant="small" tone="secondary" align="center">
            {accepted ? t('lease.renewalAcceptedDetail') : t('lease.requestWaitingDetail')}
          </AppText>
          {renewal.response ? (
            <AppText variant="small" align="center">
              “{renewal.response}”
            </AppText>
          ) : null}
          <Pill label={`${renewal.requestNumber} · ${t(`lease.renewalStatus.${accepted ? 'renewed' : 'requested'}`)}`} accent={accepted ? 'success' : 'orange'} />
        </Card>
      </Page>
    );
  }

  // Notice given, or waiting for an answer: the lease cannot be renewed as well.
  if (notice && notice.status !== 'Declined') {
    return (
      <Page {...pageProps}>
        <Note icon={IconInfoCircle} accent="warning" text={t(notice.status === 'Pending' ? 'lease.requestPending' : 'lease.noticeGiven')} />
      </Page>
    );
  }

  return (
    <Page {...pageProps} footer={<Button label={t('lease.sendRenewal')} disabled={sending} onPress={send} />}>
      <Note icon={IconInfoCircle} text={t('lease.renewalIntro', { date: longDate(lease.end, code), count: Math.max(0, daysUntil(lease.end)) })} accent="warning" />
      {renewal?.status === 'Declined' ? (
        <Note icon={IconInfoCircle} accent="danger" text={t('lease.lastDeclined', { reason: renewal.response ?? '' })} />
      ) : null}
      <View style={{ gap: space.sm }}>
        <AppText variant="small" weight="medium" tone="secondary">
          {t('lease.newTerm')}
        </AppText>
        <Segmented
          value={years}
          onChange={setYears}
          options={[
            { value: '1', label: t('lease.years', { count: 1 }) },
            { value: '2', label: t('lease.years', { count: 2 }) },
          ]}
        />
      </View>
      <Details
        rows={[
          [t('lease.currentRent'), omr(lease.rent, code)],
          [t('lease.newRent'), omr(newRent, code)],
          [t('lease.escalation'), lease.escalationPercent > 0 ? t('lease.escalationOnRenewal', { percent: lease.escalationPercent }) : '—'],
          [t('lease.newEnd'), longDate(`${Number(lease.end.slice(0, 4)) + Number(years)}${lease.end.slice(4)}`, code)],
        ]}
      />
      <Field label={t('lease.noteToManager')} value={note} onChangeText={setNote} multiline placeholder={t('lease.notePlaceholder')} />
      {failure ? <Note icon={IconInfoCircle} accent="danger" text={failure} /> : null}
    </Page>
  );
}
