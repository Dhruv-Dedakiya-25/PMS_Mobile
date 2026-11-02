import { IconFolder } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { documentLook } from '@/components/document-look';
import { Page } from '@/components/page';
import { Card, Chips, Empty, IconTile, Onward } from '@/components/ui';
import { useDocuments } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { longDate } from '@/lib/format';
import type { DocumentKind } from '@/mock/data';
import { space } from '@/theme/tokens';

type Filter = 'all' | DocumentKind;

/** The tenancy's paperwork in one place: agreements, receipts, NOCs and letters from the office. */
export default function Documents() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { documents, loading, refreshing, error, refresh } = useDocuments();
  const [filter, setFilter] = useState<Filter>('all');
  const shown = documents.filter((d) => filter === 'all' || d.kind === filter).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Page
      title={t('docs.title')}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}>
      <Chips<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'agreement', label: t('docs.kinds.agreement') },
          { value: 'receipt', label: t('docs.kinds.receipt') },
          { value: 'noc', label: t('docs.kinds.noc') },
          { value: 'letter', label: t('docs.kinds.letter') },
        ]}
      />
      {shown.length === 0 ? <Empty icon={IconFolder} title={t('maint.none')} /> : null}
      {shown.map((d) => {
        const look = documentLook[d.kind];
        return (
          <Card key={d.id} style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push({ pathname: '/documents/[id]', params: { id: d.id } })}>
            <IconTile icon={look.icon} accent={look.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="medium" numberOfLines={1}>
                {d.title}
              </AppText>
              <AppText variant="caption" tone="muted">
                {d.ref} · {longDate(d.date, language.code)} · {t('docs.pages', { count: d.pages })}
              </AppText>
            </View>
            <Onward />
          </Card>
        );
      })}
      <View style={{ height: space.sm }} />
    </Page>
  );
}
