import { IconBell, IconCreditCard, IconFileText, IconSpeakerphone, IconTool, IconUsers, type Icon } from '@tabler/icons-react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Empty, IconTile } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { useNotifications } from '@/hooks/use-tenancy';
import { daysUntil, shortDate } from '@/lib/format';
import type { NotificationKind } from '@/mock/data';
import { space, usePalette, type Accent } from '@/theme/tokens';

const look: Record<NotificationKind, { icon: Icon; accent: Accent }> = {
  payment: { icon: IconCreditCard, accent: 'primary' },
  lease: { icon: IconFileText, accent: 'success' },
  maintenance: { icon: IconTool, accent: 'orange' },
  visitor: { icon: IconUsers, accent: 'violet' },
  announcement: { icon: IconSpeakerphone, accent: 'teal' },
};

/** Payment reminders, lease alerts and maintenance updates, newest first; each opens what it is about. */
export default function Notifications() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { notifications, unread, markRead, markAllRead } = useNotifications();

  const when = (date: string) => {
    if (!date) return '';
    const ago = -daysUntil(date);
    return ago === 0 ? t('notifications.today') : ago === 1 ? t('notifications.yesterday') : shortDate(date, language.code);
  };

  return (
    <Page
      title={t('notifications.title')}
      right={
        unread ? (
          <Pressable onPress={() => markAllRead()} accessibilityRole="button" hitSlop={8}>
            <AppText variant="small" weight="semibold" tone="primary">
              {t('notifications.markAllRead')}
            </AppText>
          </Pressable>
        ) : undefined
      }>
      {notifications.length === 0 ? <Empty icon={IconBell} title={t('notifications.none')} /> : null}
      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        {notifications.map((n, i) => {
          const l = look[n.kind as NotificationKind] || look.announcement;
          return (
            <Pressable
              key={n.id}
              onPress={() => {
                markRead(n.id);
                if (n.href) router.push(n.href as Href);
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: space.md,
                padding: space.lg,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: palette.border,
                backgroundColor: pressed ? palette.surface : n.read ? 'transparent' : palette.primarySoft,
              })}>
              <IconTile icon={l.icon} accent={l.accent} size={38} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <AppText weight={n.read ? 'medium' : 'semibold'} style={{ flex: 1 }}>
                    {n.title}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {when(n.at)}
                  </AppText>
                </View>
                <AppText variant="small" tone="secondary">
                  {n.body}
                </AppText>
              </View>
              {!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary, marginTop: 6 }} /> : null}
            </Pressable>
          );
        })}
      </Card>
    </Page>
  );
}
