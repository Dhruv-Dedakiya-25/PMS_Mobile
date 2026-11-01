import { IconPhone } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { categoryIcon } from '@/components/category-look';
import { Page } from '@/components/page';
import { StageTracker, stageAccent } from '@/components/request-stage';
import { Avatar, Button, Card, Details, IconTile, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, ltr } from '@/lib/format';
import { useMockState } from '@/mock/store';
import { radius, space } from '@/theme/tokens';

/** One repair request: what was reported, who is coming and when, and how far the work has got. */
export default function MaintenanceRequest() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requests } = useMockState();
  const r = requests.find((x) => x.id === id) ?? requests[0];
  const code = language.code;

  return (
    <Page title={r.requestNo} right={<Pill label={t(`maint.stage.${r.stage}`)} accent={stageAccent[r.stage]} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconTile icon={categoryIcon[r.category]} accent={stageAccent[r.stage]} size={44} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">{t(`maint.category.${r.category}`)}</AppText>
            <AppText variant="caption" tone="muted">
              {t('maint.raisedOn', { date: longDate(r.raisedOn, code) })}
            </AppText>
          </View>
        </View>
        <AppText>{r.description}</AppText>
        {r.photos.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {r.photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: 72, height: 72, borderRadius: radius.md }} />
            ))}
          </View>
        ) : null}
      </Card>

      <Details
        rows={[
          [t('maint.priority'), t(`maint.priorities.${r.priority}`)],
          [t('maint.unit'), t('property.unitNo', { unit: '1204' })],
        ]}
      />

      {r.technician ? (
        <Card>
          <AppText variant="small" weight="medium" tone="secondary">
            {t('maint.technician')}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar name={r.technician.name} size={44} />
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{r.technician.name}</AppText>
              <AppText variant="caption" tone="muted">
                {r.technician.visit && r.stage !== 'completed' ? t('maint.visitOn', { date: longDate(r.technician.visit, code) }) : ltr(r.technician.mobile)}
              </AppText>
            </View>
            {r.stage !== 'completed' ? <Button label={t('common.call')} icon={IconPhone} tone="outline" compact onPress={() => Linking.openURL(`tel:${r.technician!.mobile.replace(/\s/g, '')}`)} /> : null}
          </View>
        </Card>
      ) : null}

      <Card>
        <AppText weight="semibold">{t('maint.progress')}</AppText>
        <StageTracker request={r} />
      </Card>
    </Page>
  );
}
