import { IconCheck, IconCircleCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Details, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, num, omr } from '@/lib/format';
import { lease, moveIn, moveOutSteps, type Condition } from '@/mock/data';
import { useMockState } from '@/mock/store';
import { space, usePalette, type Accent } from '@/theme/tokens';

const conditionAccent: Record<Condition, Accent> = { good: 'success', fair: 'warning', damaged: 'danger' };

/** Moving in and out: the handover and inspection on arrival, and the steps from notice to deposit refund on leaving. */
export default function MoveInOut() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { moveOutRequested } = useMockState();
  const [tab, setTab] = useState<'in' | 'out'>(moveOutRequested ? 'out' : 'in');
  const code = language.code;
  // Once notice is given, the first step is done and the inspection is next.
  const reached = moveOutRequested ? 1 : 0;

  return (
    <Page title={t('move.title')}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'in', label: t('move.moveIn') },
          { value: 'out', label: t('move.moveOut') },
        ]}
      />

      {tab === 'in' ? (
        <>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconCircleCheck size={36} color={palette.success} strokeWidth={1.6} />
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{t('move.handoverDone')}</AppText>
              <AppText variant="caption" tone="muted">
                {t('move.handoverOn', { date: longDate(moveIn.date, code), name: moveIn.inspectedBy })}
              </AppText>
            </View>
          </Card>
          <Details
            title={t('move.handover')}
            rows={[
              [t('move.keys'), num(moveIn.keys, code)],
              [t('move.cards'), num(moveIn.accessCards, code)],
              [t('move.electricityMeter'), `${num(moveIn.meters.electricity, code)} kWh`],
              [t('move.waterMeter'), `${num(moveIn.meters.water, code)} m³`],
            ]}
          />
          <Card style={{ gap: 0, paddingVertical: space.xs }}>
            <AppText weight="semibold" style={{ paddingVertical: space.sm }}>
              {t('move.checklist')}
            </AppText>
            {moveIn.checklist.map((item) => (
              <View key={item.area} style={{ paddingVertical: space.md, borderTopWidth: 1, borderTopColor: palette.border, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText variant="small" weight="medium" style={{ flex: 1 }}>
                    {t(`move.areas.${item.area}`)}
                  </AppText>
                  <Pill label={t(`move.condition.${item.condition}`)} accent={conditionAccent[item.condition]} />
                </View>
                {'note' in item && item.note ? (
                  <AppText variant="caption" tone="muted">
                    {item.note}
                  </AppText>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : (
        <>
          <Card>
            <AppText weight="semibold">{t('move.steps')}</AppText>
            {moveOutSteps.map((step, i) => {
              const done = i < reached;
              const current = i === reached && !!moveOutRequested;
              return (
                <View key={step} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? palette.success : current ? palette.primary : palette.surfaceStrong }}>
                    {done ? (
                      <IconCheck size={14} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <AppText variant="caption" weight="bold" align="center" style={{ color: current ? palette.onPrimary : palette.textMuted }}>
                        {i + 1}
                      </AppText>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight={current ? 'semibold' : 'medium'} tone={done || current ? 'default' : 'secondary'}>
                      {t(`move.out.${step}`)}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {done && moveOutRequested ? longDate(moveOutRequested, code) : t(`move.outHint.${step}`)}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </Card>
          <Details
            title={t('move.depositStatus')}
            rows={[
              [t('lease.depositHeld'), omr(lease.deposit, code, true)],
              [t('lease.deductions'), omr(0, code, true)],
              [t('move.refundDue'), t(moveOutRequested ? 'move.afterHandover' : 'move.notStarted')],
            ]}
          />
          {!moveOutRequested ? <Button label={t('move.giveNotice')} onPress={() => router.push('/lease/termination')} /> : null}
        </>
      )}
    </Page>
  );
}
