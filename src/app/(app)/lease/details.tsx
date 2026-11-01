import { useTranslation } from 'react-i18next';

import { Page } from '@/components/page';
import { Details, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, num, omr } from '@/lib/format';
import { lease, property, tenant } from '@/mock/data';

const months = (from: string, to: string) =>
  (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1;

export default function LeaseDetails() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  return (
    <Page title={t('lease.details')}>
      <Details
        title={lease.title}
        rows={[
          [t('lease.leaseNo'), lease.leaseNo],
          [t('lease.status'), <Pill key="s" label={t('lease.active')} accent="success" />],
          [t('lease.start'), longDate(lease.start, code)],
          [t('lease.end'), longDate(lease.end, code)],
          [t('lease.term'), t('lease.months', { count: months(lease.start, lease.end) })],
        ]}
      />
      <Details
        title={t('lease.money')}
        rows={[
          [t('lease.monthlyRent'), omr(lease.rent, code)],
          [t('lease.frequency'), t('lease.monthly')],
          [t('lease.deposit'), omr(lease.deposit, code)],
          [t('lease.escalation'), t('lease.escalationDetail', { percent: lease.escalationPercent })],
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
