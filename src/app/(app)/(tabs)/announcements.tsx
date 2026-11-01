import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { announcementLook } from '@/components/announcement-icon';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Card, Chips, IconTile, Onward, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate } from '@/lib/format';
import { announcements, type AnnouncementKind } from '@/mock/data';
import { useMockState } from '@/mock/store';

type Filter = 'all' | AnnouncementKind;

/** The building's notices, events and rules, newest first. */
export default function Announcements() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { acknowledged } = useMockState();
  const [filter, setFilter] = useState<Filter>('all');
  const shown = announcements.filter((a) => filter === 'all' || a.kind === filter).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Screen title={t('tabs.announcements')}>
      <Chips<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'notice', label: t('ann.notices') },
          { value: 'event', label: t('ann.events') },
          { value: 'rule', label: t('ann.rules') },
        ]}
      />
      {shown.map((a) => {
        const look = announcementLook[a.icon];
        const waiting = a.needsAck && !acknowledged.includes(a.id);
        return (
          <Card key={a.id} onPress={() => router.push({ pathname: '/announcements/[id]', params: { id: a.id } })} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <IconTile icon={look.icon} accent={look.accent} size={42} />
            <View style={{ flex: 1, gap: 3 }}>
              <AppText weight="semibold">{a.title}</AppText>
              <AppText variant="caption" tone="muted">
                {longDate(a.date, language.code)}
              </AppText>
              <AppText variant="small" tone="secondary" numberOfLines={2}>
                {a.body}
              </AppText>
              {waiting ? <Pill label={t('ann.pleaseAcknowledge')} accent="orange" /> : null}
            </View>
            <Onward />
          </Card>
        );
      })}
    </Screen>
  );
}
