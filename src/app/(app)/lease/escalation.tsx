import { IconInfoCircle } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Note, Pill } from '@/components/ui';
import { useLease } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import { radius, space, usePalette } from '@/theme/tokens';

/**
 * The rent term by term: this lease and the ones it renewed, the current term marked, and
 * what the rent becomes if renewed again. The lease's escalation is the rise at each renewal.
 */
export default function Escalation() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const { lease, loading, error, refresh, refreshing } = useLease();
  const terms = lease.history.length > 0 ? lease.history : [{ from: lease.start, rent: lease.rent, frequency: lease.frequency }];
  const top = Math.max(...terms.map((e) => e.rent), 1);
  const last = terms[terms.length - 1];
  const nextRent = Math.round(last.rent * (1 + lease.escalationPercent / 100) * 1000) / 1000;
  const per = (frequency: string) => t(`lease.frequencies.${frequency}`, { defaultValue: frequency });

  return (
    <Page title={t('lease.escalation')} loading={loading} error={error} onRetry={refresh} refreshing={refreshing} onRefresh={refresh}>
      <Note
        icon={IconInfoCircle}
        text={lease.escalationPercent > 0 ? t('lease.escalationRenewalIntro', { percent: lease.escalationPercent }) : t('lease.noEscalation')}
      />
      <Card>
        {terms.map((e, i) => {
          const current = i === terms.length - 1;
          const before = i > 0 ? terms[i - 1].rent : 0;
          const rise = before > 0 ? Math.round(((e.rent - before) / before) * 1000) / 10 : 0;
          return (
            <View key={`${e.from}-${i}`} style={{ gap: space.xs, paddingTop: i ? space.sm : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <AppText weight="semibold" style={{ flex: 1 }}>
                  {t('lease.termN', { n: i + 1 })} · {longDate(e.from, code)}
                </AppText>
                {current ? <Pill label={t('lease.current')} accent="primary" /> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1, height: 10, borderRadius: radius.pill, backgroundColor: palette.surfaceStrong, overflow: 'hidden' }}>
                  <View style={{ width: `${(e.rent / top) * 100}%`, height: '100%', borderRadius: radius.pill, backgroundColor: current ? palette.primary : palette.textMuted }} />
                </View>
                <AppText variant="small" weight="semibold">
                  {omr(e.rent, code)}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                {per(e.frequency)} · {i === 0 ? t('lease.startingRent') : t('lease.riseOnLast', { percent: rise })}
              </AppText>
            </View>
          );
        })}
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
          {t('lease.ifRenewed')}
        </AppText>
        <AppText weight="bold">{omr(nextRent, code)}</AppText>
      </Card>
    </Page>
  );
}
