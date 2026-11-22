import { IconAlertTriangle, IconCircleCheck, IconClockHour4, IconInfoCircle } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Details, Field, Note, Pill, Select } from '@/components/ui';
import type { ApiMoveOutReason } from '@/api/types';
import { useLeaseRequests } from '@/hooks/use-resident';
import { useLease } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import { dateDaysAgo } from '@/mock/clock';
import { space, usePalette } from '@/theme/tokens';

type Reason = 'relocating' | 'buying' | 'job' | 'size' | 'other';
const REASONS: Reason[] = ['relocating', 'buying', 'job', 'size', 'other'];
const API_REASON: Record<Reason, ApiMoveOutReason> = { relocating: 'Relocating', buying: 'Buying', job: 'Job', size: 'Size', other: 'Other' };

/** Gives notice to leave: a move-out date the notice period allows, before the lease ends, and why. */
export default function Termination() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const code = language.code;
  const { lease, loading, error, refresh } = useLease();
  const requests = useLeaseRequests();
  // The earliest date the notice period allows, then the month-ends after it, none past the lease's end.
  const earliest = dateDaysAgo(-Math.max(1, lease.noticeDays));
  const dates = [earliest, ...[1, 2, 3].map((m) => {
    const d = new Date(`${earliest.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + m, 0);
    return d.toISOString().slice(0, 10);
  })].filter((d, i, all) => d >= earliest && d <= lease.end && all.indexOf(d) === i);
  const [date, setDate] = useState<string>();
  const [reason, setReason] = useState<Reason>();
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { notice, renewal } = requests;

  const send = async () => {
    if (!date || !reason) return;
    setSending(true);
    setFailure(null);
    try {
      const ref = await requests.sendNotice(date, API_REASON[reason], note);
      router.replace({ pathname: '/done', params: { kind: 'moveOut', ref } });
    } catch (e) {
      setFailure(e instanceof Error ? e.message : t('common.errorLoad'));
    } finally {
      setSending(false);
    }
  };

  const pageProps = {
    title: t('lease.termination'),
    loading: loading || requests.loading,
    error: error ?? requests.error,
    onRetry: () => Promise.all([refresh(), requests.refresh()]),
  };

  if (notice && notice.status !== 'Declined') {
    const accepted = notice.status === 'Accepted';
    return (
      <Page {...pageProps}>
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          {accepted ? (
            <IconCircleCheck size={48} color={palette.success} strokeWidth={1.5} />
          ) : (
            <IconClockHour4 size={48} color={palette.orange} strokeWidth={1.5} />
          )}
          <AppText variant="bodyLarge" weight="semibold" align="center">
            {t(accepted ? 'lease.noticeAccepted' : 'lease.noticeWaiting')}
          </AppText>
          {notice.moveOutDate ? (
            <AppText variant="small" tone="secondary" align="center">
              {t('lease.moveOutOn', { date: longDate(notice.moveOutDate.slice(0, 10), code) })}
            </AppText>
          ) : null}
          {!accepted ? (
            <AppText variant="small" tone="secondary" align="center">
              {t('lease.requestWaitingDetail')}
            </AppText>
          ) : null}
          <Pill label={notice.requestNumber} accent={accepted ? 'success' : 'orange'} />
        </Card>
      </Page>
    );
  }

  if (renewal?.status === 'Pending') {
    return (
      <Page {...pageProps}>
        <Note icon={IconInfoCircle} accent="warning" text={t('lease.requestPending')} />
      </Page>
    );
  }

  return (
    <Page {...pageProps} footer={<Button label={t('lease.sendNotice')} disabled={!date || !reason || sending} onPress={send} />}>
      <Note icon={IconAlertTriangle} accent="warning" text={t('lease.noticeRule', { count: lease.noticeDays, date: longDate(earliest, code) })} />
      {notice?.status === 'Declined' ? (
        <Note icon={IconInfoCircle} accent="danger" text={t('lease.lastDeclined', { reason: notice.response ?? '' })} />
      ) : null}
      {dates.length === 0 ? <Note icon={IconInfoCircle} accent="danger" text={t('lease.noNoticeDates', { date: longDate(lease.end, code) })} /> : null}
      <Select label={t('lease.moveOutDate')} placeholder={t('lease.chooseDate')} value={date} onChange={setDate} options={dates.map((d) => ({ value: d, label: longDate(d, code) }))} />
      <Select
        label={t('lease.reason')}
        placeholder={t('lease.chooseReason')}
        value={reason}
        onChange={setReason}
        options={REASONS.map((r) => ({ value: r, label: t(`lease.reasons.${r}`) }))}
      />
      <Field label={t('lease.noteToManager')} value={note} onChangeText={setNote} multiline placeholder={t('lease.notePlaceholder')} />
      {failure ? <Note icon={IconInfoCircle} accent="danger" text={failure} /> : null}
      <Details
        title={t('lease.whatHappensNext')}
        rows={[
          [t('lease.inspection'), t('lease.inspectionWhen')],
          [t('lease.deposit'), t('lease.depositRefund', { amount: omr(lease.deposit, code) })],
        ]}
      />
    </Page>
  );
}
