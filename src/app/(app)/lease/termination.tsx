import { IconAlertTriangle } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Page } from '@/components/page';
import { Button, Details, Field, Note, Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import { dateDaysAgo } from '@/mock/clock';
import { lease } from '@/mock/data';
import { requestMoveOut } from '@/mock/store';

type Reason = 'relocating' | 'buying' | 'job' | 'size' | 'other';

/** Gives notice to leave: the move-out date, which the notice period bounds, and why. */
export default function Termination() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  // The earliest date the notice period allows, then the month-ends after it.
  const earliest = dateDaysAgo(-lease.noticeDays);
  const dates = [earliest, ...[1, 2, 3].map((m) => {
    const d = new Date(`${earliest.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + m + 1, 0);
    return d.toISOString().slice(0, 10);
  })];
  const [date, setDate] = useState<string>();
  const [reason, setReason] = useState<Reason>();
  const [note, setNote] = useState('');

  return (
    <Page
      title={t('lease.termination')}
      footer={
        <Button
          label={t('lease.sendNotice')}
          disabled={!date || !reason}
          onPress={() => {
            requestMoveOut();
            router.replace({ pathname: '/done', params: { kind: 'moveOut', ref: 'TRM-2026-0012' } });
          }}
        />
      }>
      <Note icon={IconAlertTriangle} accent="warning" text={t('lease.noticeRule', { count: lease.noticeDays, date: longDate(earliest, code) })} />
      <Select label={t('lease.moveOutDate')} placeholder={t('lease.chooseDate')} value={date} onChange={setDate} options={dates.map((d) => ({ value: d, label: longDate(d, code) }))} />
      <Select
        label={t('lease.reason')}
        placeholder={t('lease.chooseReason')}
        value={reason}
        onChange={setReason}
        options={(['relocating', 'buying', 'job', 'size', 'other'] as Reason[]).map((r) => ({ value: r, label: t(`lease.reasons.${r}`) }))}
      />
      <Field label={t('lease.noteToManager')} value={note} onChangeText={setNote} multiline placeholder={t('lease.notePlaceholder')} />
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
