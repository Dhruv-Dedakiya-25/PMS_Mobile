import { IconDownload, IconInfoCircle, IconShare } from '@tabler/icons-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GreenViewMark } from '@/components/art';
import { documentLook } from '@/components/document-look';
import { Page } from '@/components/page';
import { Button, IconTile, Note } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate } from '@/lib/format';
import { documents, property, tenant } from '@/mock/data';
import { space } from '@/theme/tokens';

/** A document's first page, as issued on the property's letterhead. */
export default function DocumentView() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [saved, setSaved] = useState(false);
  const doc = documents.find((d) => d.id === id) ?? documents[0];
  const look = documentLook[doc.kind];
  const ink = '#14213D';
  const faint = '#5B6A82';
  return (
    <Page
      title={t(`docs.kinds.${doc.kind}`)}
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button label={t('pay.download')} icon={IconDownload} tone="outline" onPress={() => setSaved(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={t('docs.share')} icon={IconShare} tone="outline" onPress={() => setSaved(true)} />
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
          <GreenViewMark size={36} />
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
    </Page>
  );
}
