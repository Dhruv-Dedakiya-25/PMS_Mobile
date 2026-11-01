import { IconFileCertificate, IconFileText, IconMail, IconReceipt, type Icon } from '@tabler/icons-react-native';

import type { DocumentKind } from '@/mock/data';
import type { Accent } from '@/theme/tokens';

export const documentLook: Record<DocumentKind, { icon: Icon; accent: Accent }> = {
  agreement: { icon: IconFileText, accent: 'primary' },
  receipt: { icon: IconReceipt, accent: 'success' },
  noc: { icon: IconFileCertificate, accent: 'violet' },
  letter: { icon: IconMail, accent: 'orange' },
};
