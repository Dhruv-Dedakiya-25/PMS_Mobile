// The sample's state while the app runs: whether someone is signed in, and the records the
// screens add or change as the API would (a request raised, a visitor invited, a bill paid).
// Lost when the app restarts.
import { useSyncExternalStore } from 'react';

import { omanToday } from './clock';
import {
  type Booking, type MaintenanceRequest, type RenewalStatus, type RequestCategory, type RequestPriority, type UtilityKind, type Visitor,
  initialBookings, initialNotifications, initialPayments, initialRequests, initialUtilities, initialVisitors, lease,
} from './data';

export interface MockState {
  signedIn: boolean;
  requests: MaintenanceRequest[];
  visitors: Visitor[];
  bookings: Booking[];
  utilities: typeof initialUtilities;
  payments: typeof initialPayments;
  notifications: typeof initialNotifications;
  renewal: RenewalStatus;
  moveOutRequested?: string;
  acknowledged: string[];
}

let state: MockState = {
  signedIn: false,
  requests: initialRequests,
  visitors: initialVisitors,
  bookings: initialBookings,
  utilities: initialUtilities,
  payments: initialPayments,
  notifications: initialNotifications,
  renewal: lease.renewal,
  acknowledged: [],
};
const listeners = new Set<() => void>();

function update(next: Partial<MockState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useMockState = () => useSyncExternalStore(subscribe, () => state);

export const signIn = () => update({ signedIn: true });
export const signOut = () => update({ signedIn: false });

let seq = 143;

export function raiseRequest(input: { category: RequestCategory; priority: RequestPriority; description: string; photos: string[] }) {
  const request: MaintenanceRequest = {
    ...input,
    id: `sr${seq}`,
    requestNo: `SR-${omanToday().slice(0, 4)}-0${seq++}`,
    raisedOn: omanToday(),
    stage: 'submitted',
    stages: { submitted: omanToday() },
  };
  update({ requests: [request, ...state.requests] });
  return request;
}

export function inviteVisitor(input: Omit<Visitor, 'id' | 'passNo' | 'status'>) {
  const visitor: Visitor = { ...input, id: `v${Date.now()}`, passNo: `GST-${8854 + state.visitors.length}`, status: 'expected' };
  update({ visitors: [visitor, ...state.visitors] });
  return visitor;
}

export function book(input: Omit<Booking, 'id'>) {
  const booking: Booking = { ...input, id: `b${Date.now()}` };
  update({ bookings: [booking, ...state.bookings] });
  return booking;
}

export const cancelBooking = (id: string) => update({ bookings: state.bookings.filter((b) => b.id !== id) });

/** Rent paid now covers the month it is next due for. */
export function payRent(method: (typeof initialPayments)[number]['method'], forMonth: string) {
  const year = omanToday().slice(0, 4);
  const no = 1343 + state.payments.length - initialPayments.length;
  const payment = { id: `p${Date.now()}`, receiptNo: `RCP-${year}-0${no - 400}`, invoiceNo: `INV-${year}-${no}`, forMonth, paidOn: omanToday(), amount: lease.rent, method };
  update({ payments: [payment, ...state.payments] });
  return payment;
}

export const payUtility = (kind: UtilityKind) => update({ utilities: state.utilities.map((u) => (u.kind === kind ? { ...u, paid: true } : u)) });

export const requestRenewal = () => update({ renewal: 'requested' });

export const requestMoveOut = () => update({ moveOutRequested: omanToday() });

export const acknowledge = (id: string) => update({ acknowledged: [...state.acknowledged, id] });

export const markAllRead = () => update({ notifications: state.notifications.map((n) => ({ ...n, read: true })) });

export const markRead = (id: string) => update({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) });

/** Utility bills not yet paid. */
export const unpaidUtilities = (s: MockState) => s.utilities.filter((u) => !u.paid);

/** The month the next rent payment covers: the first month from now with no payment against it. */
export const nextRentMonth = (s: MockState) => {
  const paid = new Set(s.payments.map((p) => p.forMonth));
  let month = `${omanToday().slice(0, 7)}-01`;
  while (paid.has(month)) {
    const d = new Date(`${month}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    month = d.toISOString().slice(0, 10);
  }
  return month;
};
