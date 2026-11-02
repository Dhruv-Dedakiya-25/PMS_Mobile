import { IconAlertCircle, IconCalendarDue, IconCalendarStats, IconHistory, IconReceipt } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, IconTile, ListRow } from '@/components/ui';
import { usePayments } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import { space } from '@/theme/tokens';

/** Rent at a glance: what it is, when it is next due, and the record of what has been paid. */
export default function RentPayments() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { rentAmount, nextDueDate, payments, overdueCount, scheduleFrequency, loading, refreshing, error, refresh } = usePayments();
  const code = language.code;

  return (
    <Page
      title={t('pay.title')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}>
      <View>
        <AppText variant="small" tone="secondary">
          {t('pay.currentRent')}
        </AppText>
        <AppText variant="heading" weight="bold">
          {t('pay.perMonth', { amount: omr(rentAmount, code) })}
        </AppText>
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconTile icon={IconCalendarDue} size={44} />
          <View style={{ flex: 1 }}>
            <AppText variant="small" tone="secondary">
              {t('pay.nextDue')}
            </AppText>
            <AppText variant="bodyLarge" weight="bold">
              {longDate(nextDueDate, code)}
            </AppText>
          </View>
        </View>
        <Button label={t('pay.payNow')} onPress={() => router.push('/payments/pay')} />
      </Card>
      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        <ListRow first icon={IconHistory} label={t('pay.history')} detail={t('pay.historyDetail', { count: payments.length })} onPress={() => router.push('/payments/history')} />
        <ListRow icon={IconCalendarStats} label={t('pay.schedule')} detail={scheduleFrequency ? t(`lease.frequencies.${scheduleFrequency}`, { defaultValue: scheduleFrequency }) : t('pay.scheduleDetail')} onPress={() => router.push('/payments/schedule')} />
        <ListRow icon={IconReceipt} label={t('pay.receipts')} detail={t('pay.receiptsDetail')} onPress={() => router.push('/payments/receipts')} />
        <ListRow
          icon={IconAlertCircle}
          accent="danger"
          label={t('pay.outstanding')}
          detail={overdueCount ? t('pay.overdueCount', { count: overdueCount }) : t('home.allPaid')}
          onPress={() => router.push('/payments/outstanding')}
        />
      </Card>
    </Page>
  );
}
