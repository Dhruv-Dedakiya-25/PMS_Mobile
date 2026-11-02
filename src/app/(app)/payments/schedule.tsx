import { IconCalendarStats } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Empty, Pill } from '@/components/ui';
import { usePayments } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { monthYear, omr } from '@/lib/format';
import { space, usePalette } from '@/theme/tokens';

/**
 * Each rent payment: paid, due next, or still to come. The sample lease's final year is month
 * by month; a live lease lists its installments at its own payment frequency.
 */
export default function RentalSchedule() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { scheduleRows, scheduleYear, scheduleFrequency, loading, refreshing, error, refresh } = usePayments();
  const code = language.code;
  return (
    <Page
      title={t('pay.schedule')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}>
      <AppText tone="secondary">
        {scheduleFrequency
          ? `${t('lease.frequency')}: ${t(`lease.frequencies.${scheduleFrequency}`, { defaultValue: scheduleFrequency })}`
          : t('pay.scheduleIntro', { year: scheduleYear })}
      </AppText>
      {scheduleRows.length === 0 ? (
        <Empty icon={IconCalendarStats} title={t('maint.none')} />
      ) : (
        <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
          {scheduleRows.map((row, i) => {
            const { status } = row;
            return (
              <View
                key={row.key}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: palette.border, backgroundColor: status === 'due' ? palette.primarySoft : 'transparent' }}>
                <AppText weight={status === 'due' ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                  {monthYear(row.month, code)}
                </AppText>
                <AppText variant="small" weight="medium" tone={status === 'upcoming' ? 'muted' : 'default'}>
                  {omr(row.amount, code)}
                </AppText>
                <View style={{ width: 96, alignItems: 'flex-end' }}>
                  <Pill label={t(`pay.scheduleStatus.${status}`)} accent={status === 'paid' ? 'success' : status === 'due' ? 'primary' : 'warning'} />
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </Page>
  );
}
