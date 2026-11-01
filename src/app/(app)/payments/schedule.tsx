import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { monthYear, omr } from '@/lib/format';
import { lease, rentalSchedule } from '@/mock/data';
import { nextRentMonth, useMockState } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

/** The lease's final year month by month: paid, due next, or still to come. */
export default function RentalSchedule() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const state = useMockState();
  const code = language.code;
  const paid = new Set(state.payments.map((p) => p.forMonth));
  const next = nextRentMonth(state);
  return (
    <Page title={t('pay.schedule')}>
      <AppText tone="secondary">{t('pay.scheduleIntro', { year: lease.end.slice(0, 4) })}</AppText>
      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        {rentalSchedule.map((month, i) => {
          const status = paid.has(month) ? 'paid' : month === next ? 'due' : 'upcoming';
          return (
            <View
              key={month}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: palette.border, backgroundColor: status === 'due' ? palette.primarySoft : 'transparent' }}>
              <AppText weight={status === 'due' ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                {monthYear(month, code)}
              </AppText>
              <AppText variant="small" weight="medium" tone={status === 'upcoming' ? 'muted' : 'default'}>
                {omr(lease.rent, code)}
              </AppText>
              <View style={{ width: 96, alignItems: 'flex-end' }}>
                <Pill label={t(`pay.scheduleStatus.${status}`)} accent={status === 'paid' ? 'success' : status === 'due' ? 'primary' : 'warning'} />
              </View>
            </View>
          );
        })}
      </Card>
    </Page>
  );
}
