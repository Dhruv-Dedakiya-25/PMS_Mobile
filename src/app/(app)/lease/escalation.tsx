import { IconInfoCircle } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Note, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import { omanToday } from '@/mock/clock';
import { escalation, lease } from '@/mock/data';
import { radius, space, usePalette } from '@/theme/tokens';

/** The rent year by year under the escalation clause, the current year marked. */
export default function Escalation() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const top = Math.max(...escalation.map((e) => e.rent));
  const nextRent = Math.round(lease.rent * (1 + lease.escalationPercent / 100));
  return (
    <Page title={t('lease.escalation')}>
      <Note icon={IconInfoCircle} text={t('lease.escalationIntro', { percent: lease.escalationPercent })} />
      <Card>
        {escalation.map((e, i) => {
          const current = e.from.slice(0, 4) === omanToday().slice(0, 4);
          return (
            <View key={e.from} style={{ gap: space.xs, paddingTop: i ? space.sm : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <AppText weight="semibold" style={{ flex: 1 }}>
                  {t('lease.yearN', { n: i + 1 })} · {longDate(e.from, code)}
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
                {e.percent ? t('lease.risePercent', { percent: e.percent }) : t('lease.startingRent')}
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
