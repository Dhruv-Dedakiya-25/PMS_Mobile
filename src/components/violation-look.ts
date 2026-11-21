import type { Accent } from '@/theme/tokens';

/** A violation's status as a coloured pill, the same colours as the website. */
export const violationAccent: Record<string, Accent> = {
  Open: 'danger', NoticeSent: 'warning', Disputed: 'warning', Paid: 'success', Waived: 'teal', Cancelled: 'teal',
};

/** An appeal's or question's status. */
export const appealAccent: Record<string, Accent> = {
  Pending: 'warning', Accepted: 'success', Rejected: 'danger', Answered: 'primary',
};
