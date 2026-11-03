import { useColorScheme } from '@/hooks/use-color-scheme';

/** EstateFlow's palette: the website's blue (#3B6FF6) on a cool grey ground, with a matching dark set. */
const light = {
  bg: '#F3F6FB',
  card: '#FFFFFF',
  surface: '#F7F9FC',
  surfaceStrong: '#EAEFF6',
  border: '#E1E7F0',
  text: '#14213D',
  textSecondary: '#4E5D78',
  textMuted: '#69788F',
  primary: '#3B6FF6',
  primaryPressed: '#2E5FE0',
  primarySoft: '#EEF3FF',
  onPrimary: '#FFFFFF',
  success: '#15803D',
  successSoft: '#DCF5E5',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#C62828',
  dangerSoft: '#FDE8E8',
  teal: '#0F766E',
  tealSoft: '#E1F4F1',
  violet: '#6D4AD8',
  violetSoft: '#EFEAFD',
  orange: '#D9620B',
  orangeSoft: '#FFF1E4',
  shadow: '#0F1B33',
  // The rent card on the dashboard and the payment screens' summary.
  // A shade darker than primary so the card's smaller text keeps its contrast.
  hero: '#2E5FE0',
  heroText: '#FFFFFF',
  heroMuted: '#D6E3F8',
  heroAccent: 'rgba(255,255,255,0.16)',
  // The building announcement's cream card.
  notice: '#FFF6E8',
  noticeBorder: '#F8E2BF',
};

const dark: typeof light = {
  bg: '#0B1220',
  card: '#131C2E',
  surface: '#172135',
  surfaceStrong: '#1E2A42',
  border: '#24304A',
  text: '#E7ECF5',
  textSecondary: '#AAB6CA',
  textMuted: '#8592A8',
  primary: '#5B8BF7',
  primaryPressed: '#4777E8',
  primarySoft: '#1A2A4D',
  onPrimary: '#FFFFFF',
  success: '#3FCB7E',
  successSoft: '#123524',
  warning: '#F2A94B',
  warningSoft: '#3A2A12',
  danger: '#F2685C',
  dangerSoft: '#3D1A18',
  teal: '#3CC2B2',
  tealSoft: '#123430',
  violet: '#A48BF5',
  violetSoft: '#2A2148',
  orange: '#F59E4C',
  orangeSoft: '#3A2410',
  shadow: '#000000',
  hero: '#1A3770',
  heroText: '#FFFFFF',
  heroMuted: '#B5C6E6',
  heroAccent: 'rgba(255,255,255,0.12)',
  notice: '#2B2214',
  noticeBorder: '#45361C',
};

export type Palette = typeof light;

/** The colours an icon tile or list icon can take: a strong colour on its soft ground. */
export type Accent = 'primary' | 'success' | 'warning' | 'danger' | 'teal' | 'violet' | 'orange';

export const accentColors = (p: Palette, accent: Accent) =>
  ({
    primary: [p.primarySoft, p.primary],
    success: [p.successSoft, p.success],
    warning: [p.warningSoft, p.warning],
    danger: [p.dangerSoft, p.danger],
    teal: [p.tealSoft, p.teal],
    violet: [p.violetSoft, p.violet],
    orange: [p.orangeSoft, p.orange],
  })[accent] as [string, string];

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** One type scale for the whole app: size and line height. */
export const type = {
  caption: { fontSize: 12, lineHeight: 16 },
  small: { fontSize: 13.5, lineHeight: 19 },
  body: { fontSize: 15, lineHeight: 22 },
  bodyLarge: { fontSize: 17, lineHeight: 24 },
  title: { fontSize: 20, lineHeight: 26 },
  heading: { fontSize: 26, lineHeight: 32 },
  display: { fontSize: 32, lineHeight: 38 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

/** The content column: on a tablet or a wide window it stops at 640pt and centres, so cards and lines stay readable. */
export const contentColumn = { width: '100%', maxWidth: 640, alignSelf: 'center' } as const;

export const radius = { sm: 8, md: 10, lg: 14, xl: 18, pill: 999 } as const;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
