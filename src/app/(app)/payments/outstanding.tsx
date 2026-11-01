import { IconCalendarDue, IconCircleCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { utilityLook } from '@/components/utility-look';
import { Button, Card, IconTile } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, monthYear, omr } from '@/lib/format';
import { lease } from '@/mock/data';
import { nextRentMonth, unpaidUtilities, useMockState } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

/** What is owed: nothing overdue in the sample, so it says so, then lists what falls due next. */
export default function Outstanding() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const state = useMockState();
  const code = language.code;
  const bills = unpaidUtilities(state);
  const overdue = bills.filter((b) => daysUntil(b.due) < 0).reduce((sum, b) => sum + b.amount, 0);
  const next = nextRentMonth(state);

  return (
    <Page title={t('pay.outstanding')}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <IconCircleCheck size={48} color={overdue ? palette.danger : palette.success} strokeWidth={1.5} />
        <AppText variant="caption" tone="secondary">
          {t('pay.totalOverdue')}
        </AppText>
        <AppText variant="heading" weight="bold">
          {omr(overdue, code, true)}
        </AppText>
        <AppText variant="small" weight="medium" tone={overdue ? 'danger' : 'success'}>
          {overdue ? t('home.overdue') : t('pay.nothingOverdue')}
        </AppText>
      </Card>

      <AppText variant="bodyLarge" weight="semibold">
        {t('pay.comingUp')}
      </AppText>
      <Card style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push('/payments/pay')}>
        <IconTile icon={IconCalendarDue} />
        <View style={{ flex: 1 }}>
          <AppText weight="medium">{t('pay.rentFor', { month: monthYear(next, code) })}</AppText>
          <AppText variant="caption" tone="muted">
            {t('pay.dueOn', { date: longDate(next, code) })}
          </AppText>
        </View>
        <AppText weight="semibold">{omr(lease.rent, code)}</AppText>
      </Card>
      {bills.map((b) => {
        const look = utilityLook[b.kind];
        return (
          <Card key={b.kind} style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push('/utilities')}>
            <IconTile icon={look.icon} accent={look.accent} />
            <View style={{ flex: 1 }}>
              <AppText weight="medium">{t(`util.kind.${b.kind}`)}</AppText>
              <AppText variant="caption" tone="muted">
                {t('pay.dueOn', { date: longDate(b.due, code) })}
              </AppText>
            </View>
            <AppText weight="semibold">{omr(b.amount, code)}</AppText>
          </Card>
        );
      })}
      <Button label={t('pay.payRent')} onPress={() => router.push('/payments/pay')} />
    </Page>
  );
}
