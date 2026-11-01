import { type Icon } from '@tabler/icons-react-native';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { space, usePalette } from '@/theme/tokens';

// expo-router types the trigger's ref with React Native's older View type, hence `ref as never` below.
type Props = TabTriggerSlotProps & { icon: Icon; label: string; badge?: number };

function Label({ label, focused }: { label: string; focused?: boolean }) {
  return (
    <AppText
      variant="caption"
      weight={focused ? 'semibold' : 'medium'}
      tone={focused ? 'primary' : 'muted'}
      align="center"
      numberOfLines={1}
      maxFontSizeMultiplier={1.2}
      // A long label in some languages shrinks to fit a 375pt-wide phone rather than wrapping.
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      // 11pt fits "Announcements" in a quarter of a 375pt phone, where the web cannot shrink text to fit.
      style={{ fontSize: 11, lineHeight: 14 }}>
      {label}
    </AppText>
  );
}

/** A tab in the bottom bar: icon over label, blue when it is the open tab. */
export function TabButton({ icon: IconComponent, label, badge, isFocused, ref, ...props }: Props) {
  const palette = usePalette();
  return (
    <Pressable
      {...props}
      ref={ref as never}
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 3, paddingTop: space.sm, opacity: pressed ? 0.6 : 1 })}>
      <View>
        <IconComponent size={24} strokeWidth={isFocused ? 2.1 : 1.7} color={isFocused ? palette.primary : palette.textMuted} />
        {badge ? (
          <View
            style={{
              position: 'absolute',
              top: -4,
              end: -9,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              paddingHorizontal: 4,
              backgroundColor: palette.danger,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: palette.card,
            }}>
            <AppText variant="caption" weight="bold" tone="onPrimary" align="center" maxFontSizeMultiplier={1} style={{ fontSize: 9.5, lineHeight: 11 }}>
              {badge > 99 ? '99+' : badge}
            </AppText>
          </View>
        ) : null}
      </View>
      <Label label={label} focused={isFocused} />
    </Pressable>
  );
}
