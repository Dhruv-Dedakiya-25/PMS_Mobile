import { IconAlertTriangle, IconBell, IconFileText, IconGavel, IconTool, type Icon } from '@tabler/icons-react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { getInbox, markInboxAllRead, markInboxRead } from '@/api/staff';
import type { InboxItemDto } from '@/api/types';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Empty, IconTile } from '@/components/ui';
import { authMode } from '@/config';
import { useLanguage } from '@/i18n';
import { daysUntil, shortDate } from '@/lib/format';
import { space, usePalette, type Accent } from '@/theme/tokens';

const look: Record<string, { icon: Icon; accent: Accent }> = {
  ServiceRequest: { icon: IconTool, accent: 'orange' },
  Lease: { icon: IconFileText, accent: 'success' },
  Violation: { icon: IconGavel, accent: 'danger' },
};

/** The screen a notification's record opens on in the app, where it has one. */
const screenFor = (item: InboxItemDto): Href | undefined => {
  const id = item.relatedEntityId;
  if (!id) return undefined;
  switch (item.relatedEntityType) {
    case 'ServiceRequest': return { pathname: '/staff/ticket/[id]', params: { id } };
    case 'Lease': return { pathname: '/staff/lease/[id]', params: { id } };
    default: return undefined;
  }
};

/** A staff member's own notifications, newest first: SLA breach and lease expiry reminders, and anything else addressed to them. */
export default function StaffInbox() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const [items, setItems] = useState<InboxItemDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(authMode === 'api');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authMode !== 'api') return;
    try {
      const r = await getInbox();
      setItems(r.items);
      setUnread(r.unread);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const open = async (item: InboxItemDto) => {
    if (!item.readAtUtc) await markInboxRead(item.id).catch(() => undefined);
    void load();
    const to = screenFor(item);
    if (to) router.push(to);
  };

  const markAll = async () => {
    await markInboxAllRead().catch(() => undefined);
    void load();
  };

  const when = (iso?: string | null) => {
    if (!iso) return '';
    const ago = -daysUntil(iso.slice(0, 10));
    return ago === 0 ? t('notifications.today') : ago === 1 ? t('notifications.yesterday') : shortDate(iso, language.code);
  };

  return (
    <Page
      title={t('notifications.title')}
      loading={loading}
      error={error}
      onRetry={() => void load()}
      right={
        unread ? (
          <Pressable onPress={() => void markAll()} accessibilityRole="button" hitSlop={8}>
            <AppText variant="small" weight="semibold" tone="primary">
              {t('notifications.markAllRead')}
            </AppText>
          </Pressable>
        ) : undefined
      }>
      {items.length === 0 ? <Empty icon={IconBell} title={t('notifications.none')} /> : null}
      {items.length > 0 ? (
        <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
          {items.map((n, i) => {
            const l = look[n.relatedEntityType ?? ''] ?? { icon: IconAlertTriangle, accent: 'primary' as Accent };
            const read = !!n.readAtUtc;
            return (
              <Pressable
                key={n.id}
                onPress={() => void open(n)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexDirection: 'row', gap: space.md, padding: space.lg,
                  borderTopWidth: i ? 1 : 0, borderTopColor: palette.border,
                  backgroundColor: pressed ? palette.surface : read ? 'transparent' : palette.primarySoft,
                })}>
                <IconTile icon={l.icon} accent={l.accent} size={38} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <AppText weight={read ? 'medium' : 'semibold'} style={{ flex: 1 }}>
                      {n.subject || n.message}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {when(n.sentAtUtc)}
                    </AppText>
                  </View>
                  {n.subject ? (
                    <AppText variant="small" tone="secondary">
                      {n.message}
                    </AppText>
                  ) : null}
                </View>
                {!read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary, marginTop: 6 }} /> : null}
              </Pressable>
            );
          })}
        </Card>
      ) : null}
    </Page>
  );
}
