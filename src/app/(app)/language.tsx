import { IconCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card } from '@/components/ui';
import { setLanguage, useLanguage } from '@/i18n';
import { appLanguages } from '@/i18n/languages';
import { space, usePalette } from '@/theme/tokens';

/** The 29 languages, each in its own name with the English name beneath. */
export default function Language() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  return (
    <Page title={t('profile.language')}>
      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        {appLanguages.map((l, i) => {
          const on = l.code === language.code;
          return (
            <Pressable
              key={l.code}
              onPress={async () => {
                await setLanguage(l.code);
                router.back();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: palette.border, backgroundColor: pressed ? palette.surface : 'transparent' })}>
              <View style={{ flex: 1 }}>
                <AppText weight={on ? 'semibold' : 'medium'} tone={on ? 'primary' : 'default'}>
                  {l.nativeName}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {l.name}
                </AppText>
              </View>
              {on ? <IconCheck size={20} color={palette.primary} /> : null}
            </Pressable>
          );
        })}
      </Card>
    </Page>
  );
}
