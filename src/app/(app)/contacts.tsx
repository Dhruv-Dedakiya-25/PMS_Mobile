import { IconAlertTriangle, IconBuildingSkyscraper, IconMail, IconPhone, IconShieldLock, IconTool, IconUserCircle, type Icon } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, IconTile } from '@/components/ui';
import { ltr } from '@/lib/format';
import { contacts, type ContactRole } from '@/mock/data';
import { space, type Accent } from '@/theme/tokens';

const look: Record<ContactRole, { icon: Icon; accent: Accent }> = {
  propertyManager: { icon: IconUserCircle, accent: 'primary' },
  maintenanceDesk: { icon: IconTool, accent: 'orange' },
  reception: { icon: IconBuildingSkyscraper, accent: 'teal' },
  security: { icon: IconShieldLock, accent: 'violet' },
  emergency: { icon: IconAlertTriangle, accent: 'danger' },
};

/** Who to call: the property manager, the maintenance desk, reception, security and emergency services. */
export default function Contacts() {
  const { t } = useTranslation();
  const dial = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  return (
    <Page title={t('contacts.title')}>
      <AppText tone="secondary">{t('contacts.intro')}</AppText>
      {contacts.map((c) => {
        const l = look[c.role];
        return (
          <Card key={c.role}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <IconTile icon={l.icon} accent={l.accent} size={44} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" tone="secondary">
                  {t(`contacts.roles.${c.role}`)}
                </AppText>
                <AppText weight="semibold">{c.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {ltr(c.phone)} · {ltr(c.hours)}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button label={t('common.call')} icon={IconPhone} compact tone={c.role === 'emergency' ? 'danger' : 'primary'} onPress={() => dial(c.phone)} />
              </View>
              {c.email ? (
                <View style={{ flex: 1 }}>
                  <Button label={t('common.email')} icon={IconMail} compact tone="outline" onPress={() => Linking.openURL(`mailto:${c.email}`)} />
                </View>
              ) : null}
            </View>
          </Card>
        );
      })}
    </Page>
  );
}
