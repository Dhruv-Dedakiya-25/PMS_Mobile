import { IconAirConditioning, IconBolt, IconBug, IconDoor, IconDots, IconDroplet, IconSparkles, IconWashMachine, type Icon } from '@tabler/icons-react-native';

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
