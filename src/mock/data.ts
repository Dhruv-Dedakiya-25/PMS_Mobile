// The tenant app's sample data, shaped like the PMS API's records. Each block names the API
// that will replace it; until then every screen reads from here (docs/MOCK_VS_REAL.md lists them).
// Dates count from today, so the sample never looks stale. Names, titles and descriptions are
// records, as the database would hold them, so they stay in English in every language.
import { dateDaysAgo, monthStart, omanToday } from './clock';

const dayBefore = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// ── Tenant · Tenant API (/Tenant), joined to the sign-in account ──────────────
export const tenant = {
  name: 'Ahmed Al Lawati',
  tenantCode: 'TEN-2024-0187',
  mobile: '+968 9123 4567',
  email: 'ahmed.lawati@example.com',
  nationality: 'Omani',
  occupants: 4,
};

// ── Property, building and unit · Property, Building, Unit APIs ──────────────
export const property = {
  name: 'GreenView Residences',
  building: 'Building A',
  floor: 12,
  unitNo: '1204',
  address: 'Al Mouj, Muscat, Oman',
  developer: 'GreenView Development LLC',
  completed: 2021,
  floors: 18,
  units: 216,
  lifts: 4,
  managementOffice: 'Ground floor, Building A',
};

export type UnitType = 'studio' | 'oneBed' | 'twoBed' | 'threeBed';

export const unit = {
  type: 'twoBed' as UnitType,
  areaSqm: 120,
  bedrooms: 2,
  bathrooms: 2,
  balcony: true,
  furnishing: 'semi' as 'unfurnished' | 'semi' | 'full',
  view: 'Sea view',
  moveIn: '',
};

// ── Lease · Lease API (/Lease) ───────────────────────────────────────────────
const leaseEnd = dayBefore(monthStart(-2));
export const lease = {
  leaseNo: 'LSE-2024-0412',
  title: 'Residential Tenancy Agreement',
  start: `${Number(leaseEnd.slice(0, 4)) - 2}-01-01`,
  end: leaseEnd,
  rent: 450,
  deposit: 900,
  noticeDays: 60,
  escalationPercent: 5,
  renewal: 'open' as RenewalStatus,
};
unit.moveIn = lease.start;

export type RenewalStatus = 'open' | 'requested' | 'offerSent' | 'renewed';

/** The yearly rent under the lease's escalation clause. */
export const escalation = [0, 1, 2].map((year) => ({
  from: `${Number(lease.start.slice(0, 4)) + year}-01-01`,
  rent: Math.round(lease.rent / (1 + lease.escalationPercent / 100) ** (2 - year)),
  percent: year === 0 ? 0 : lease.escalationPercent,
}));

// ── Parking · ParkingBay API ─────────────────────────────────────────────────
export const parking = [
  { bay: 'B12', level: 'Basement 1', kind: 'covered' as const, vehicle: 'Toyota Land Cruiser', plate: '12345 AB', tag: 'RFID-88231' },
];

// ── Rent · Invoice and Receipt APIs ──────────────────────────────────────────
export type PaymentMethod = 'card' | 'bankTransfer' | 'cheque';

export interface Payment {
  id: string;
  receiptNo: string;
  invoiceNo: string;
  forMonth: string;
  paidOn: string;
  amount: number;
  method: PaymentMethod;
}

export const initialPayments: Payment[] = [0, 1, 2, 3, 4, 5].map((back) => {
  const month = monthStart(back);
  const seq = 1342 - back;
  return {
    id: `p${back}`,
    receiptNo: `RCP-${month.slice(0, 4)}-0${seq - 400}`,
    invoiceNo: `INV-${month.slice(0, 4)}-${seq}`,
    forMonth: month,
    paidOn: `${month.slice(0, 8)}0${back % 3 === 0 ? 1 : 3}`,
    amount: lease.rent,
    method: back === 2 ? 'cheque' : back === 4 ? 'bankTransfer' : 'card',
  };
});

/** Rent for every month of the lease's final year: paid, due next, or still to come. */
export const rentalSchedule = Array.from({ length: 12 }, (_, i) => `${lease.end.slice(0, 4)}-${String(i + 1).padStart(2, '0')}-01`);

// ── Utilities · awaiting a utility billing API ───────────────────────────────
export type UtilityKind = 'electricity' | 'water' | 'cooling' | 'service';

export interface UtilityBill {
  kind: UtilityKind;
  account: string;
  provider: string;
  unit: string;
  amount: number;
  due: string;
  paid: boolean;
  /** The last six months' readings, oldest first. */
  usage: number[];
}

export const initialUtilities: UtilityBill[] = [
  { kind: 'electricity', account: 'EL-7781204', provider: 'Muscat Electricity Distribution', unit: 'kWh', amount: 24.6, due: dateDaysAgo(-9), paid: false, usage: [612, 655, 740, 868, 902, 820] },
  { kind: 'water', account: 'WT-5531204', provider: 'Nama Water Services', unit: 'm³', amount: 8.4, due: dateDaysAgo(-9), paid: false, usage: [14, 15, 17, 18, 19, 16] },
  { kind: 'cooling', account: 'DC-1204', provider: 'GreenView District Cooling', unit: 'TRh', amount: 38.25, due: dateDaysAgo(-14), paid: false, usage: [310, 342, 395, 461, 488, 430] },
  { kind: 'service', account: 'SC-A-1204', provider: 'GreenView Owners Association', unit: '', amount: 15, due: dateDaysAgo(-14), paid: true, usage: [15, 15, 15, 15, 15, 15] },
];

// ── Documents · TenantDocument API ───────────────────────────────────────────
export type DocumentKind = 'agreement' | 'receipt' | 'noc' | 'letter';

export const documents = [
  { id: 'd1', kind: 'agreement' as DocumentKind, title: 'Residential Tenancy Agreement', ref: lease.leaseNo, date: lease.start, pages: 12 },
  { id: 'd2', kind: 'agreement' as DocumentKind, title: 'Building Rules & Regulations', ref: 'GV-RULES-2024', date: lease.start, pages: 6 },
  ...initialPayments.slice(0, 3).map((p) => ({ id: `r-${p.id}`, kind: 'receipt' as DocumentKind, title: `Rent receipt · ${p.receiptNo}`, ref: p.receiptNo, date: p.paidOn, pages: 1 })),
  { id: 'd3', kind: 'noc' as DocumentKind, title: 'NOC — Electricity connection', ref: 'NOC-2024-0091', date: dateDaysAgo(640), pages: 1 },
  { id: 'd4', kind: 'noc' as DocumentKind, title: 'NOC — Vehicle registration', ref: 'NOC-2026-0217', date: dateDaysAgo(48), pages: 1 },
  { id: 'd5', kind: 'letter' as DocumentKind, title: 'Lease renewal notice', ref: 'GV-LTR-2026-118', date: dateDaysAgo(6), pages: 2 },
  { id: 'd6', kind: 'letter' as DocumentKind, title: 'Welcome letter', ref: 'GV-LTR-2024-004', date: lease.start, pages: 1 },
];

// ── Maintenance requests · ServiceRequest API (/ServiceRequest) ──────────────
export type RequestCategory = 'airConditioning' | 'plumbing' | 'electrical' | 'appliance' | 'carpentry' | 'pestControl' | 'cleaning' | 'other';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RequestStage = 'submitted' | 'assigned' | 'inProgress' | 'completed';

export interface MaintenanceRequest {
  id: string;
  requestNo: string;
  category: RequestCategory;
  priority: RequestPriority;
  description: string;
  raisedOn: string;
  stage: RequestStage;
  /** When each stage was reached, in order; a stage not reached yet has none. */
  stages: Partial<Record<RequestStage, string>>;
  technician?: { name: string; mobile: string; visit?: string };
  photos: string[];
}

export const stageOrder: RequestStage[] = ['submitted', 'assigned', 'inProgress', 'completed'];

export const initialRequests: MaintenanceRequest[] = [
  {
    id: 'sr3', requestNo: 'SR-2026-0142', category: 'airConditioning', priority: 'high',
    description: 'AC in the master bedroom is not cooling and drips water onto the floor.',
    raisedOn: dateDaysAgo(2), stage: 'inProgress',
    stages: { submitted: dateDaysAgo(2), assigned: dateDaysAgo(2), inProgress: dateDaysAgo(1) },
    technician: { name: 'Khalid Al Balushi', mobile: '+968 9234 5678', visit: dateDaysAgo(-1) }, photos: [],
  },
  {
    id: 'sr2', requestNo: 'SR-2026-0139', category: 'plumbing', priority: 'normal',
    description: 'Kitchen sink drains slowly.',
    raisedOn: dateDaysAgo(4), stage: 'assigned',
    stages: { submitted: dateDaysAgo(4), assigned: dateDaysAgo(3) },
    technician: { name: 'Rashid Al Hinai', mobile: '+968 9345 6789', visit: dateDaysAgo(-2) }, photos: [],
  },
  {
    id: 'sr1', requestNo: 'SR-2026-0117', category: 'electrical', priority: 'normal',
    description: 'Living room ceiling light flickers.',
    raisedOn: dateDaysAgo(19), stage: 'completed',
    stages: { submitted: dateDaysAgo(19), assigned: dateDaysAgo(19), inProgress: dateDaysAgo(18), completed: dateDaysAgo(18) },
    technician: { name: 'Khalid Al Balushi', mobile: '+968 9234 5678' }, photos: [],
  },
];

// ── Visitors · awaiting a visitor pass API ───────────────────────────────────
export type VisitPurpose = 'family' | 'friend' | 'delivery' | 'service' | 'other';
export type VisitStatus = 'expected' | 'arrived' | 'expired';

export interface Visitor {
  id: string;
  passNo: string;
  name: string;
  mobile: string;
  date: string;
  purpose: VisitPurpose;
  vehicle: string;
  status: VisitStatus;
}

export const initialVisitors: Visitor[] = [
  { id: 'v3', passNo: 'GST-8853', name: 'Fatima Al Zadjali', mobile: '+968 9456 7890', date: omanToday(), purpose: 'family', vehicle: '45678 MA', status: 'expected' },
  { id: 'v2', passNo: 'GST-8841', name: 'Talabat Delivery', mobile: '+968 9567 8901', date: dateDaysAgo(3), purpose: 'delivery', vehicle: '', status: 'arrived' },
  { id: 'v1', passNo: 'GST-8790', name: 'Yousuf Al Harthy', mobile: '+968 9678 9012', date: dateDaysAgo(12), purpose: 'friend', vehicle: '22110 RB', status: 'arrived' },
];

// ── Facilities · Facility API (/Facility) and a booking API still to come ────
export type FacilityKind = 'meetingRoom' | 'gym' | 'pool' | 'clubhouse' | 'bbq' | 'court' | 'guestParking';

export interface Facility {
  id: string;
  kind: FacilityKind;
  name: string;
  location: string;
  fee: number;
  capacity: number;
  opens: string;
  closes: string;
}

export const facilities: Facility[] = [
  { id: 'f1', kind: 'meetingRoom', name: 'Meeting Room', location: 'Level 1', fee: 0, capacity: 12, opens: '08:00', closes: '22:00' },
  { id: 'f2', kind: 'gym', name: 'Gym', location: 'Level 3', fee: 0, capacity: 20, opens: '05:00', closes: '23:00' },
  { id: 'f3', kind: 'pool', name: 'Swimming Pool', location: 'Outdoor', fee: 0, capacity: 30, opens: '06:00', closes: '22:00' },
  { id: 'f4', kind: 'clubhouse', name: 'Clubhouse', location: 'Level 1', fee: 25, capacity: 60, opens: '09:00', closes: '23:00' },
  { id: 'f5', kind: 'bbq', name: 'BBQ Area', location: 'Outdoor', fee: 0, capacity: 15, opens: '16:00', closes: '23:00' },
  { id: 'f6', kind: 'court', name: 'Padel Court', location: 'Rooftop', fee: 5, capacity: 4, opens: '06:00', closes: '22:00' },
  { id: 'f7', kind: 'guestParking', name: 'Guest Parking', location: 'Basement 1', fee: 0, capacity: 1, opens: '00:00', closes: '23:59' },
];

export interface Booking {
  id: string;
  facilityId: string;
  date: string;
  slot: string;
  guests: number;
}

export const initialBookings: Booking[] = [{ id: 'b1', facilityId: 'f5', date: dateDaysAgo(-4), slot: '18:00–20:00', guests: 8 }];

// ── Move-in / move-out · awaiting an inspection API ──────────────────────────
export type Condition = 'good' | 'fair' | 'damaged';

export const moveIn = {
  date: lease.start,
  inspectedBy: 'Salim Al Rashdi',
  keys: 3,
  accessCards: 2,
  meters: { electricity: 18240, water: 412 },
  checklist: [
    { area: 'livingRoom', condition: 'good' as Condition },
    { area: 'kitchen', condition: 'good' as Condition },
    { area: 'masterBedroom', condition: 'good' as Condition },
    { area: 'secondBedroom', condition: 'fair' as Condition, note: 'Small scratch on the wardrobe door' },
    { area: 'bathrooms', condition: 'good' as Condition },
    { area: 'balcony', condition: 'good' as Condition },
    { area: 'appliances', condition: 'good' as Condition },
  ],
};

export type MoveOutStep = 'notice' | 'inspection' | 'clearance' | 'handover' | 'refund';
export const moveOutSteps: MoveOutStep[] = ['notice', 'inspection', 'clearance', 'handover', 'refund'];

// ── Digital access · awaiting an access control API ──────────────────────────
export const accessCards = [
  { id: 'c1', number: 'AC-0045821', holder: 'Ahmed Al Lawati', zones: ['Lobby A', 'Lift A', 'Gym', 'Pool', 'Parking B1'], expires: lease.end, active: true },
  { id: 'c2', number: 'AC-0045822', holder: 'Maryam Al Lawati', zones: ['Lobby A', 'Lift A', 'Pool'], expires: lease.end, active: true },
];

// ── Announcements · awaiting an Announcement API ─────────────────────────────
export type AnnouncementKind = 'notice' | 'event' | 'rule';

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  date: string;
  icon: 'maintenance' | 'fire' | 'event' | 'hours' | 'rule' | 'water';
  needsAck?: boolean;
}

export const announcements: Announcement[] = [
  {
    id: 'a1', kind: 'notice', icon: 'maintenance', title: 'Annual Maintenance', date: dateDaysAgo(-14),
    body: 'Building maintenance will be carried out on the date shown from 9:00 AM to 5:00 PM. Lifts in Building A will run one at a time and the lobby air conditioning will be off for two hours around midday.',
    needsAck: true,
  },
  {
    id: 'a2', kind: 'notice', icon: 'fire', title: 'Fire Drill', date: dateDaysAgo(-9),
    body: 'A fire drill will be conducted for all residents at 10:00 AM. When the alarm sounds, leave by the nearest staircase and gather at the assembly point beside the main gate. The drill lasts about twenty minutes.',
    needsAck: true,
  },
  {
    id: 'a3', kind: 'event', icon: 'event', title: 'Community Event', date: dateDaysAgo(-4),
    body: 'Join us for the community gathering at the clubhouse this Friday from 6:00 PM. Light dinner, activities for children and a chance to meet your neighbours. All residents and their families are welcome.',
  },
  {
    id: 'a4', kind: 'notice', icon: 'hours', title: 'New Facility Hours', date: omanToday(),
    body: 'The gym and pool now open from 6:00 AM to 10:00 PM every day. The gym stays open until 11:00 PM on Thursdays and Fridays.',
  },
  {
    id: 'a5', kind: 'rule', icon: 'rule', title: 'Pool Rules', date: dateDaysAgo(30),
    body: 'Children under 12 must be accompanied by an adult. No glass near the pool deck. Please shower before swimming and use the towels provided.',
  },
  {
    id: 'a6', kind: 'rule', icon: 'rule', title: 'Quiet Hours', date: dateDaysAgo(60),
    body: 'Quiet hours run from 11:00 PM to 7:00 AM. Renovation work and moving furniture are allowed from 8:00 AM to 6:00 PM, Sunday to Thursday.',
  },
  {
    id: 'a7', kind: 'notice', icon: 'water', title: 'Water Tank Cleaning', date: dateDaysAgo(9),
    body: 'Water tanks for Building A were cleaned and the supply has been restored. If your water looks cloudy, run the taps for a few minutes.',
  },
];

// ── Notifications · awaiting a Notification API ──────────────────────────────
export type NotificationKind = 'payment' | 'lease' | 'maintenance' | 'visitor' | 'announcement';

export const initialNotifications = [
  { id: 'n1', kind: 'maintenance' as NotificationKind, title: 'Technician on the way', body: 'Khalid Al Balushi will visit tomorrow for SR-2026-0142 (air conditioning).', at: dateDaysAgo(0), read: false, href: '/requests/maintenance/sr3' },
  { id: 'n2', kind: 'payment' as NotificationKind, title: 'Utility bills ready', body: 'Electricity and water bills for this month are ready to pay.', at: dateDaysAgo(1), read: false, href: '/utilities' },
  { id: 'n3', kind: 'lease' as NotificationKind, title: 'Lease renewal is open', body: 'Your lease ends soon. Send a renewal request to keep your home.', at: dateDaysAgo(6), read: false, href: '/lease' },
  { id: 'n4', kind: 'visitor' as NotificationKind, title: 'Visitor arrived', body: 'Talabat Delivery checked in at Gate 1.', at: dateDaysAgo(3), read: true, href: '/requests/visitors' },
  { id: 'n5', kind: 'announcement' as NotificationKind, title: 'Fire drill scheduled', body: 'A fire drill is planned for all residents. Tap to read the details.', at: dateDaysAgo(5), read: true, href: '/announcements/a2' },
  { id: 'n6', kind: 'payment' as NotificationKind, title: 'Payment received', body: 'Thank you. We received your rent payment.', at: monthStart(0), read: true, href: '/payments/history' },
];

// ── Contacts · awaiting a Property contacts API ──────────────────────────────
export type ContactRole = 'propertyManager' | 'maintenanceDesk' | 'security' | 'reception' | 'emergency';

export const contacts = [
  { role: 'propertyManager' as ContactRole, name: 'Salim Al Rashdi', phone: '+968 2449 1100', email: 'manager@greenview.om', hours: 'Sun–Thu · 08:00–17:00' },
  { role: 'maintenanceDesk' as ContactRole, name: 'GreenView Maintenance', phone: '+968 2449 1122', email: 'maintenance@greenview.om', hours: '24/7' },
  { role: 'reception' as ContactRole, name: 'Lobby Reception', phone: '+968 2449 1101', email: 'reception@greenview.om', hours: '24/7' },
  { role: 'security' as ContactRole, name: 'Security Control Room', phone: '+968 2449 1199', email: 'security@greenview.om', hours: '24/7' },
  { role: 'emergency' as ContactRole, name: 'Royal Oman Police', phone: '9999', email: '', hours: '24/7' },
];
