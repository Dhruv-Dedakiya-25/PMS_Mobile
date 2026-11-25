import {
  IconAirConditioning,
  IconBolt,
  IconBug,
  IconDoor,
  IconDots,
  IconDroplet,
  IconSparkles,
  IconTool,
  IconWashMachine,
  type Icon,
} from '@tabler/icons-react-native';

import type { RequestCategory } from '@/mock/data';

export const categoryIcon: Record<RequestCategory, Icon> = {
  airConditioning: IconAirConditioning,
  plumbing: IconDroplet,
  electrical: IconBolt,
  appliance: IconWashMachine,
  carpentry: IconDoor,
  pestControl: IconBug,
  cleaning: IconSparkles,
  other: IconDots,
};

export function getCategoryIcon(code?: string | null): Icon {
  if (code && Object.prototype.hasOwnProperty.call(categoryIcon, code)) {
    return categoryIcon[code as RequestCategory];
  }
  return IconTool;
}
