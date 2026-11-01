import { IconArrowsExchange, IconCalendarX, IconDownload, IconEye, IconFileDescription, IconInfoCircle, IconRefresh, IconShieldCheck, IconTrendingUp, type Icon } from '@tabler/icons-react-native';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PaperThumb } from '@/components/art';
import { Page } from '@/components/page';
import { Button, Card, IconTile, ListRow, Note, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, omr } from '@/lib/format';
import { lease } from '@/mock/data';
import { useMockState } from '@/mock/store';
import { space, type Accent } from '@/theme/tokens';

/** The tenancy agreement and everything done under it: renewing, ending, rent rises and the deposit. */
export default function LeaseManagement() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { renewal } = useMockState();
  const [downloaded, setDownloaded] = useState(false);
  const code = language.code;

  const rows: { icon: Icon; accent: Accent; label: string; detail: string; href: Href }[] = [
    { icon: IconFileDescription, accent: 'success', label: t('lease.details'), detail: lease.leaseNo, href: '/lease/details' },
    { icon: IconRefresh, accent: 'primary', label: t('lease.renewal'), detail: t(`lease.renewalStatus.${renewal}`), href: '/lease/renewal' },
    { icon: IconCalendarX, accent: 'orange', label: t('lease.termination'), detail: t('lease.terminationDetail', { days: lease.noticeDays }), href: '/lease/termination' },
    { icon: IconTrendingUp, accent: 'danger', label: t('lease.escalation'), detail: t('lease.escalationDetail', { percent: lease.escalationPercent }), href: '/lease/escalation' },
    { icon: IconShieldCheck, accent: 'primary', label: t('lease.deposit'), detail: omr(lease.deposit, code), href: '/lease/deposit' },
  ];

  return (
    <Page title={t('lease.title')}>
      <Card>
        <View style={{ flexDirection: 'row', gap: space.lg }}>
          <PaperThumb width={70} />
          <View style={{ flex: 1, gap: space.xs }}>
            <View style={{ alignSelf: 'flex-end' }}>
              <Pill label={t('lease.active')} accent="success" />
            </View>
            <AppText weight="bold">{lease.title}</AppText>
            <AppText variant="small" tone="secondary">
              {longDate(lease.start, code)} – {longDate(lease.end, code)}
            </AppText>
            <AppText variant="caption" tone={daysUntil(lease.end) <= 60 ? 'warning' : 'muted'}>
              {t('lease.endsIn', { count: daysUntil(lease.end) })}
            </AppText>
          </View>
        </View>
        <Button label={t('lease.viewAgreement')} icon={IconEye} onPress={() => router.push('/lease/agreement')} />
        <Button label={t('lease.downloadPdf')} icon={IconDownload} tone="outline" onPress={() => setDownloaded(true)} />
        {downloaded ? <Note icon={IconInfoCircle} text={t('common.sample')} /> : null}
      </Card>

      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <ListRow key={r.label} icon={r.icon} accent={r.accent} label={r.label} detail={r.detail} onPress={() => router.push(r.href)} first={i === 0} />
        ))}
      </Card>

      <Card style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push('/payments')}>
        <IconTile icon={IconArrowsExchange} size={34} />
        <AppText variant="small" style={{ flex: 1 }}>
          {t('lease.rentLine', { amount: omr(lease.rent, code) })}
        </AppText>
      </Card>
    </Page>
  );
}
