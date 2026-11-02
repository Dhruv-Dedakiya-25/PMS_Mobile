import { IconPlus, IconTool } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { categoryIcon } from '@/components/category-look';
import { Page } from '@/components/page';
import { stageAccent } from '@/components/request-stage';
import { Button, Card, Empty, IconTile, Pill, Segmented } from '@/components/ui';
import { useRequests } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate } from '@/lib/format';
import { space } from '@/theme/tokens';

/** The tenant's repair requests: the open ones with the technician's progress, and the finished ones. */
export default function MaintenanceRequests() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { requests, loading, refreshing, error, refresh } = useRequests();
  const [view, setView] = useState<'active' | 'completed'>('active');
  const shown = requests.filter((r) => (view === 'active') === (r.stage !== 'completed'));

  return (
    <Page
      title={t('maint.title')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      footer={<Button label={t('maint.newRequest')} icon={IconPlus} onPress={() => router.push('/requests/maintenance/new')} />}>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'active', label: t('maint.active') },
          { value: 'completed', label: t('maint.stage.completed') },
        ]}
      />
      {shown.length === 0 ? <Empty icon={IconTool} title={t('maint.none')} /> : null}
      {shown.map((r) => (
        <Card key={r.id} onPress={() => router.push({ pathname: '/requests/maintenance/[id]', params: { id: r.id } })}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
            <IconTile icon={categoryIcon[r.category]} accent={stageAccent[r.stage]} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="semibold">{r.categoryLabel ?? t(`maint.category.${r.category}`)}</AppText>
              <AppText variant="caption" tone="muted">
                {r.requestNo}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('maint.raisedOn', { date: longDate(r.raisedOn, language.code) })}
              </AppText>
            </View>
            <Pill label={t(`maint.stage.${r.stage}`)} accent={stageAccent[r.stage]} />
          </View>
          <AppText variant="small" tone="secondary" numberOfLines={2}>
            {r.description}
          </AppText>
          {r.technician && r.stage !== 'completed' ? (
            <AppText variant="caption" tone="primary" weight="medium">
              {r.technician.visit
                ? /^\d{4}-\d{2}-\d{2}/.test(r.technician.visit)
                  ? t('maint.visitLine', { name: r.technician.name, date: longDate(r.technician.visit, language.code) })
                  : `${r.technician.name} · ${r.technician.visit}`
                : r.technician.name}
            </AppText>
          ) : null}
        </Card>
      ))}
    </Page>
  );
}
