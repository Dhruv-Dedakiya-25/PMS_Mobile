import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { decideStaffApproval, getStaffApprovals, type StaffApproval } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Button, Card, Field, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { space } from '@/theme/tokens';

/** The translation keys are the API's enum names with a lower-case first letter. */
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Requests in approval, from the Approval API, as the website's Approvals inbox shows
 * them. One waiting for the signed-in person offers Approve, Return and Reject; Return
 * and Reject need a reason, which the requester sees.
 */
export function StaffApprovals() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const [approvals, setApprovals] = useState<StaffApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<{ id: string; text: string } | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getStaffApprovals()
      .then((items) => { if (!cancelled) setApprovals(items); })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : t('common.errorLoad')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt, t]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    setAttempt((n) => n + 1);
  };

  const decide = async (ap: StaffApproval, decision: 'Approve' | 'Return' | 'Reject') => {
    const comment = comments[ap.id]?.trim();
    if (decision !== 'Approve' && !comment) {
      setProblem({ id: ap.id, text: t('approvals.reasonNeeded') });
      return;
    }
    setProblem(null);
    setDeciding(ap.id);
    try {
      const next = await decideStaffApproval(ap.id, decision, comment || undefined);
      setApprovals((all) => all.map((a) => (a.id === ap.id ? next : a)));
      setComments((c) => ({ ...c, [ap.id]: '' }));
    } catch (e) {
      setProblem({ id: ap.id, text: e instanceof Error ? e.message : t('common.errorLoad') });
    } finally {
      setDeciding(null);
    }
  };

  if (loading) return <AppText tone="muted">…</AppText>;
  if (loadError) {
    return (
      <Card style={{ gap: space.sm }}>
        <AppText tone="secondary">{loadError}</AppText>
        <Button compact tone="outline" label={t('common.retry')} onPress={retry} />
      </Card>
    );
  }
  if (approvals.length === 0) return <AppText tone="muted">{t('approvals.empty')}</AppText>;

  // What waits for this person first, then the rest still in approval, then the decided.
  const order = (a: StaffApproval) => (a.canDecide ? 0 : a.status === 'InApproval' ? 1 : 2);
  const sorted = [...approvals].sort((a, b) => order(a) - order(b));

  return (
    <View style={{ gap: space.sm }}>
      {sorted.map((ap) => {
        const step = ap.currentStep == null ? null : ap.route.find((s) => s.stepIndex === ap.currentStep);
        const last = ap.history[ap.history.length - 1];
        return (
          <Card key={ap.id} style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <AppText weight="bold" style={{ flex: 1 }}>{ap.reference} · {t(`approvals.type.${lowerFirst(ap.requestType)}`)}</AppText>
              <Pill
                accent={ap.status === 'Approved' ? 'success' : ap.status === 'Rejected' ? 'danger' : 'warning'}
                label={t(`approvals.status.${lowerFirst(ap.status)}`)}
              />
            </View>
            <AppText tone="secondary">{ap.subject}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
              <AppText variant="caption" tone="muted">
                {ap.requesterName} • {ap.submittedAtUtc.slice(0, 10)}
              </AppText>
              <AppText variant="bodyLarge" weight="bold">
                {omr(ap.amount, code)}
              </AppText>
            </View>
            {step && !ap.canDecide && (
              <AppText variant="caption" tone="muted">
                {t('approvals.othersTurn', { names: step.approverNames.join(', '), n: step.stepIndex + 1 })}
              </AppText>
            )}
            {last?.comment ? <AppText variant="caption">“{last.comment}”</AppText> : null}
            {ap.canDecide && (
              <View style={{ gap: space.sm, marginTop: space.xs }}>
                <Field
                  label={t('approvals.comment')}
                  placeholder={t('approvals.placeholder')}
                  value={comments[ap.id] ?? ''}
                  onChangeText={(v) => setComments((c) => ({ ...c, [ap.id]: v }))}
                  error={problem?.id === ap.id ? problem.text : undefined}
                  multiline
                />
                <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                  <Button compact disabled={deciding === ap.id} label={t('approvals.approve')} onPress={() => void decide(ap, 'Approve')} />
                  <Button compact disabled={deciding === ap.id} tone="outline" label={t('approvals.return')} onPress={() => void decide(ap, 'Return')} />
                  <Button compact disabled={deciding === ap.id} tone="danger" label={t('approvals.reject')} onPress={() => void decide(ap, 'Reject')} />
                </View>
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}
