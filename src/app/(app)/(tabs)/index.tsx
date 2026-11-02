import {
  IconBell, IconCalendarDue, IconCircleCheck, IconClipboardList, IconCreditCard, IconFileText, IconFolder, IconHeadset,
  IconPhone, IconSpeakerphone, IconTool, type Icon,
} from '@tabler/icons-react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BuildingScene } from '@/components/art';
import { stageAccent } from '@/components/request-stage';
import { Screen } from '@/components/screen';
import { Avatar, Button, Card, IconTile, Onward, Pill, RoundIcon } from '@/components/ui';
import { usePayments, useProfile, useRequests } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, omr } from '@/lib/format';
import { announcements } from '@/mock/data';
import { useMockState } from '@/mock/store';
import { radius, space, usePalette, type Accent } from '@/theme/tokens';

const greetingKey = () => {
  const hour = (new Date().getUTCHours() + 4) % 24;
  return hour < 12 ? 'home.morning' : hour < 17 ? 'home.afternoon' : 'home.evening';
};

/** The tenant's home: what is due, what is open, and the way to everything else. */
export default function Dashboard() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const state = useMockState();
  const profile = useProfile();
  const payments = usePayments();
  const requests = useRequests();
  const code = language.code;

  const { tenant, property, lease } = profile;
  const unread = state.notifications.filter((n) => !n.read).length;
  const active = requests.requests.filter((r) => r.stage !== 'completed');
  const leaseDays = daysUntil(lease.end);
  const outstanding = payments.outstandingTotal;
  const notice = announcements.find((a) => a.needsAck && !state.acknowledged.includes(a.id)) ?? announcements[0];

  const loading = profile.loading || payments.loading || requests.loading;
  const refreshing = profile.refreshing || payments.refreshing || requests.refreshing;
  const error = profile.error || payments.error || requests.error;
  const refreshAll = () => {
    void profile.refresh();
    void payments.refresh();
    void requests.refresh();
  };

  const quick: { icon: Icon; accent: Accent; label: string; href: Href }[] = [
    { icon: IconCreditCard, accent: 'primary', label: t('home.quickPayments'), href: '/payments' },
    { icon: IconTool, accent: 'orange', label: t('home.quickRequests'), href: '/requests' },
    { icon: IconFolder, accent: 'teal', label: t('home.quickDocuments'), href: '/documents' },
    { icon: IconHeadset, accent: 'violet', label: t('home.quickSupport'), href: '/contacts' },
  ];

  return (
    <Screen loading={loading} error={error} onRetry={refreshAll} refreshing={refreshing} onRefresh={refreshAll}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('profile.title')}>
          <Avatar name={tenant.name} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="small" tone="secondary">
            {t(greetingKey())}
          </AppText>
          <AppText variant="bodyLarge" weight="bold" numberOfLines={1}>
            {tenant.name}
          </AppText>
        </View>
        <RoundIcon icon={IconBell} label={t('notifications.title')} badge={unread} onPress={() => router.push('/notifications')} />
        <RoundIcon icon={IconPhone} label={t('contacts.title')} onPress={() => router.push('/contacts')} />
      </View>

      <Pressable onPress={() => router.push('/property')} accessibilityRole="button" style={{ gap: space.sm }}>
        <View>
          <AppText weight="semibold">{property.name}</AppText>
          <AppText variant="small" tone="secondary">
            {t('home.unitLine', { building: property.building, floor: property.floor, unit: property.unitNo })}
          </AppText>
        </View>
        <BuildingScene style={{ height: 160, borderRadius: radius.xl }} />
      </Pressable>

      <View style={{ backgroundColor: palette.hero, borderRadius: radius.xl, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: -space.sm }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: palette.heroAccent, alignItems: 'center', justifyContent: 'center' }}>
          <IconCalendarDue size={24} color={palette.heroText} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" style={{ color: palette.heroMuted }}>
            {t('home.nextRentDue')}
          </AppText>
          <AppText variant="title" weight="bold" style={{ color: palette.heroText }}>
            {omr(payments.nextDueAmount, code)}
          </AppText>
          <AppText variant="caption" style={{ color: palette.heroMuted }}>
            {longDate(payments.nextDueDate, code)}
          </AppText>
        </View>
        <Button label={t('pay.payNow')} tone="light" compact onPress={() => router.push('/payments/pay')} />
      </View>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Card style={{ flex: 1, gap: space.sm }} onPress={() => router.push('/lease')}>
          <IconTile icon={IconFileText} size={34} />
          <AppText variant="caption" tone="secondary">
            {t('home.leaseExpiry')}
          </AppText>
          <View>
            <AppText weight="bold">{longDate(lease.end, code)}</AppText>
            <AppText variant="caption" tone={leaseDays <= 60 ? 'warning' : 'muted'}>
              {t('home.daysLeft', { count: leaseDays })}
            </AppText>
          </View>
        </Card>
        <Card style={{ flex: 1, gap: space.sm }} onPress={() => router.push('/payments/outstanding')}>
          <IconTile icon={IconCircleCheck} accent={outstanding ? 'danger' : 'success'} size={34} />
          <AppText variant="caption" tone="secondary">
            {t('home.outstanding')}
          </AppText>
          <View>
            <AppText weight="bold">{omr(outstanding, code, true)}</AppText>
            <AppText variant="caption" tone={outstanding ? 'danger' : 'success'} weight="medium">
              {outstanding ? t('home.overdue') : t('home.allPaid')}
            </AppText>
          </View>
        </Card>
      </View>

      <Card padded={false} style={{ gap: 0 }}>
        <Pressable
          onPress={() => router.push('/requests/maintenance')}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
          <IconTile icon={IconClipboardList} size={34} />
          <AppText weight="semibold">{t('home.activeRequests')}</AppText>
          <View style={{ backgroundColor: palette.primarySoft, borderRadius: radius.pill, minWidth: 22, paddingHorizontal: 6 }}>
            <AppText variant="caption" weight="bold" tone="primary" align="center">
              {active.length}
            </AppText>
          </View>
          <View style={{ flex: 1 }} />
          <AppText variant="small" weight="semibold" tone="primary">
            {t('common.viewAll')}
          </AppText>
          <Onward color={palette.primary} size={15} />
        </Pressable>
        {active.slice(0, 2).map((r) => (
          <Pressable
            key={r.id}
            onPress={() => router.push({ pathname: '/requests/maintenance/[id]', params: { id: r.id } })}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: pressed ? palette.surface : 'transparent' })}>
            <View style={{ flex: 1 }}>
              <AppText variant="small" weight="medium" numberOfLines={1}>
                {r.categoryLabel ?? t(`maint.category.${r.category}`)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {r.requestNo}
              </AppText>
            </View>
            <Pill label={t(`maint.stage.${r.stage}`)} accent={stageAccent[r.stage]} />
          </Pressable>
        ))}
      </Card>

      <Pressable
        onPress={() => router.push({ pathname: '/announcements/[id]', params: { id: notice.id } })}
        accessibilityRole="button"
        style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: palette.notice, borderWidth: 1, borderColor: palette.noticeBorder, opacity: pressed ? 0.85 : 1 })}>
        <IconSpeakerphone size={26} color={palette.orange} strokeWidth={1.8} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText weight="semibold" style={{ color: palette.orange }}>
            {t('home.buildingAnnouncement')}
          </AppText>
          <AppText variant="small">{t('home.announcementLine', { title: notice.title, date: longDate(notice.date, code) })}</AppText>
          <AppText variant="small" tone="secondary">
            {t('home.tapForDetails')}
          </AppText>
        </View>
      </Pressable>

      <View style={{ gap: space.md }}>
        <AppText variant="bodyLarge" weight="semibold">
          {t('home.quickAccess')}
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {quick.map((q) => (
            <Card key={q.label} onPress={() => router.push(q.href)} style={{ flex: 1, alignItems: 'center', paddingHorizontal: space.xs, gap: space.sm }}>
              <IconTile icon={q.icon} accent={q.accent} size={40} />
              <AppText variant="caption" weight="medium" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {q.label}
              </AppText>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}
