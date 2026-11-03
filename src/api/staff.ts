import { apiDelete, apiGet, apiPost, apiPut } from './client';

export interface StaffDashboardServiceRequestItem {
  id: string;
  ticketNumber: string;
  category: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: 'Open' | 'InProgress' | 'OnHold' | 'Resolved' | 'Closed';
  tenantName?: string;
  unitCode?: string;
  createdAtUtc: string;
}

export interface StaffDashboardSummary {
  asOf: string;
  companyName?: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  activeLeases: number;
  leasesSignedThisMonth: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  renewalsAwaitingReview: number;
  monthlyRentRoll: number;
  averageRentPerLease: number;
  billedThisMonth: number;
  billedLastMonth: number;
  billedChangePercent: number | null;
  collectedThisMonth: number;
  collectionRate: number | null;
  outstanding: number;
  overdue: number;
  overdueAccounts: number;
  outstandingOver60Days: number;
  aging: { current: number; days1To30: number; days31To60: number; days61To90: number; over90Days: number };
  depositsHeld: number;
  openServiceRequests: number;
  urgentServiceRequests: number;
  priorityRequests: StaffDashboardServiceRequestItem[];
}

export interface StaffTicket {
  id: string;
  ticketNumber: string;
  tenantId?: string;
  propertyId?: string;
  unitId?: string;
  category: string;
  subcategory?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  description: string;
  preferredVisitTime?: string;
  status: 'Open' | 'InProgress' | 'OnHold' | 'Resolved' | 'Closed';
  assignedTo?: string;
  rating?: number;
  resolvedOn?: string;
  createdAtUtc?: string;
  isActive: boolean;
}

export interface StaffProperty {
  id: string;
  companyId: string;
  ownerId?: string;
  propertyCode: string;
  propertyNameEn: string;
  propertyNameAr?: string;
  propertyTypeId: string;
  addressLine1: string;
  city?: string;
  countryCode: string;
  isActive: boolean;
}

export interface StaffUnit {
  id: string;
  propertyId: string;
  buildingId?: string;
  unitTypeId: string;
  unitCode: string;
  unitNameEn?: string;
  unitNameAr?: string;
  status: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  isActive: boolean;
}

export interface StaffFacility {
  id: string;
  propertyId: string;
  facilityCode: string;
  nameEn: string;
  nameAr?: string;
  bookable: boolean;
  isActive: boolean;
}

export interface StaffLease {
  id: string;
  leaseNumber: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  status: string;
  // Empty on a lease that is still a draft.
  startDate: string | null;
  endDate: string | null;
  rentAmount: number;
  rentFrequency: string;
  isActive: boolean;
}

export interface StaffTenant {
  id: string;
  tenantNumber: string;
  displayNameEn: string;
  displayNameAr?: string;
  primaryMobile: string;
  primaryEmail?: string;
  isActive: boolean;
}

export interface StaffInvoice {
  id: string;
  invoiceNumber: string;
  propertyId: string;
  tenantId: string;
  leaseId?: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  currencyCode: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  notes?: string;
}

export interface StaffReceipt {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  paymentMethod: string;
  amount: number;
  currencyCode: string;
  referenceNo?: string;
  status: string;
  notes?: string;
  invoiceId?: string;
  tenantId?: string;
}

export interface StaffInstallment {
  id: string;
  leaseId: string;
  installmentNo: number;
  dueDate: string;
  totalDue: number;
  status: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Calls GET /api/Dashboard/getDashboardSummary (PropertyManager & SuperAdmin only). */
export const getStaffDashboardSummary = () => apiGet<StaffDashboardSummary>('/Dashboard/getDashboardSummary');

/** Service request CRUD */
export const getStaffTickets = () => apiGet<StaffTicket[]>('/ServiceRequest/getServiceRequest');
export const getStaffTicket = (id: string) => apiGet<StaffTicket>(`/ServiceRequest/getServiceRequest/${id}`);
export const createStaffTicket = (ticket: Partial<StaffTicket>) =>
  apiPost<StaffTicket>('/ServiceRequest/createServiceRequest', ticket);
export const updateStaffTicket = (id: string, ticket: Partial<StaffTicket>) =>
  apiPut<void>(`/ServiceRequest/updateServiceRequest/${id}`, ticket);
export const deleteStaffTicket = (id: string) => apiDelete(`/ServiceRequest/deleteServiceRequest/${id}`);

/** Properties, Units, Facilities */
export const getStaffProperties = () => apiGet<StaffProperty[]>('/Property/getProperty');
export const getStaffUnits = () => apiGet<StaffUnit[]>('/Unit/getUnit');
export const getStaffFacilities = () => apiGet<StaffFacility[]>('/Facility/getFacility');

/** Leases & Tenants */
export const getStaffLeases = () => apiGet<StaffLease[]>('/Lease/getLease');
export const getStaffTenants = () => apiGet<StaffTenant[]>('/Tenant/getTenant');

/** Finance */
export const getStaffInvoices = () =>
  apiGet<PagedResult<StaffInvoice>>('/Invoice/getInvoicePaged?page=1&pageSize=50').then((r) => r.items ?? []);
export const getStaffReceipts = () =>
  apiGet<PagedResult<StaffReceipt>>('/Receipt/getReceiptPaged?page=1&pageSize=50').then((r) => r.items ?? []);
export const createStaffReceipt = (receipt: Partial<StaffReceipt>) =>
  apiPost<StaffReceipt>('/Receipt/createReceipt', receipt);
export const getStaffInstallments = () =>
  apiGet<PagedResult<StaffInstallment>>('/Installment/getInstallmentPaged?page=1&pageSize=50').then((r) => r.items ?? []);

// ==========================================
// Sample data for areas with no live API yet
// (Assets, Inspections, Work Orders, Approvals, Notices)
// ==========================================

export interface SampleWorkOrder {
  id: string;
  ticketNumber: string;
  assetName: string;
  technicianName: string;
  status: 'Pending' | 'Scheduled' | 'InProgress' | 'Completed';
  cost: number;
  isSample: true;
}

export interface SampleAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  status: 'Operational' | 'Maintenance' | 'Critical';
  isSample: true;
}

export interface SampleInspection {
  id: string;
  title: string;
  scheduledDate: string;
  inspector: string;
  status: 'Scheduled' | 'Passed' | 'ActionRequired';
  isSample: true;
}

export interface SampleApproval {
  id: string;
  type: string;
  title: string;
  requester: string;
  amount?: number;
  requestedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  isSample: true;
}

export interface SampleStaffNotice {
  id: string;
  title: string;
  date: string;
  category: string;
  target: string;
  body: string;
  isSample: true;
}

export const SAMPLE_WORK_ORDERS: SampleWorkOrder[] = [
  { id: '1', ticketNumber: 'TKT-1042', assetName: 'Main Chiller #2', technicianName: 'Rashid Al-Kiyumi', status: 'InProgress', cost: 120, isSample: true },
  { id: '2', ticketNumber: 'TKT-1048', assetName: 'Water Pump Unit 4B', technicianName: 'Salim Al-Harthy', status: 'Scheduled', cost: 65, isSample: true },
  { id: '3', ticketNumber: 'TKT-1051', assetName: 'Elevator Passenger #1', technicianName: 'Otis Tech Service', status: 'Pending', cost: 340, isSample: true },
  { id: '4', ticketNumber: 'TKT-1039', assetName: 'Lobby Fire Damper', technicianName: 'Rashid Al-Kiyumi', status: 'Completed', cost: 45, isSample: true },
];

export const SAMPLE_ASSETS: SampleAsset[] = [
  { id: '1', code: 'AST-CHL-01', name: 'Rooftop Chiller 1', category: 'HVAC', location: 'Tower A Roof', status: 'Operational', isSample: true },
  { id: '2', code: 'AST-CHL-02', name: 'Rooftop Chiller 2', category: 'HVAC', location: 'Tower A Roof', status: 'Maintenance', isSample: true },
  { id: '3', code: 'AST-PMP-01', name: 'Booster Water Pump A', category: 'Plumbing', location: 'Basement 1', status: 'Operational', isSample: true },
  { id: '4', code: 'AST-GEN-01', name: 'Backup Generator 500kVA', category: 'Electrical', location: 'Power Room B2', status: 'Operational', isSample: true },
  { id: '5', code: 'AST-LOB-01', name: 'Lobby Automatic Doors', category: 'Access', location: 'Ground Floor', status: 'Operational', isSample: true },
];

export const SAMPLE_INSPECTIONS: SampleInspection[] = [
  { id: '1', title: 'Quarterly Fire Safety System Check', scheduledDate: '2026-11-15', inspector: 'Civil Defense Team', status: 'Scheduled', isSample: true },
  { id: '2', title: 'HVAC Seasonal Filter & Pressure Audit', scheduledDate: '2026-11-08', inspector: 'Facility Team A', status: 'Scheduled', isSample: true },
  { id: '3', title: 'Swimming Pool Water Chemistry & Pump', scheduledDate: '2026-11-01', inspector: 'Rashid Al-Kiyumi', status: 'Passed', isSample: true },
  { id: '4', title: 'Emergency Lighting & Exit Sign Battery', scheduledDate: '2026-10-25', inspector: 'Safety Officer', status: 'ActionRequired', isSample: true },
];

export const SAMPLE_APPROVALS: SampleApproval[] = [
  { id: '1', type: 'Lease Renewal', title: 'Lease Renewal: Unit 304 - Salim Al-Balushi', requester: 'Property Manager', amount: 4800, requestedDate: '2026-11-02', status: 'Pending', isSample: true },
  { id: '2', type: 'Expense Approval', title: 'Chiller Compressor Replacement Parts', requester: 'Maintenance Lead', amount: 650, requestedDate: '2026-11-01', status: 'Pending', isSample: true },
  { id: '3', type: 'Deposit Refund', title: 'Security Deposit Refund: Unit 102 Move-out', requester: 'Finance Clerk', amount: 350, requestedDate: '2026-10-30', status: 'Approved', isSample: true },
  { id: '4', type: 'Tenant Request', title: 'Commercial Unit Interior Fitout Permit', requester: 'Retail Tenant Corp', requestedDate: '2026-10-28', status: 'Pending', isSample: true },
];

export const SAMPLE_STAFF_NOTICES: SampleStaffNotice[] = [
  { id: '1', title: 'Scheduled Generator Maintenance (B2)', date: '2026-11-05', category: 'Facility', target: 'All Residents & Staff', body: 'Backup generators will be tested between 10:00 AM and 11:30 AM. No power disruption expected.', isSample: true },
  { id: '2', title: 'Annual Fire Drill Next Tuesday', date: '2026-11-10', category: 'Safety', target: 'Building Wide', body: 'Civil Defense will conduct the annual evacuation drill. All staff must report to assembly points.', isSample: true },
  { id: '3', title: 'Q4 Rent Collection Milestone Notice', date: '2026-11-01', category: 'Management', target: 'Management Staff', body: '92% of November rent installments have posted. Ensure follow-ups on 8 outstanding accounts.', isSample: true },
];
