import { IconCheck, IconCircleCheck, IconPhoto } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Platform, View } from 'react-native';

import { acceptMyInspection, getMyInspection, getMyInspectionPhotoUri, getMyInspections } from '@/api/my';
import type { InspectionDto, InspectionType } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Details, Empty, Field, Pill, Segmented } from '@/components/ui';
import { useLease } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, num, omr } from '@/lib/format';
import {
  byArea,
  CONDITION_ACCENT,
  CONDITION_LABEL,
  itemName,
  STATUS_ACCENT,
  STATUS_LABEL,
  usePhotoUris,
} from '@/lib/inspections';
import { moveIn, moveOutSteps, type Condition, type MoveOutStep } from '@/mock/data';
import { useMockState } from '@/mock/store';
import { radius, space, usePalette, type Accent } from '@/theme/tokens';

const mockConditionAccent: Record<Condition, Accent> = {
  good: 'success',
  fair: 'warning',
  damaged: 'danger',
};

/** The live steps: utility clearance is not tracked in the system, so it is left out. */
const LIVE_STEPS: MoveOutStep[] = ['notice', 'inspection', 'handover', 'refund'];

type Reports = { in: InspectionDto | null; out: InspectionDto | null };

/** The tenant's latest move-in and move-out reports (the list comes newest first), with their checklists. */
async function loadReports(): Promise<Reports> {
  const list = await getMyInspections();
  const latest = (type: InspectionType) => {
    const found = list.find((i) => i.type === type);
    return found ? getMyInspection(found.id) : Promise.resolve(null);
  };
  const [moveInReport, moveOutReport] = await Promise.all([latest('MoveIn'), latest('MoveOut')]);
  return { in: moveInReport, out: moveOutReport };
}

/** Moving in and out: the handover and inspection on arrival, and the steps from notice to deposit refund on leaving. */
export default function MoveInOut() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const { isDemo } = useAppSession();
  const { moveOutRequested } = useMockState();
  const { lease, depositInfo } = useLease();
  const [tab, setTab] = useState<'in' | 'out'>(moveOutRequested ? 'out' : 'in');

  const [reports, setReports] = useState<Reports>({ in: null, out: null });
  const [loading, setLoading] = useState(!isDemo);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    loadReports()
      .then((r) => {
        if (!cancelled) setReports(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.errorLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo, t]);

  const reload = (asRefresh: boolean) => {
    if (isDemo) return;
    (asRefresh ? setRefreshing : setLoading)(true);
    loadReports()
      .then((r) => {
        setReports(r);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t('common.errorLoad')))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  // Where the move-out stands: sample progress in the demo, otherwise the lease, its move-out report and its deposit.
  const out = reports.out;
  const completed = out?.status === 'Completed';
  const noticeGiven = isDemo ? Boolean(moveOutRequested) : Boolean(out) || lease.status === 'NoticePeriod';
  const steps = isDemo ? moveOutSteps : LIVE_STEPS;
  const reached = isDemo
    ? noticeGiven ? 1 : 0
    : !noticeGiven ? 0 : depositInfo.refunded ? steps.length : completed ? 3 : 1;
  const deductions = isDemo ? 0 : (out?.chargeTotal ?? 0);
  const caption = (step: MoveOutStep, done: boolean) => {
    if (isDemo) return done && moveOutRequested ? longDate(moveOutRequested, code) : t(`move.outHint.${step}`);
    const date = step === 'inspection' ? out?.scheduledAtUtc : step === 'handover' ? out?.completedAtUtc : null;
    return date ? longDate(date, code) : t(`move.outHint.${step}`);
  };
  const refundDue = completed
    ? omr(Math.max(0, depositInfo.amount - deductions), code, true)
    : t(noticeGiven ? 'move.afterHandover' : 'move.notStarted');

  return (
    <Page
      title={t('move.title')}
      loading={loading}
      error={error}
      onRetry={() => reload(false)}
      refreshing={refreshing}
      onRefresh={isDemo ? undefined : () => reload(true)}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'in', label: t('move.moveIn') },
          { value: 'out', label: t('move.moveOut') },
        ]}
      />

      {tab === 'in' ? (
        isDemo ? (
          <SampleMoveIn />
        ) : reports.in ? (
          <Report key={reports.in.id} inspection={reports.in} onChange={(r) => setReports((p) => ({ ...p, in: r }))} />
        ) : (
          <Empty icon={IconCircleCheck} title={t('move.noMoveIn')} />
        )
      ) : (
        <>
          <Steps steps={steps} reached={reached} active={noticeGiven} caption={caption} />
          {out ? (
            <Report key={out.id} inspection={out} onChange={(r) => setReports((p) => ({ ...p, out: r }))} />
          ) : null}
          <Details
            title={t('move.depositStatus')}
            rows={[
              [t('lease.depositHeld'), omr(depositInfo.amount, code, true)],
              [t('lease.deductions'), omr(deductions, code, true)],
              [t('move.refundDue'), refundDue],
            ]}
          />
          {!noticeGiven ? (
            <Button label={t('move.giveNotice')} onPress={() => router.push('/lease/termination')} />
          ) : null}
        </>
      )}
    </Page>
  );
}

/** The move-out tracker: steps before `reached` are done, the one at `reached` is under way once notice is given. */
function Steps({
  steps,
  reached,
  active,
  caption,
}: {
  steps: MoveOutStep[];
  reached: number;
  active: boolean;
  caption: (step: MoveOutStep, done: boolean) => string;
}) {
  const { t } = useTranslation();
  const palette = usePalette();
  return (
    <Card>
      <AppText weight="semibold">{t('move.steps')}</AppText>
      {steps.map((step, i) => {
        const done = i < reached;
        const current = i === reached && active;
        return (
          <View key={step} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? palette.success : current ? palette.primary : palette.surfaceStrong,
              }}>
              {done ? (
                <IconCheck size={14} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <AppText
                  variant="caption"
                  weight="bold"
                  align="center"
                  style={{ color: current ? palette.onPrimary : palette.textMuted }}>
                  {i + 1}
                </AppText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight={current ? 'semibold' : 'medium'} tone={done || current ? 'default' : 'secondary'}>
                {t(`move.out.${step}`)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {caption(step, done)}
              </AppText>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

/** The demo's sample move-in handover. */
function SampleMoveIn() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  return (
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
          <View
            key={item.area}
            style={{ paddingVertical: space.md, borderTopWidth: 1, borderTopColor: palette.border, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="small" weight="medium" style={{ flex: 1 }}>
                {t(`move.areas.${item.area}`)}
              </AppText>
              <Pill label={t(`move.condition.${item.condition}`)} accent={mockConditionAccent[item.condition]} />
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
  );
}

/** One move-in or move-out report: its booked date until it is completed, then the full report and Accept. */
function Report({ inspection, onChange }: { inspection: InspectionDto; onChange: (updated: InspectionDto) => void }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const photoUris = usePhotoUris(inspection.items, getMyInspectionPhotoUri);
  const [comment, setComment] = useState('');
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      onChange(await acceptMyInspection(inspection.id, comment.trim() || undefined));
      setComment('');
      if (Platform.OS === 'web') window.alert(t('move.acceptedToast'));
      else Alert.alert(t('move.accept'), t('move.acceptedToast'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.errorLoad');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('move.accept'), msg);
    } finally {
      setAccepting(false);
    }
  };

  if (inspection.status !== 'Completed') {
    return (
      <Card style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText weight="semibold">{t('move.scheduledFor', { date: longDate(inspection.scheduledAtUtc, code) })}</AppText>
          <Pill label={t(STATUS_LABEL[inspection.status])} accent={STATUS_ACCENT[inspection.status]} />
        </View>
        <AppText variant="caption" tone="muted">
          {t('move.scheduledHint', { date: longDate(inspection.scheduledAtUtc, code) })}
        </AppText>
        {inspection.inspectorName ? (
          <AppText variant="caption" tone="secondary" style={{ marginTop: space.xs }}>
            {t('inspection.inspector')}: {inspection.inspectorName}
          </AppText>
        ) : null}
      </Card>
    );
  }

  const handoverRows: [string, string][] = [];
  if (inspection.keysCount != null) handoverRows.push([t('move.keys'), num(inspection.keysCount, code)]);
  if (inspection.accessCardsCount != null) handoverRows.push([t('move.cards'), num(inspection.accessCardsCount, code)]);
  if (inspection.parkingRemotesCount) handoverRows.push([t('move.remotes'), num(inspection.parkingRemotesCount, code)]);
  if (inspection.mailboxKeysCount) handoverRows.push([t('move.mailboxKeys'), num(inspection.mailboxKeysCount, code)]);
  if (inspection.electricityReading != null)
    handoverRows.push([t('move.electricityMeter'), `${num(inspection.electricityReading, code)} kWh`]);
  if (inspection.waterReading != null) handoverRows.push([t('move.waterMeter'), `${num(inspection.waterReading, code)} m³`]);
  if (inspection.chillerReading != null)
    handoverRows.push([t('move.chillerMeter'), `${num(inspection.chillerReading, code)} kWh`]);

  return (
    <>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <IconCircleCheck size={36} color={palette.success} strokeWidth={1.6} />
        <View style={{ flex: 1 }}>
          <AppText weight="semibold">{t('move.handoverDone')}</AppText>
          <AppText variant="caption" tone="muted">
            {inspection.completedAtUtc
              ? t('move.handoverOn', {
                  date: longDate(inspection.completedAtUtc, code),
                  name: inspection.completedByName || inspection.inspectorName || '',
                })
              : t(STATUS_LABEL.Completed)}
          </AppText>
        </View>
        <Pill label={t(STATUS_LABEL.Completed)} accent={STATUS_ACCENT.Completed} />
      </Card>

      {handoverRows.length > 0 && <Details title={t('move.handover')} rows={handoverRows} />}

      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <AppText weight="semibold" style={{ paddingVertical: space.sm }}>
          {t('move.checklist')}
        </AppText>
        {byArea(t, inspection.items).map(([areaName, items]) => (
          <View key={areaName} style={{ marginBottom: space.sm }}>
            <AppText variant="small" weight="bold" tone="primary" style={{ marginVertical: space.xs }}>
              {areaName}
            </AppText>
            {items.map((item) => (
              <View
                key={item.id}
                style={{ paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: palette.border, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText variant="small" weight="medium" style={{ flex: 1 }}>
                    {itemName(t, item)}
                  </AppText>
                  <Pill label={t(CONDITION_LABEL[item.condition])} accent={CONDITION_ACCENT[item.condition]} />
                </View>
                {item.note ? (
                  <AppText variant="caption" tone="secondary">
                    {item.note}
                  </AppText>
                ) : null}
                {item.chargeAmount ? (
                  <AppText variant="caption" tone="danger" weight="medium">
                    {t('inspection.charge')}: {omr(item.chargeAmount, code, true)}
                  </AppText>
                ) : null}
                {item.photos.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: 4 }}>
                    {item.photos.map((p) =>
                      photoUris[p.id] ? (
                        <Image
                          key={p.id}
                          source={{ uri: photoUris[p.id] }}
                          style={{ width: 64, height: 64, borderRadius: radius.sm }}
                        />
                      ) : (
                        <View
                          key={p.id}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: radius.sm,
                            backgroundColor: palette.surfaceStrong,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <IconPhoto size={20} color={palette.textMuted} />
                        </View>
                      ),
                    )}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </Card>

      {inspection.summary ? (
        <Card style={{ gap: space.xs }}>
          <AppText weight="semibold">{t('move.summary')}</AppText>
          <AppText variant="small" tone="secondary">
            {inspection.summary}
          </AppText>
        </Card>
      ) : null}

      {inspection.tenantAcceptedAtUtc ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <IconCircleCheck size={32} color={palette.success} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">
              {t('move.youAccepted', { date: longDate(inspection.tenantAcceptedAtUtc, code) })}
            </AppText>
            {inspection.tenantComment ? (
              <AppText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                &ldquo;{inspection.tenantComment}&rdquo;
              </AppText>
            ) : null}
          </View>
        </Card>
      ) : inspection.canAccept ? (
        <Card style={{ gap: space.sm }}>
          <View style={{ gap: 2 }}>
            <AppText weight="semibold">{t('move.accept')}</AppText>
            <AppText variant="caption" tone="muted">
              {t('move.acceptHint')}
            </AppText>
          </View>
          <Field
            label={t('move.commentPlaceholder')}
            placeholder={t('move.commentPlaceholder')}
            value={comment}
            onChangeText={setComment}
          />
          <Button
            label={accepting ? t('common.loading') : t('move.accept')}
            disabled={accepting}
            onPress={() => void handleAccept()}
          />
        </Card>
      ) : null}
    </>
  );
}
