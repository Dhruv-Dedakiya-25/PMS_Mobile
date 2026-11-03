import { IconAlertCircle, IconDownload, IconInfoCircle, IconShare } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EstateFlowMark } from '@/components/art';
import { documentLook } from '@/components/document-look';
import { Page } from '@/components/page';
import { Button, IconTile, Note } from '@/components/ui';
import { useDocuments } from '@/hooks/use-tenancy';
import { useLanguage } from '@/i18n';
import { openOrShareDocument } from '@/lib/document-file';
import { longDate } from '@/lib/format';
import { documents as mockDocuments } from '@/mock/data';
import { space } from '@/theme/tokens';

/** A document's first page, as issued on the property's letterhead. */
export default function DocumentView() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { documents, tenant, property, loading, refreshing, error, refresh } = useDocuments();
  const [saved, setSaved] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const doc = documents.find((d) => d.id === id) ?? documents[0] ?? mockDocuments[0];
  const look = documentLook[doc.kind];
  const ink = '#14213D';
  const faint = '#5B6A82';

  const handleAction = async (action: 'download' | 'share') => {
    setFileError(null);
    try {
      const outcome = await openOrShareDocument(doc.id, doc.title, action);
      if (outcome === 'sample') setSaved(true);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : t('common.errorLoad'));
    }
  };

  return (
    <Page
      title={t(`docs.kinds.${doc.kind}`)}
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button label={t('pay.download')} icon={IconDownload} tone="outline" onPress={() => void handleAction('download')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={t('docs.share')} icon={IconShare} tone="outline" onPress={() => void handleAction('share')} />
          </View>
        </View>
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconTile icon={look.icon} accent={look.accent} />
        <View style={{ flex: 1 }}>
          <AppText weight="semibold">{doc.title}</AppText>
          <AppText variant="caption" tone="muted">
            {doc.ref} · {longDate(doc.date, language.code)}
          </AppText>
        </View>
      </View>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#DCE3EC', padding: space.xl, gap: space.md, minHeight: 360 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <EstateFlowMark size={36} />
          <AppText variant="small" weight="bold" style={{ color: ink, flex: 1 }}>
            {property.name}
          </AppText>
          <AppText variant="caption" style={{ color: faint }}>
            {doc.ref}
          </AppText>
        </View>
        <View style={{ height: 1, backgroundColor: '#E3E8EF' }} />
        <AppText weight="bold" align="left" style={{ color: ink }}>
          {doc.title}
        </AppText>
        <AppText variant="small" align="left" style={{ color: faint }}>
          {longDate(doc.date, 'en')} · To: {tenant.name}, Unit {property.unitNo}, {property.building}
        </AppText>
        {[100, 96, 92, 98, 70, 0, 100, 94, 88, 60].map((w, i) => (
          <View key={i} style={{ height: w ? 6 : 4, width: `${w}%`, backgroundColor: '#E2E7EE', borderRadius: 3 }} />
        ))}
      </View>
      {saved ? <Note icon={IconInfoCircle} text={t('common.sample')} /> : null}
      {fileError ? <Note icon={IconAlertCircle} accent="danger" text={fileError} /> : null}
    </Page>
  );
}
