import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GreenViewMark } from '@/components/art';
import { Page } from '@/components/page';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import { lease, property, tenant } from '@/mock/data';
import { space } from '@/theme/tokens';

// The agreement's own wording: a record, as the signed contract holds it, so it stays in English.
const clauses = [
  'The Tenant shall pay the monthly rent in advance on the first day of each month.',
  'The security deposit is held for the term and refunded within 30 days of handover, less any agreed deductions.',
  'The rent rises by the escalation rate on each anniversary of the start date.',
  'Either party may end the lease at its expiry by giving written notice within the notice period.',
  'The Tenant shall keep the premises in good condition and report any defect through the maintenance service.',
  'The premises are for residential use by the Tenant and the registered occupants only.',
];

/** The tenancy agreement as a page of paper: white in either theme, as a printed contract is. */
export default function Agreement() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const ink = '#14213D';
  const faint = '#5B6A82';
  const terms: [string, string][] = [
    ['Lease No.', lease.leaseNo],
    ['Landlord', property.developer],
    ['Tenant', tenant.name],
    ['Premises', `Unit ${property.unitNo}, ${property.building}, ${property.name}`],
    ['Term', `${longDate(lease.start, 'en')} to ${longDate(lease.end, 'en')}`],
    ['Monthly rent', omr(lease.rent, 'en')],
    ['Security deposit', omr(lease.deposit, 'en')],
    ['Escalation', `${lease.escalationPercent}% per year`],
  ];
  return (
    <Page title={t('lease.agreement')}>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 6, padding: space.xl, gap: space.md, borderWidth: 1, borderColor: '#DCE3EC' }}>
        <View style={{ alignItems: 'center', gap: space.xs }}>
          <GreenViewMark size={44} />
          <AppText variant="bodyLarge" weight="bold" align="center" style={{ color: ink }}>
            {lease.title.toUpperCase()}
          </AppText>
          <AppText variant="caption" align="center" style={{ color: faint }}>
            {property.name} · {property.address}
          </AppText>
        </View>
        <View style={{ height: 1, backgroundColor: '#E3E8EF' }} />
        {terms.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', gap: space.md }}>
            <AppText variant="small" align="left" style={{ color: faint, width: 110 }}>
              {label}
            </AppText>
            <AppText variant="small" weight="medium" align="left" style={{ color: ink, flex: 1 }}>
              {value}
            </AppText>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: '#E3E8EF' }} />
        {clauses.map((c, i) => (
          <AppText key={i} variant="small" align="left" style={{ color: ink }}>
            {i + 1}. {c}
          </AppText>
        ))}
        <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.lg }}>
          {[property.developer, tenant.name].map((who) => (
            <View key={who} style={{ flex: 1, gap: 4 }}>
              <AppText style={{ color: '#1F5BB8', fontStyle: 'italic', fontSize: 18 }} align="left">
                {who.split(' ')[0]}
              </AppText>
              <View style={{ height: 1, backgroundColor: '#B8C3D2' }} />
              <AppText variant="caption" align="left" style={{ color: faint }}>
                {who} · {longDate(lease.start, 'en')}
              </AppText>
            </View>
          ))}
        </View>
      </View>
      <AppText variant="caption" tone="muted" align="center">
        {t('lease.agreementNote', { date: longDate(lease.start, code) })}
      </AppText>
    </Page>
  );
}
