import { IconBolt, IconBuildingCommunity, IconDroplet, IconSnowflake, type Icon } from '@tabler/icons-react-native';

import type { UtilityKind } from '@/mock/data';
import type { Accent } from '@/theme/tokens';

/** Each utility's symbol and colour. */
export const utilityLook: Record<UtilityKind, { icon: Icon; accent: Accent }> = {
  electricity: { icon: IconBolt, accent: 'orange' },
  water: { icon: IconDroplet, accent: 'primary' },
  cooling: { icon: IconSnowflake, accent: 'teal' },
  service: { icon: IconBuildingCommunity, accent: 'violet' },
};
