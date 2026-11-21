import { type Icon } from '@tabler/icons-react-native';
import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/app-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/i18n';
import { fonts, radius, space, usePalette } from '@/theme/tokens';

// In light mode the website's sign-in colours, so both sign-in pages look alike; in dark mode the
// same page in the app's dark palette.
const website = {
  bg: '#F1F5F9', card: '#FFFFFF', border: '#E7EDF3', field: '#F8FAFC', ink: '#0F172A', label: '#334155',
  muted: '#64748B', faint: '#94A3B8', button: '#3B6FF6', accent: '#3B6FF6', badge: '#EEF3FF', badgeBorder: '#DCE6FE',
  errorBg: '#FEF2F2', errorBorder: '#FECACA', error: '#B91C1C',
};

/** Colours shared by the sign-in and forgot-password screens. */
export function useAuthColors(): typeof website {
  const p = usePalette();
  if (useColorScheme() !== 'dark') return website;
  return {
    bg: p.bg, card: p.card, border: p.border, field: p.surface, ink: p.text, label: p.textSecondary,
    muted: p.textSecondary, faint: p.textMuted, button: website.button, accent: p.primary, badge: p.primarySoft, badgeBorder: p.border,
    errorBg: p.dangerSoft, errorBorder: p.dangerSoft, error: p.danger,
  };
}

/** The website's sign-in field: a pale box with an icon, white with a blue edge while typing. */
export function AuthField({ label, icon: FieldIcon, right, ...input }: TextInputProps & { label: string; icon: Icon; right?: ReactNode }) {
  const c = useAuthColors();
  const { isRTL } = useLanguage();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      <AppText weight="semibold" style={{ fontSize: 13, lineHeight: 18, color: c.label }}>
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: space.md, height: 46, paddingHorizontal: 14,
          borderRadius: radius.md, borderWidth: 1.5, borderColor: focused ? c.accent : c.border,
          backgroundColor: focused ? c.card : c.field,
        }}>
        <FieldIcon size={18} color={c.faint} />
        <TextInput
          accessibilityLabel={label}
          maxFontSizeMultiplier={1.6}
          placeholderTextColor={c.faint}
          {...input}
          onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
          style={{
            // The box's blue edge already shows focus, so the web app draws no browser ring (a solid 0px outline).
            flex: 1, height: '100%', color: c.ink, fontFamily: fonts.medium, fontSize: 14, outlineStyle: 'solid', outlineWidth: 0,
            textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
        />
        {right}
      </View>
    </View>
  );
}
