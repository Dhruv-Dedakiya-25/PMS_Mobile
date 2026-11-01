import { IconBell, IconCalendarEvent, IconClock, IconDroplet, IconGavel, IconSpeakerphone, type Icon } from '@tabler/icons-react-native';

import type { Announcement } from '@/mock/data';
import type { Accent } from '@/theme/tokens';

/** Each kind of announcement's symbol and colour, as in the design: maintenance blue, fire drill red, events violet. */
export const announcementLook: Record<Announcement['icon'], { icon: Icon; accent: Accent }> = {
  maintenance: { icon: IconSpeakerphone, accent: 'primary' },
  fire: { icon: IconBell, accent: 'danger' },
  event: { icon: IconCalendarEvent, accent: 'violet' },
  hours: { icon: IconClock, accent: 'success' },
  rule: { icon: IconGavel, accent: 'orange' },
  water: { icon: IconDroplet, accent: 'teal' },
};
