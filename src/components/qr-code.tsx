import QRCode from 'qrcode';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** A scannable QR code for the text, drawn as one path of dark modules on white with a quiet border. */
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const { count, d } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
    let path = '';
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) path += `M${x + 2} ${y + 2}h1v1h-1z`;
    return { count: modules.size + 4, d: path };
  }, [value]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel={value}>
      <Rect x={0} y={0} width={count} height={count} fill="#FFFFFF" />
      <Path d={d} fill="#0F1B33" />
    </Svg>
  );
}
