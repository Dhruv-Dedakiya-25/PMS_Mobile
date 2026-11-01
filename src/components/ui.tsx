// The small building blocks every screen uses: cards, buttons, icon tiles, list rows, status
// pills, segmented filters, chips, inputs, pickers and progress bars.
import { IconCheck, IconChevronLeft, IconChevronRight, IconSelector, type Icon } from '@tabler/icons-react-native';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useLanguage } from '@/i18n';
import { initials } from '@/lib/format';
import { accentColors, fonts, radius, space, type, usePalette, type Accent } from '@/theme/tokens';

export function Card({ children, onPress, style, padded = true }: { children: ReactNode; onPress?: () => void; style?: ViewStyle; padded?: boolean }) {
  const palette = usePalette();
  const base: ViewStyle = {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: padded ? space.lg : 0,
    gap: space.md,
    shadowColor: palette.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [base, style, pressed && { backgroundColor: palette.surface }]}>
      {children}
    </Pressable>
  );
}

type ButtonTone = 'primary' | 'outline' | 'light' | 'danger' | 'ghost';

export function Button({
  label, onPress, tone = 'primary', icon: IconComponent, disabled, compact,
}: { label: string; onPress: () => void; tone?: ButtonTone; icon?: Icon; disabled?: boolean; compact?: boolean }) {
  const palette = usePalette();
  const colors: Record<ButtonTone, { bg: string; fg: string; border: string }> = {
    primary: { bg: palette.primary, fg: palette.onPrimary, border: palette.primary },
    outline: { bg: palette.card, fg: palette.primary, border: palette.primary },
    // White on the blue rent card, as the design's "Pay Now".
    light: { bg: '#FFFFFF', fg: '#1F5BB8', border: '#FFFFFF' },
    danger: { bg: palette.dangerSoft, fg: palette.danger, border: palette.dangerSoft },
    ghost: { bg: 'transparent', fg: palette.primary, border: 'transparent' },
  };
  const c = colors[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        minHeight: compact ? 38 : 50,
        paddingHorizontal: compact ? space.lg : space.xl,
        borderRadius: compact ? radius.md : radius.lg,
        backgroundColor: c.bg,
        borderWidth: 1.5,
        borderColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      {IconComponent ? <IconComponent size={compact ? 17 : 20} color={c.fg} strokeWidth={2} /> : null}
      <AppText weight="semibold" align="center" style={{ color: c.fg }} variant={compact ? 'small' : 'body'}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** A coloured square holding an icon: the design's tiles and list markers. */
export function IconTile({ icon: IconComponent, accent = 'primary', size = 40 }: { icon: Icon; accent?: Accent; size?: number }) {
  const [bg, fg] = accentColors(usePalette(), accent);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <IconComponent size={size * 0.55} color={fg} strokeWidth={1.8} />
    </View>
  );
}

/** The chevron pointing onward, which flips in a right-to-left language. */
export function Onward({ color, size = 18 }: { color?: string; size?: number }) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;
  return <Chevron size={size} color={color ?? palette.textMuted} />;
}

/** One line of a menu: an icon tile, a label with an optional detail, and a chevron. */
export function ListRow({
  icon, accent, label, detail, right, onPress, first,
}: { icon: Icon; accent?: Accent; label: string; detail?: string; right?: ReactNode; onPress?: () => void; first?: boolean }) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: palette.border,
        backgroundColor: pressed ? palette.surface : 'transparent',
      })}>
      <IconTile icon={icon} accent={accent} size={36} />
      <View style={{ flex: 1, gap: 1 }}>
        <AppText weight="medium">{label}</AppText>
        {detail ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress ? <Onward /> : null}
    </Pressable>
  );
}

/** A dot-marked label in the status's colour. */
export function Pill({ label, accent = 'primary', solid }: { label: string; accent?: Accent; solid?: boolean }) {
  const palette = usePalette();
  const [bg, fg] = accentColors(palette, accent);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: solid ? fg : bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: solid ? '#FFFFFF' : fg }} />
      <AppText variant="caption" weight="semibold" style={{ color: solid ? '#FFFFFF' : fg }}>
        {label}
      </AppText>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const palette = usePalette();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: palette.surfaceStrong, borderRadius: radius.lg, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              paddingVertical: 9,
              paddingHorizontal: 6,
              borderRadius: radius.md,
              backgroundColor: on ? palette.card : 'transparent',
              alignItems: 'center',
              shadowColor: palette.shadow,
              shadowOpacity: on ? 0.08 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            }}>
            <AppText variant="small" weight={on ? 'semibold' : 'medium'} tone={on ? 'primary' : 'secondary'} align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A scrolling row of filters, the active one filled: the design's All / Notices / Events. */
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const palette = usePalette();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }} style={{ flexGrow: 0 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{ paddingHorizontal: space.lg, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: on ? palette.primary : palette.surfaceStrong }}>
            <AppText variant="small" weight={on ? 'semibold' : 'medium'} style={{ color: on ? palette.onPrimary : palette.textSecondary }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SectionHeader({ title, action, onAction, count }: { title: string; action?: string; onAction?: () => void; count?: number }) {
  const palette = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <AppText variant="bodyLarge" weight="semibold" style={{ flexShrink: 1 }}>
        {title}
      </AppText>
      {count ? (
        <View style={{ backgroundColor: palette.primarySoft, borderRadius: radius.pill, minWidth: 22, paddingHorizontal: 6, paddingVertical: 1 }}>
          <AppText variant="caption" weight="bold" tone="primary" align="center">
            {count}
          </AppText>
        </View>
      ) : null}
      <View style={{ flex: 1 }} />
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <AppText variant="small" weight="semibold" tone="primary">
            {action}
          </AppText>
          <Onward color={palette.primary} size={15} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Field({ label, hint, error, left, right, ...input }: TextInputProps & { label: string; hint?: string; error?: string; left?: ReactNode; right?: ReactNode }) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="small" weight="medium" tone="secondary">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: input.multiline ? 'flex-start' : 'center',
          gap: space.sm,
          borderWidth: 1.5,
          borderColor: error ? palette.danger : palette.border,
          borderRadius: radius.md,
          backgroundColor: palette.card,
          paddingHorizontal: space.md,
        }}>
        {left}
        <TextInput
          placeholderTextColor={palette.textMuted}
          accessibilityLabel={label}
          maxFontSizeMultiplier={1.6}
          {...input}
          style={{
            flex: 1,
            minHeight: input.multiline ? 110 : 46,
            paddingVertical: input.multiline ? space.md : 0,
            color: palette.text,
            fontFamily: fonts.regular,
            fontSize: type.body.fontSize,
            textAlign: isRTL ? 'right' : 'left',
            textAlignVertical: input.multiline ? 'top' : 'center',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
        />
        {right}
      </View>
      {error || hint ? (
        <AppText variant="caption" tone={error ? 'danger' : 'muted'}>
          {error ?? hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** A field that opens a list to choose from, in a sheet rising from the bottom. */
export function Select<T extends string>({
  label, value, options, onChange, placeholder,
}: { label: string; value?: T; options: { value: T; label: string }[]; onChange: (v: T) => void; placeholder?: string }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="small" weight="medium" tone="secondary">
        {label}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${chosen?.label ?? placeholder ?? ''}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          borderWidth: 1.5,
          borderColor: palette.border,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          backgroundColor: pressed ? palette.surface : palette.card,
        })}>
        <AppText tone={chosen ? 'default' : 'muted'} style={{ flex: 1 }}>
          {chosen?.label ?? placeholder}
        </AppText>
        <IconSelector size={18} color={palette.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,15,32,0.45)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)} accessibilityLabel={label}>
          <Pressable style={{ backgroundColor: palette.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.lg), width: '100%', maxWidth: 520, alignSelf: 'center' }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border, marginBottom: space.md }} />
            <AppText variant="bodyLarge" weight="semibold" style={{ paddingHorizontal: space.xl, marginBottom: space.sm }}>
              {label}
            </AppText>
            <ScrollView style={{ maxHeight: 420 }}>
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: 14, backgroundColor: pressed ? palette.surface : 'transparent' })}>
                    <AppText weight={on ? 'semibold' : 'regular'} tone={on ? 'primary' : 'default'} style={{ flex: 1 }}>
                      {o.label}
                    </AppText>
                    {on ? <IconCheck size={20} color={palette.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function ProgressBar({ percent, color, track }: { percent: number; color: string; track?: string }) {
  const palette = usePalette();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track ?? palette.surfaceStrong, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

/** Label on the start side, value on the end side: one line of a record's details. */
export function DetailRow({ label, value, first }: { label: string; value: ReactNode; first?: boolean }) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border }}>
      <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
        {label}
      </AppText>
      <View style={{ flex: 1.3, alignItems: 'flex-end' }}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <AppText variant="small" weight="medium" align={isRTL ? 'left' : 'right'}>
            {value}
          </AppText>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

/** A card of detail rows under an optional heading. */
export function Details({ title, rows }: { title?: string; rows: [string, ReactNode][] }) {
  return (
    <Card style={{ gap: 0, paddingVertical: space.xs }}>
      {title ? (
        <AppText weight="semibold" style={{ paddingTop: space.sm, paddingBottom: space.xs }}>
          {title}
        </AppText>
      ) : null}
      {rows.map(([label, value], i) => (
        <DetailRow key={label} label={label} value={value} first={i === 0 && !title} />
      ))}
    </Card>
  );
}

/** What a list shows when it has nothing in it. */
export function Empty({ icon: IconComponent, title, detail }: { icon: Icon; title: string; detail?: string }) {
  const palette = usePalette();
  return (
    <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl, paddingHorizontal: space.xl }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: palette.surfaceStrong, alignItems: 'center', justifyContent: 'center' }}>
        <IconComponent size={30} color={palette.textMuted} />
      </View>
      <AppText weight="semibold" align="center">
        {title}
      </AppText>
      {detail ? (
        <AppText variant="small" tone="muted" align="center">
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

/** A short message in a tinted band, such as a reminder that the app shows sample data. */
export function Note({ icon: IconComponent, text, accent = 'primary' }: { icon: Icon; text: string; accent?: Accent }) {
  const [bg, fg] = accentColors(usePalette(), accent);
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: bg, borderRadius: radius.lg, padding: space.md }}>
      <IconComponent size={18} color={fg} />
      <AppText variant="small" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

/** A person's initials in a tinted circle, in place of a photo. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const palette = usePalette();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.primarySoft, borderWidth: 2, borderColor: palette.card, alignItems: 'center', justifyContent: 'center' }}>
      <AppText weight="bold" align="center" tone="primary" style={{ fontSize: size * 0.36, lineHeight: size * 0.46 }}>
        {initials(name)}
      </AppText>
    </View>
  );
}

/** A round outlined button holding one icon, with an optional count: the dashboard's bell and phone. */
export function RoundIcon({ icon: IconComponent, label, onPress, badge }: { icon: Icon; label: string; onPress: () => void; badge?: number }) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      hitSlop={4}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: palette.border, backgroundColor: pressed ? palette.surfaceStrong : palette.card, alignItems: 'center', justifyContent: 'center' })}>
      <IconComponent size={21} color={palette.primary} strokeWidth={1.8} />
      {badge ? (
        <View style={{ position: 'absolute', top: -2, end: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: palette.danger, borderWidth: 2, borderColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="caption" weight="bold" align="center" maxFontSizeMultiplier={1} style={{ color: '#FFFFFF', fontSize: 9.5, lineHeight: 11 }}>
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
