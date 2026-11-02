// Drawn artwork in place of photographs: the residence, the GreenView mark and the facility
// tiles. A real photo can replace any of them later by swapping the component for an <Image>.
import {
  IconBallTennis, IconBarbell, IconBuildingCommunity, IconGrill, IconParking, IconPresentation, IconSwimming, type Icon,
} from '@tabler/icons-react-native';
import { useId } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { FacilityKind } from '@/mock/data';

const FLOOR = 11;

// Gradient ids are global on the web page, and a gradient inside a hidden screen (a tab not on
// show) stops painting for every drawing that names it, so each drawing gets its own ids.
const useIds = () => useId().replace(/[^a-zA-Z0-9]/g, '');

/** One tower: a pale facade with a band of blue glass on every floor and a roof cap. */
function Tower({ x, y, w, base, glass, facade, shade }: { x: number; y: number; w: number; base: number; glass: string; facade: string; shade: string }) {
  const floors = Math.floor((base - y - 14) / FLOOR);
  return (
    <G>
      <Rect x={x} y={y} width={w} height={base - y} fill={facade} />
      <Rect x={x + w - w * 0.16} y={y} width={w * 0.16} height={base - y} fill={shade} opacity={0.5} />
      <Rect x={x - 3} y={y - 6} width={w + 6} height={7} rx={1.5} fill={shade} />
      {Array.from({ length: floors }, (_, i) => {
        const fy = y + 8 + i * FLOOR;
        return (
          <G key={i}>
            <Rect x={x + 4} y={fy} width={w - 8} height={6.5} fill={glass} opacity={0.92} />
            <Rect x={x + 2} y={fy + 6.5} width={w - 4} height={1.4} fill="#FFFFFF" opacity={0.9} />
            {Array.from({ length: Math.floor((w - 8) / 9) }, (__, j) => (
              <Rect key={j} x={x + 4 + (j + 1) * 9} y={fy} width={0.9} height={6.5} fill={facade} opacity={0.8} />
            ))}
          </G>
        );
      })}
    </G>
  );
}

/** A palm: a leaning trunk and a crown of fronds. */
function Palm({ x, y, h, lean = 4 }: { x: number; y: number; h: number; lean?: number }) {
  const tx = x + lean;
  const ty = y - h;
  const fronds = [
    [-26, 6], [-20, -8], [-8, -14], [8, -14], [20, -8], [26, 6], [-14, 12], [14, 12],
  ];
  return (
    <G>
      <Path d={`M${x} ${y} Q${x + lean * 0.2} ${y - h * 0.55} ${tx} ${ty}`} stroke="#8A6A47" strokeWidth={3.2} fill="none" strokeLinecap="round" />
      {fronds.map(([dx, dy], i) => (
        <Path
          key={i}
          d={`M${tx} ${ty} Q${tx + dx * 0.55} ${ty + dy - 9} ${tx + dx} ${ty + dy + 4}`}
          stroke={i % 2 ? '#2F7A4B' : '#3E9460'}
          strokeWidth={3.6}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </G>
  );
}

/**
 * GreenView Residences: three towers in a garden with palms and a pool, under a morning sky.
 * Drawn to fill any box: it crops at the sides and keeps the ground in view.
 */
export function BuildingScene({ style }: { style?: ViewStyle }) {
  const id = useIds();
  return (
    <View style={[{ overflow: 'hidden' }, style]} accessibilityIgnoresInvertColors>
      <Svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice">
        <Defs>
          <LinearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7DB6EC" />
            <Stop offset="0.75" stopColor="#E3F0FB" />
          </LinearGradient>
          <RadialGradient id={`sun${id}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFF7E0" stopOpacity={0.95} />
            <Stop offset="1" stopColor="#FFF7E0" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`glass${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#4C7FB8" />
            <Stop offset="1" stopColor="#8DB8E2" />
          </LinearGradient>
          <LinearGradient id={`glass2${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#5A88BC" />
            <Stop offset="1" stopColor="#A4C6E8" />
          </LinearGradient>
          <LinearGradient id={`lawn${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8CC37F" />
            <Stop offset="1" stopColor="#5E9F5E" />
          </LinearGradient>
          <LinearGradient id={`pool${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7FD3EE" />
            <Stop offset="1" stopColor="#3BA9D6" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={400} height={240} fill={`url(#sky${id})`} />
        <Ellipse cx={330} cy={46} rx={90} ry={70} fill={`url(#sun${id})`} />
        <Ellipse cx={70} cy={40} rx={34} ry={9} fill="#FFFFFF" opacity={0.7} />
        <Ellipse cx={96} cy={34} rx={22} ry={8} fill="#FFFFFF" opacity={0.6} />
        <Ellipse cx={300} cy={28} rx={26} ry={7} fill="#FFFFFF" opacity={0.55} />

        {/* the city behind */}
        <Rect x={0} y={128} width={34} height={80} fill="#C3D6EA" />
        <Rect x={30} y={110} width={26} height={100} fill="#B6CCE4" />
        <Rect x={352} y={118} width={30} height={90} fill="#B6CCE4" />
        <Rect x={378} y={138} width={30} height={70} fill="#C3D6EA" />

        <Tower x={54} y={96} w={66} base={206} glass={`url(#glass2${id})`} facade="#F2EEE6" shade="#D9D2C4" />
        <Tower x={268} y={74} w={84} base={206} glass={`url(#glass2${id})`} facade="#F2EEE6" shade="#D9D2C4" />
        <Tower x={140} y={30} w={112} base={208} glass={`url(#glass${id})`} facade="#FBF8F2" shade="#DED6C7" />
        {/* the entrance canopy */}
        <Rect x={170} y={190} width={52} height={5} rx={2} fill="#C9BBA2" />
        <Rect x={182} y={195} width={28} height={13} fill="#3E5F86" />

        <Rect x={0} y={204} width={400} height={36} fill={`url(#lawn${id})`} />
        <Rect x={118} y={216} width={164} height={14} rx={7} fill={`url(#pool${id})`} />
        <Line x1={130} y1={221} x2={180} y2={221} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.6} strokeLinecap="round" />
        <Line x1={210} y1={225} x2={262} y2={225} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.5} strokeLinecap="round" />
        {[18, 44, 96, 300, 336, 382].map((x) => (
          <Ellipse key={x} cx={x} cy={207} rx={16} ry={7} fill="#4E8F55" />
        ))}

        <Palm x={36} y={214} h={70} lean={6} />
        <Palm x={106} y={216} h={52} lean={-4} />
        <Palm x={300} y={216} h={56} lean={5} />
        <Palm x={362} y={214} h={78} lean={-7} />
      </Svg>
    </View>
  );
}

/** GreenView's mark: three towers drawn in navy line, with a leaf for the gardens. */
export function GreenViewMark({ size = 72, color = '#1D3F7A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * 0.875} viewBox="0 0 64 56" accessibilityLabel="GreenView">
      <G stroke={color} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <Path d="M6 52 H58" />
        <Path d="M12 52 V22 H24" />
        <Path d="M24 52 V8 H40 V52" />
        <Path d="M40 18 H52 V52" />
        <Path d="M29 14 V46 M35 14 V46" />
        <Path d="M17 28 V46 M46 24 V46" />
      </G>
      <Path d="M45 13 C46 6 52 3 58 4 C57 10 52 14 45 13 Z" fill="#3E9460" />
      <Path d="M45 13 L53 7" stroke="#FFFFFF" strokeWidth={1} strokeLinecap="round" />
    </Svg>
  );
}

const facilityLook: Record<FacilityKind, { icon: Icon; from: string; to: string }> = {
  meetingRoom: { icon: IconPresentation, from: '#4F7BC0', to: '#8AB0E3' },
  gym: { icon: IconBarbell, from: '#3D4A63', to: '#7B88A3' },
  pool: { icon: IconSwimming, from: '#1E9AD0', to: '#7FD3EE' },
  clubhouse: { icon: IconBuildingCommunity, from: '#B0742F', to: '#E5B26B' },
  bbq: { icon: IconGrill, from: '#C2552B', to: '#F09A5E' },
  court: { icon: IconBallTennis, from: '#2F8A57', to: '#7FC79A' },
  guestParking: { icon: IconParking, from: '#5B4BC4', to: '#9D90E8' },
};

/** A facility's picture: its colour and symbol on a soft gradient, with a horizon line for depth. */
export function FacilityArt({ kind, width = 76, height = 60, rounded = 12 }: { kind: FacilityKind; width?: number | `${number}%`; height?: number; rounded?: number }) {
  const look = facilityLook[kind];
  const Glyph = look.icon;
  const id = `f${useIds()}`;
  return (
    <View style={{ width, height, borderRadius: rounded, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }} accessibilityIgnoresInvertColors>
      <Svg width="100%" height="100%" viewBox="0 0 100 80" preserveAspectRatio="none" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={look.from} />
            <Stop offset="1" stopColor={look.to} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={80} fill={`url(#${id})`} />
        <Ellipse cx={86} cy={8} rx={34} ry={22} fill="#FFFFFF" opacity={0.14} />
        <Path d="M0 62 Q30 54 60 60 T100 56 V80 H0 Z" fill="#FFFFFF" opacity={0.16} />
      </Svg>
      {/* In a View of its own, so on the web it paints above the absolutely placed gradient. */}
      <View>
        <Glyph size={Math.min(height * 0.45, 64)} color="#FFFFFF" strokeWidth={1.6} />
      </View>
    </View>
  );
}

/** A page of a document in miniature: a heading bar and lines of text, as the lease card shows its agreement. */
export function PaperThumb({ width = 64 }: { width?: number }) {
  const height = width * 1.3;
  return (
    <View
      style={{ width, height, borderRadius: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9E0EA', padding: width * 0.12, gap: width * 0.06, shadowColor: '#0F1B33', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}
      accessibilityIgnoresInvertColors>
      <View style={{ height: width * 0.07, width: '60%', backgroundColor: '#1F5BB8', borderRadius: 1, alignSelf: 'center', marginBottom: width * 0.04 }} />
      {[100, 92, 96, 70, 100, 88, 94, 60].map((w, i) => (
        <View key={i} style={{ height: Math.max(1.5, width * 0.035), width: `${w}%`, backgroundColor: '#C9D2DE', borderRadius: 1 }} />
      ))}
    </View>
  );
}
