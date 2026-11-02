import { useTranslation } from 'react-i18next';

import { Page } from '@/components/page';
import { Details, Pill } from '@/components/ui';
import { useLease } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate, num, omr } from '@/lib/format';

const months = (from: string, to: string) =>
  Math.max(1, (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1);

export default function LeaseDetails() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { lease, tenant, property, loading, refreshing, error, refresh } = useLease();
  const code = language.code;
  return (
    <Page
      title={t('lease.details')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}>
      <Details
        title={lease.title}
        rows={[
          [t('lease.leaseNo'), lease.leaseNo],
          [
            t('lease.status'),
            lease.status === 'NoticePeriod' ? (
              <Pill key="s" label={t('lease.notice')} accent="warning" />
            ) : (
              <Pill key="s" label={t('lease.active')} accent="success" />
            ),
          ],
          [t('lease.start'), longDate(lease.start, code)],
          [t('lease.end'), longDate(lease.end, code)],
          [t('lease.term'), t('lease.months', { count: months(lease.start, lease.end) })],
        ]}
      />
      <Details
        title={t('lease.money')}
        rows={[
          [t('lease.monthlyRent'), omr(lease.rent, code)],
          [t('lease.frequency'), t(`lease.frequencies.${lease.frequency}`, { defaultValue: lease.frequency })],
          [t('lease.deposit'), omr(lease.deposit, code)],
          [
            t('lease.escalation'),
            lease.escalationText || (lease.escalationStated ? t('lease.escalationDetail', { percent: lease.escalationPercent }) : '—'),
          ],
          [t('lease.notice'), t('lease.days', { count: lease.noticeDays })],
        ]}
      />
      <Details
        title={t('lease.parties')}
        rows={[
          [t('lease.landlord'), property.developer],
          [t('lease.tenant'), tenant.name],
          [t('lease.premises'), t('lease.premisesLine', { unit: property.unitNo, building: property.building, name: property.name })],
          [t('lease.occupants'), num(tenant.occupants, code)],
        ]}
      />
    </Page>
  );
}
