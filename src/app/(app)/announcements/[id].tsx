import { IconCircleCheck } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { announcementLook } from '@/components/announcement-icon';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, IconTile, Note, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate } from '@/lib/format';
import { announcements } from '@/mock/data';
import { acknowledge, useMockState } from '@/mock/store';
import { space } from '@/theme/tokens';

/** One announcement in full; a notice the office needs read is acknowledged here. */
export default function AnnouncementView() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { acknowledged } = useMockState();
  const a = announcements.find((x) => x.id === id) ?? announcements[0];
  const look = announcementLook[a.icon];
  const done = acknowledged.includes(a.id);
  return (
    <Page
      title={t('ann.announcement')}
      footer={a.needsAck && !done ? <Button label={t('ann.acknowledge')} icon={IconCircleCheck} onPress={() => acknowledge(a.id)} /> : undefined}>
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
          {a.title}
        </AppText>
        <AppText style={{ lineHeight: 24 }}>{a.body}</AppText>
        <AppText variant="caption" tone="muted">
          {t('ann.from')}
        </AppText>
      </Card>
      {done ? <Note icon={IconCircleCheck} accent="success" text={t('ann.acknowledged')} /> : null}
    </Page>
  );
}
