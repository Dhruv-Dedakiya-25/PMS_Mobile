import { IconCalendarDue, IconCircleCheck, IconReceipt } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, IconTile } from '@/components/ui';
import { utilityLook } from '@/components/utility-look';
import { usePayments } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, monthYear, omr } from '@/lib/format';
import { space, usePalette } from '@/theme/tokens';

/** What is owed: nothing overdue in the sample, so it says so, then lists what falls due next. */
export default function Outstanding() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { outstandingTotal, nextDueAmount, nextDueDate, openInvoices, utilities, loading, refreshing, error, refresh } = usePayments();
  const code = language.code;

  return (
    <Page
      title={t('pay.outstanding')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <IconCircleCheck size={48} color={outstandingTotal ? palette.danger : palette.success} strokeWidth={1.5} />
        <AppText variant="caption" tone="secondary">
          {t('pay.totalOverdue')}
        </AppText>
        <AppText variant="heading" weight="bold">
          {omr(outstandingTotal, code, true)}
        </AppText>
        <AppText variant="small" weight="medium" tone={outstandingTotal ? 'danger' : 'success'}>
          {outstandingTotal ? t('home.overdue') : t('pay.nothingOverdue')}
        </AppText>
      </Card>

      {openInvoices.map((inv) => (
        <Card key={inv.id} style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push('/payments/pay')}>
          <IconTile icon={IconReceipt} accent={inv.status === 'Overdue' ? 'danger' : 'warning'} />
          <View style={{ flex: 1 }}>
            <AppText weight="medium">{inv.invoiceNumber}</AppText>
            <AppText variant="caption" tone="muted">
              {t('pay.dueOn', { date: longDate(inv.dueDate.slice(0, 10), code) })}
            </AppText>
          </View>
          <AppText weight="semibold">{omr(inv.outstandingAmount, code)}</AppText>
        </Card>
      ))}

      <AppText variant="bodyLarge" weight="semibold">
        {t('pay.comingUp')}
      </AppText>
      <Card style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push('/payments/pay')}>
        <IconTile icon={IconCalendarDue} />
        <View style={{ flex: 1 }}>
          <AppText weight="medium">{t('pay.rentFor', { month: monthYear(nextDueDate, code) })}</AppText>
          <AppText variant="caption" tone="muted">
            {t('pay.dueOn', { date: longDate(nextDueDate, code) })}
          </AppText>
        </View>
        <AppText weight="semibold">{omr(nextDueAmount, code)}</AppText>
      </Card>
      {utilities.map((b) => {
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
