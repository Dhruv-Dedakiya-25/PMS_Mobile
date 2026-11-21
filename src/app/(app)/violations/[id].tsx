import { IconCircleCheck, IconFileText, IconGavel, IconHelpCircle, IconMessageReport } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';

import { getMyViolationEvidence, getMyViolationEvidenceFile, getMyViolationEvidenceImage } from '@/api/my';
import type { MyViolationEvidenceDto, ViolationAppealType } from '@/api/types';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Details, Empty, Field, Note, Pill, SectionHeader } from '@/components/ui';
import { appealAccent, violationAccent } from '@/components/violation-look';
import { useViolations, violationActions } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { openOrShareDocument } from '@/lib/document-file';
import { longDate, omr } from '@/lib/format';
import { radius, space } from '@/theme/tokens';

const isImage = (e: MyViolationEvidenceDto) => e.contentType.startsWith('image/');

/** One violation: what it was for, the office's evidence, every appeal or question and its answer, and raising a new one. */
export default function ViolationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const { isDemo, violations, appeal, loading, error, refresh, refreshing } = useViolations();
  const v = violations.find((x) => x.id === id);

  const [mode, setMode] = useState<ViolationAppealType | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<MyViolationEvidenceDto[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});

  const violationId = v?.id;
  const evidenceCount = v?.evidenceCount ?? 0;
  useEffect(() => {
    if (isDemo || !violationId || evidenceCount === 0) return;
    let cancelled = false;
    (async () => {
      const list = await getMyViolationEvidence(violationId);
      if (cancelled) return;
      setEvidence(list);
      const pictures = await Promise.all(
        list.filter(isImage).map(async (e) => [e.id, await getMyViolationEvidenceImage(e.id).catch(() => '')] as const),
      );
      if (!cancelled) setImages(Object.fromEntries(pictures.filter(([, uri]) => uri)));
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isDemo, violationId, evidenceCount]);

  const submit = async () => {
    if (!v || !mode || !reason.trim()) return;
    setSending(true);
    setFailure(null);
    try {
      await appeal(v.id, mode, reason.trim());
      setSent(true);
      setMode(null);
      setReason('');
    } catch (e) {
      setFailure(e instanceof Error ? e.message : t('common.errorLoad'));
    } finally {
      setSending(false);
    }
  };

  if (!v) {
    return (
      <Page title={t('viol.title')} loading={loading} error={error} onRetry={refresh}>
        <Empty icon={IconGavel} title={t('viol.none')} />
      </Page>
    );
  }

  const { canAppeal, canAsk } = violationActions(v);
  const footer = mode ? (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      <View style={{ flex: 1 }}>
        <Button label={t('common.cancel')} tone="outline" onPress={() => { setMode(null); setFailure(null); }} />
      </View>
      <View style={{ flex: 1 }}>
        <Button label={t('common.submit')} disabled={!reason.trim() || sending} onPress={() => void submit()} />
      </View>
    </View>
  ) : canAppeal || canAsk ? (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      {canAppeal ? (
        <View style={{ flex: 1 }}>
          <Button label={t('viol.appeal')} icon={IconMessageReport} onPress={() => { setMode('Appeal'); setSent(false); }} />
        </View>
      ) : null}
      {canAsk ? (
        <View style={{ flex: 1 }}>
          <Button label={t('viol.ask')} icon={IconHelpCircle} tone={canAppeal ? 'outline' : 'primary'} onPress={() => { setMode('Question'); setSent(false); }} />
        </View>
      ) : null}
    </View>
  ) : undefined;

  return (
    <Page title={v.violationNumber} footer={footer} refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
          <AppText variant="bodyLarge" weight="bold" style={{ flex: 1 }}>
            {v.violationType}
          </AppText>
          <Pill label={t(`viol.status.${v.status}`, { defaultValue: v.status })} accent={violationAccent[v.status] ?? 'primary'} />
        </View>
        {v.description ? <AppText tone="secondary">{v.description}</AppText> : null}
      </Card>

      <Details
        rows={[
          [t('viol.date'), longDate(v.violationDate, code)],
          [t('viol.fine'), v.fineAmount ? omr(v.fineAmount, code, true) : '—'],
        ]}
      />

      {evidenceCount > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('viol.evidence')} count={evidenceCount} />
          {Object.keys(images).length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {evidence.filter((e) => images[e.id]).map((e) => (
                <Image key={e.id} source={{ uri: images[e.id] }} accessibilityLabel={e.description || e.fileName} style={{ width: 96, height: 96, borderRadius: radius.md }} />
              ))}
            </View>
          ) : null}
          {evidence.filter((e) => !isImage(e)).map((e) => (
            <Button key={e.id} label={`${t('viol.openPdf')} · ${e.fileName}`} icon={IconFileText} tone="outline"
              onPress={() => void openOrShareDocument(e.id, e.fileName, 'share', getMyViolationEvidenceFile).catch(() => undefined)} />
          ))}
        </View>
      ) : null}

      {v.appeals.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('viol.appeals')} count={v.appeals.length} />
          {v.appeals.map((a) => (
            <Card key={a.id} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <AppText weight="semibold" style={{ flex: 1 }}>
                  {t(a.type === 'Question' ? 'viol.typeQuestion' : 'viol.typeAppeal')} · {a.appealNumber}
                </AppText>
                <Pill label={t(`viol.appealStatus.${a.status}`, { defaultValue: a.status })} accent={appealAccent[a.status] ?? 'primary'} />
              </View>
              <AppText variant="small" tone="secondary">{a.reason}</AppText>
              <AppText variant="caption" tone="muted">{longDate(a.createdAtUtc, code)}</AppText>
              {a.previousFineAmount != null && a.revisedFineAmount != null && a.previousFineAmount !== a.revisedFineAmount ? (
                <AppText variant="small" weight="semibold">
                  {a.revisedFineAmount === 0
                    ? t('viol.fineWaived', { from: omr(a.previousFineAmount, code, true) })
                    : t('viol.fineAdjusted', { from: omr(a.previousFineAmount, code, true), to: omr(a.revisedFineAmount, code, true) })}
                </AppText>
              ) : null}
              {a.response ? (
                <View style={{ gap: 2 }}>
                  <AppText variant="caption" weight="semibold" tone="secondary">{t('viol.officeResponse')}</AppText>
                  <AppText variant="small">{a.response}</AppText>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}

      {sent ? <Note icon={IconCircleCheck} accent="success" text={t('viol.submitted')} /> : null}

      {mode ? (
        <Card style={{ gap: space.md }}>
          <AppText weight="bold">
            {t(mode === 'Appeal' ? 'viol.appealTitle' : 'viol.questionTitle', { number: v.violationNumber })}
          </AppText>
          <Field label={t('viol.reason')} value={reason} onChangeText={setReason} multiline maxLength={1000} placeholder={t('viol.reasonPlaceholder')} error={failure ?? undefined} />
        </Card>
      ) : null}
    </Page>
  );
}
