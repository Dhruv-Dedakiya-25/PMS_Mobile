import { IconClockHour4, IconInfoCircle } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Details, Field, Note, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, omr } from '@/lib/format';
import { lease } from '@/mock/data';
import { requestRenewal, useMockState } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

/** Asks to keep the home for another term, at the rent the escalation clause sets. */
export default function Renewal() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const { renewal } = useMockState();
  const [years, setYears] = useState<'1' | '2'>('1');
  const [note, setNote] = useState('');
  const code = language.code;
  const newRent = Math.round(lease.rent * (1 + lease.escalationPercent / 100));

  if (renewal === 'requested')
    return (
      <Page title={t('lease.renewal')}>
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <IconClockHour4 size={48} color={palette.orange} strokeWidth={1.5} />
          <AppText variant="bodyLarge" weight="semibold" align="center">
            {t('lease.renewalWaiting')}
          </AppText>
          <AppText variant="small" tone="secondary" align="center">
            {t('lease.renewalWaitingDetail')}
          </AppText>
          <Pill label={t('lease.renewalStatus.requested')} accent="orange" />
        </Card>
      </Page>
    );

  return (
    <Page
      title={t('lease.renewal')}
      footer={
        <Button
          label={t('lease.sendRenewal')}
          onPress={() => {
            requestRenewal();
            router.replace({ pathname: '/done', params: { kind: 'renewal', ref: 'REN-2026-0031' } });
          }}
        />
      }>
      <Note icon={IconInfoCircle} text={t('lease.renewalIntro', { date: longDate(lease.end, code), count: daysUntil(lease.end) })} accent="warning" />
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
          [t('lease.escalation'), t('lease.escalationDetail', { percent: lease.escalationPercent })],
          [t('lease.newEnd'), longDate(`${Number(lease.end.slice(0, 4)) + Number(years)}${lease.end.slice(4)}`, code)],
        ]}
      />
      <Field label={t('lease.noteToManager')} value={note} onChangeText={setNote} multiline placeholder={t('lease.notePlaceholder')} />
    </Page>
  );
}
