import { IconCircleCheck } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { announcementLook } from '@/components/announcement-icon';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, IconTile, Note, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { useAnnouncementDetail } from '@/hooks/use-tenancy';
import { longDate } from '@/lib/format';
import { space } from '@/theme/tokens';

/** One announcement in full; a notice the office needs read is acknowledged here. */
export default function AnnouncementView() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { announcement: a, acknowledged: done, acknowledge } = useAnnouncementDetail(id || '');

  if (!a) {
    return (
      <Page title={t('ann.announcement')}>
        <Card>
          <AppText tone="muted">{t('common.empty')}</AppText>
        </Card>
      </Page>
    );
  }

  const look = announcementLook[a.icon] || announcementLook.maintenance;
  const title = (language.code === 'ar' && (a as any).titleAr) ? (a as any).titleAr : a.title;
  const body = (language.code === 'ar' && (a as any).bodyAr) ? (a as any).bodyAr : a.body;

  return (
    <Page
      title={t('ann.announcement')}
      footer={a.needsAck && !done ? <Button label={t('ann.acknowledge')} icon={IconCircleCheck} onPress={() => acknowledge()} /> : undefined}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconTile icon={look.icon} accent={look.accent} size={48} />
          <View style={{ flex: 1, gap: 4 }}>
            <Pill label={t(`ann.kind.${a.kind}`)} accent={look.accent} />
            <AppText variant="caption" tone="muted">
              {longDate(a.date, language.code)}
            </AppText>
          </View>
        </View>
        <AppText variant="title" weight="bold">
          {title}
        </AppText>
        <AppText style={{ lineHeight: 24 }}>{body}</AppText>
        <AppText variant="caption" tone="muted">
          {t('ann.from')}
        </AppText>
      </Card>
      {done ? <Note icon={IconCircleCheck} accent="success" text={t('ann.acknowledged')} /> : null}
    </Page>
  );
}
