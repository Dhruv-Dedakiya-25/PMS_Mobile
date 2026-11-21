import { IconGavel, IconInfoCircle } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Empty, Note, Onward, Pill } from '@/components/ui';
import { useViolations } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import { violationAccent } from '@/components/violation-look';
import { space } from '@/theme/tokens';

/** The violations recorded against the tenant, newest first; each opens its detail, evidence and appeals. */
export default function Violations() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { violations, loading, error, refresh, refreshing } = useViolations();
  const code = language.code;

  return (
    <Page title={t('viol.title')} loading={loading} error={error} onRetry={refresh} refreshing={refreshing} onRefresh={refresh}>
      <Note icon={IconInfoCircle} text={t('viol.note')} />
      {violations.length === 0 ? (
        <Empty icon={IconGavel} title={t('viol.none')} />
      ) : (
        violations.map((v) => (
          <Card key={v.id} style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push({ pathname: '/violations/[id]', params: { id: v.id } })}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="semibold">{v.violationType}</AppText>
              <AppText variant="caption" tone="muted">
                {v.violationNumber} · {longDate(v.violationDate, code)}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: space.xs }}>
              <Pill label={t(`viol.status.${v.status}`, { defaultValue: v.status })} accent={violationAccent[v.status] ?? 'primary'} />
              {v.fineAmount ? <AppText variant="caption" weight="semibold">{omr(v.fineAmount, code, true)}</AppText> : null}
            </View>
            <Onward />
          </Card>
        ))
      )}
    </Page>
  );
}
