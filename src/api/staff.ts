import { apiDelete, apiGet, apiImage, apiPost, apiPut, apiUploadPhoto } from './client';
import type {
  InboxDto,
  InspectionDto,
  InspectionItemDto,
  InspectionItemRequestDto,
  InspectionStatus,
  InspectionType,
  ServiceCategoryOptionDto,
  UpdateInspectionDto,
} from './types';

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
  // The SLA, worked out by the API; empty when no active policy covers the priority.
  firstResponseAtUtc?: string;
  responseDueUtc?: string;
  resolutionDueUtc?: string;
  isOverdue?: boolean;
}

export interface StaffProperty {
  id: string;
  companyId: string;
  ownerId?: string;
  propertyCode: string;
  propertyNameEn: string;
  propertyNameAr?: string;
  structure?: 'Individual' | 'Group';
  propertyTypeId?: string;
  propertyClassificationId?: string;
  addressLine1: string;
  city?: string;
  countryCode: string;
  isActive: boolean;
}

export interface StaffPropertyType {
  id: string;
  code: string;
  nameEn: string;
  nameAr?: string;
  holdsUnits: boolean;
  isActive: boolean;
}

export interface StaffBuilding {
  id: string;
  propertyId: string;
  buildingCode: string;
  buildingNameEn: string;
  buildingNameAr?: string;
  propertyTypeId?: string;
  buildingTypeId?: string;
  noOfFloors?: number;
  isActive: boolean;
}

export interface StaffFloorZone {
  id: string;
  buildingId: string;
  parentFloorZoneId?: string | null;
  zoneTypeId?: string;
  code?: string;
  nameEn: string;
  nameAr?: string;
  floorNumber?: number | null;
  sortOrder?: number | null;
  isActive: boolean;
}

export interface StaffUnitType {
  id: string;
  unitTypeCode: string;
  nameEn: string;
  nameAr?: string;
  isActive: boolean;
}

export interface StaffUnit {
  id: string;
  propertyId: string;
  buildingId?: string | null;
  floorZoneId?: string | null;
  propertyTypeId?: string | null;
  unitTypeId: string;
  unitCode: string;
  unitNameEn?: string;
  unitNameAr?: string;
  status: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  furnishingStatus?: 'Unfurnished' | 'SemiFurnished' | 'Furnished' | string;
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
  companyId?: string;
  leaseNumber: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  status: string;
  // Empty on a lease that is still a draft.
  startDate: string | null;
  endDate: string | null;
  signedDate?: string | null;
  rentAmount: number;
  rentFrequency: string;
  billingDay?: number | null;
  gracePeriodDays?: number | null;
  securityDepositAmount?: number | null;
  utilityDepositAmount?: number | null;
  noticePeriodDays?: number | null;
  renewalNoticeDate?: string | null;
  escalationRuleRef?: string | null;
  governmentRegistrationRef?: string | null;
  previousLeaseId?: string | null;
  terminationDate?: string | null;
  terminationReason?: string | null;
  comments?: string | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  isActive: boolean;
}

export interface StaffTenantContact {
  kind: 'Signatory' | 'Contact' | string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface StaffTenant {
  id: string;
  companyId?: string;
  tenantNumber: string;
  tenantType?: 'Individual' | 'Corporate' | 'Government' | string;
  tenantCategory?: string | null;
  displayNameEn: string;
  displayNameAr?: string;
  nationalIdNo?: string | null;
  passportNo?: string | null;
  companyRegistrationNo?: string | null;
  nationalityCode?: string | null;
  primaryMobile: string;
  primaryEmail?: string;
  alternatePhone?: string | null;
  preferredLanguage?: string | null;
  preferredChannel?: string | null;
  dateOfBirth?: string | null;
  idExpiryDate?: string | null;
  employer?: string | null;
  monthlyIncome?: number | null;
  emergencyContact?: string | null;
  taxRegistrationNo?: string | null;
  industry?: string | null;
  registeredAddress?: string | null;
  authorisedSignatory?: string | null;
  contacts?: StaffTenantContact[] | null;
  appUsername?: string | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  isActive: boolean;
}

export interface StaffOccupant {
  id: string;
  tenantId: string;
  leaseId?: string | null;
  occupantType: string;
  fullNameEn: string;
  fullNameAr?: string | null;
  relationship?: string | null;
  nationalityCode?: string | null;
  nationalIdNo?: string | null;
  passportNo?: string | null;
  mobile?: string | null;
  email?: string | null;
  isEmergencyContact: boolean;
  isActive: boolean;
}

export interface StaffTenantVehicle {
  id: string;
  tenantId: string;
  plateNumber: string;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  vehicleType: string;
  permitNo?: string | null;
  parkingBayId?: string | null;
  permitExpiryDate?: string | null;
  permitStatus?: string | null;
  isActive: boolean;
}

export interface StaffTenantDocument {
  id: string;
  tenantId: string;
  occupantId?: string | null;
  leaseId?: string | null;
  documentType: string;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  fileName: string;
  verificationStatus: string;
  hasFile?: boolean;
  fileSizeBytes?: number;
  isActive: boolean;
}

export interface StaffDeposit {
  id: string;
  tenantId: string;
  leaseId: string;
  depositType: string;
  requiredAmount: number;
  receivedAmount: number;
  adjustedAmount: number;
  refundedAmount: number;
  balanceAmount: number;
  status: string;
  receivedDate?: string | null;
  refundDate?: string | null;
  isActive: boolean;
}

export interface StaffLeaseCharge {
  id: string;
  leaseId: string;
  chargeType: string;
  description?: string | null;
  amount: number;
  taxRate?: number | null;
  frequency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isRecurring: boolean;
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
  bankName?: string;
  status: string;
  notes?: string;
  invoiceId?: string;
  tenantId?: string;
  propertyId?: string;
  leaseId?: string;
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
  total: number;
  totalCount?: number;
  page: number;
  pageSize: number;
}

/** Calls GET /api/Dashboard/getDashboardSummary (PropertyManager & SuperAdmin only). */
export const getStaffDashboardSummary = () => apiGet<StaffDashboardSummary>('/Dashboard/getDashboardSummary');

/** Service request CRUD */
export const getStaffServiceCategories = () =>
  apiGet<ServiceCategoryOptionDto[]>('/ServiceRequest/getServiceCategories');
export const getStaffTickets = () => apiGet<StaffTicket[]>('/ServiceRequest/getServiceRequest');
export const getStaffTicket = (id: string) => apiGet<StaffTicket>(`/ServiceRequest/getServiceRequest/${id}`);
export const createStaffTicket = (ticket: Partial<StaffTicket>) =>
  apiPost<StaffTicket>('/ServiceRequest/createServiceRequest', ticket);
export const updateStaffTicket = (id: string, ticket: Partial<StaffTicket>) =>
  apiPut<void>(`/ServiceRequest/updateServiceRequest/${id}`, ticket);
export const deleteStaffTicket = (id: string) => apiDelete(`/ServiceRequest/deleteServiceRequest/${id}`);

/** A work order: the job that fixes one ticket. */
export interface StaffWorkOrder {
  id: string;
  serviceRequestId: string;
  propertyId?: string | null;
  ticketNumber?: string;
  workOrderNumber: string;
  status: 'Pending' | 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
  contractorName?: string | null;
  technicianName?: string | null;
  scheduledStartUtc?: string | null;
  cost?: number | null;
}

export const getStaffWorkOrders = () => apiGet<StaffWorkOrder[]>('/WorkOrder/getWorkOrder');

/** A piece of equipment on one of the company's properties. */
export interface StaffAsset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  propertyId?: string | null;
  propertyName?: string | null;
  location?: string | null;
  status: 'Operational' | 'UnderMaintenance' | 'Faulty' | 'Retired';
}

export const getStaffAssets = () => apiGet<StaffAsset[]>('/Asset/getAsset');

/** A ticket's photos, as data URIs ready to show. */
export async function getStaffTicketPhotoUris(id: string): Promise<string[]> {
  const list = await apiGet<{ id: string }[]>(`/ServiceRequest/getServiceRequestPhotos/${id}`);
  return Promise.all(list.map((p) => apiImage(`/ServiceRequest/getServiceRequestPhotoFile/${p.id}`)));
}

/** Properties, Buildings, Floors, Units, Facilities */
export const getStaffProperties = () => apiGet<StaffProperty[]>('/Property/getProperty');
export const getStaffPropertyTypes = () => apiGet<StaffPropertyType[]>('/PropertyType/getPropertyType');
export const getStaffBuildings = () => apiGet<StaffBuilding[]>('/Building/getBuilding');
export const getStaffFloorZones = () => apiGet<StaffFloorZone[]>('/FloorZone/getFloorZone');
export const getStaffUnits = () => apiGet<StaffUnit[]>('/Unit/getUnit');
export const getStaffUnitTypes = () => apiGet<StaffUnitType[]>('/UnitType/getUnitType');
export const getStaffFacilities = () => apiGet<StaffFacility[]>('/Facility/getFacility');

/** Leases & Tenants */
export const getStaffLeases = () => apiGet<StaffLease[]>('/Lease/getLease');
export const getStaffLease = (id: string) => apiGet<StaffLease>(`/Lease/getLease/${id}`);
export const getStaffTenants = () => apiGet<StaffTenant[]>('/Tenant/getTenant');
export const getStaffTenant = (id: string) => apiGet<StaffTenant>(`/Tenant/getTenant/${id}`);
export const getStaffOccupants = () => apiGet<StaffOccupant[]>('/Occupant/getOccupant');
export const getStaffTenantVehicles = () => apiGet<StaffTenantVehicle[]>('/TenantVehicle/getTenantVehicle');
export const getStaffTenantDocuments = () => apiGet<StaffTenantDocument[]>('/TenantDocument/getTenantDocument');
export const getStaffDeposits = () => apiGet<StaffDeposit[]>('/Deposit/getDeposit');
export const getStaffLeaseCharges = () => apiGet<StaffLeaseCharge[]>('/LeaseCharge/getLeaseCharge');

/**
 * Finance: loads the unpaged lists once and filters on the phone (showing 20 at a time with
 * "Show more"), because the paged endpoints only accept page, pageSize (max 200) and search with
 * no property or status filter. This is fine for hundreds of records; server-side property and
 * status filters are the upgrade path for thousands.
 */
export const getStaffInvoices = () => apiGet<StaffInvoice[]>('/Invoice/getInvoice');
export const getStaffReceipts = () => apiGet<StaffReceipt[]>('/Receipt/getReceipt');
export const createStaffReceipt = (receipt: Partial<StaffReceipt>) =>
  apiPost<StaffReceipt>('/Receipt/createReceipt', receipt);
export const getStaffInstallments = () => apiGet<StaffInstallment[]>('/Installment/getInstallment');

// ==========================================
// Sample data for areas with no live API yet
// (Inspections)
// ==========================================

export interface SampleInspection {
  id: string;
  title: string;
  scheduledDate: string;
  inspector: string;
  status: 'Scheduled' | 'Passed' | 'ActionRequired';
  isSample: true;
}

export const SAMPLE_INSPECTIONS: SampleInspection[] = [
  { id: '1', title: 'Quarterly Fire Safety System Check', scheduledDate: '2026-11-15', inspector: 'Civil Defense Team', status: 'Scheduled', isSample: true },
  { id: '2', title: 'HVAC Seasonal Filter & Pressure Audit', scheduledDate: '2026-11-08', inspector: 'Facility Team A', status: 'Scheduled', isSample: true },
  { id: '3', title: 'Swimming Pool Water Chemistry & Pump', scheduledDate: '2026-11-01', inspector: 'Rashid Al-Kiyumi', status: 'Passed', isSample: true },
  { id: '4', title: 'Emergency Lighting & Exit Sign Battery', scheduledDate: '2026-10-25', inspector: 'Safety Officer', status: 'ActionRequired', isSample: true },
];

export interface StaffAnnouncementDto {
  id: string;
  propertyId?: string | null;
  propertyName?: string | null;
  announcementNumber?: string;
  category: string;
  titleEn: string;
  titleAr?: string | null;
  bodyEn: string;
  bodyAr?: string | null;
  priority: string | number;
  publishAtUtc: string;
  expireAtUtc?: string | null;
  requiresAcknowledgement: boolean;
  status: string | number;
  recipientCount?: number;
  deliveredCount?: number;
  readCount?: number;
  acknowledgedCount?: number;
}

export interface StaffAnnouncementItem {
  id: string;
  propertyId?: string | null;
  title: string;
  titleEn: string;
  titleAr?: string | null;
  date: string;
  category: string;
  target?: string | null;
  body: string;
  bodyEn: string;
  bodyAr?: string | null;
  isSample: boolean;
}

export async function getStaffAnnouncements(): Promise<StaffAnnouncementItem[]> {
  const list = await apiGet<StaffAnnouncementDto[]>('/Announcement/getAnnouncement');
  if (!list || list.length === 0) return [];
  return list
    .filter((a) => a.status === 'Published' || a.status === 3 || a.status === '3')
    .map((a) => ({
      id: a.id,
      propertyId: a.propertyId || null,
      title: a.titleEn,
      titleEn: a.titleEn,
      titleAr: a.titleAr,
      date: typeof a.publishAtUtc === 'string' ? a.publishAtUtc.slice(0, 10) : '',
      category: a.category || '',
      target: a.propertyName || null,
      body: a.bodyEn,
      bodyEn: a.bodyEn,
      bodyAr: a.bodyAr,
      isSample: false,
    }));
}

export async function getStaffAnnouncement(id: string): Promise<StaffAnnouncementItem | undefined> {
  const a = await apiGet<StaffAnnouncementDto>(`/Announcement/getAnnouncement/${id}`);
  if (!a) return undefined;
  return {
    id: a.id,
    title: a.titleEn,
    titleEn: a.titleEn,
    titleAr: a.titleAr,
    date: typeof a.publishAtUtc === 'string' ? a.publishAtUtc.slice(0, 10) : '',
    category: a.category || '',
    target: a.propertyName || null,
    body: a.bodyEn,
    bodyEn: a.bodyEn,
    bodyAr: a.bodyAr,
    isSample: false,
  };
}

/** A request in approval, as the Approval API returns it for the signed-in staff member. */
export interface StaffApproval {
  id: string;
  reference: string;
  requestType: 'DepositRefund' | 'LeaseDiscount' | 'WorkOrderCost' | 'ContractAward' | 'ViolationWaiver' | 'MaterialRequisition';
  subject: string;
  amount: number;
  requesterName: string;
  status: 'InApproval' | 'Approved' | 'Returned' | 'Rejected';
  currentStep?: number | null;
  submittedAtUtc: string;
  requisitionId?: string | null;
  requisitionNumber?: string | null;
  /** The step it waits at is the signed-in person's to decide. */
  canDecide: boolean;
  route: { stepIndex: number; approverNames: string[]; state: string }[];
  history: { action: string; actorName: string; atUtc: string; comment?: string | null }[];
}

/** Requests the signed-in person may decide, sent, or may see through their role. */
export const getStaffApprovals = () => apiGet<StaffApproval[]>('/Approval/getApprovalRequest');

/** Approve, Return or Reject the step waiting for the signed-in person; Return and Reject need a comment. */
export const decideStaffApproval = (id: string, decision: 'Approve' | 'Return' | 'Reject', comment?: string) =>
  apiPost<StaffApproval>(`/Approval/decideApprovalRequest/${id}`, { decision, comment });

/** A repair material kept in the maintenance store. Stock changes only through movements and approved requisitions. */
export interface StaffInventoryItem {
  id: string;
  itemCode: string;
  nameEn: string;
  nameAr?: string | null;
  category: string;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  location?: string | null;
  onHand: number;
  isActive: boolean;
}

export type StaffRequisitionStatus = 'Draft' | 'InApproval' | 'Issued' | 'Returned' | 'Rejected';

export interface StaffMaterialRequisitionLine {
  id?: string;
  itemId: string;
  itemCode?: string | null;
  itemNameEn?: string | null;
  itemNameAr?: string | null;
  unit?: string | null;
  quantity: number;
  unitCost?: number;
}

/** Materials a technician asks for; stock is issued only after final approval. */
export interface StaffMaterialRequisition {
  id: string;
  number: string;
  serviceRequestId?: string | null;
  ticketNumber?: string | null;
  workOrderId?: string | null;
  workOrderNumber?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  notes?: string | null;
  status: StaffRequisitionStatus;
  requestedByUserId: string;
  requestedByName?: string | null;
  createdAtUtc: string;
  totalAmount: number;
  approvalRequestId?: string | null;
  approvalReference?: string | null;
  approvalStatus?: 'InApproval' | 'Approved' | 'Returned' | 'Rejected' | null;
  decidedByName?: string | null;
  decidedAtUtc?: string | null;
  decisionComment?: string | null;
  lines: StaffMaterialRequisitionLine[];
}

export interface SaveStaffMaterialRequisition {
  serviceRequestId?: string | null;
  workOrderId?: string | null;
  propertyId?: string | null;
  notes?: string | null;
  lines: { itemId: string; quantity: number }[];
}

export const getStaffInventoryItems = () => apiGet<StaffInventoryItem[]>('/InventoryItem/getInventoryItem');
export const getStaffMaterialRequisitions = () => apiGet<StaffMaterialRequisition[]>('/MaterialRequisition/getMaterialRequisition');
export const getStaffMaterialRequisition = (id: string) =>
  apiGet<StaffMaterialRequisition>(`/MaterialRequisition/getMaterialRequisition/${id}`);
export const createStaffMaterialRequisition = (body: SaveStaffMaterialRequisition) =>
  apiPost<StaffMaterialRequisition>('/MaterialRequisition/createMaterialRequisition', body);
export const updateStaffMaterialRequisition = (id: string, body: SaveStaffMaterialRequisition) =>
  apiPut<void>(`/MaterialRequisition/updateMaterialRequisition/${id}`, body);
export const sendStaffMaterialRequisition = (id: string) =>
  apiPut<StaffMaterialRequisition>(`/MaterialRequisition/sendMaterialRequisition/${id}`, {});
export const deleteStaffMaterialRequisition = (id: string) =>
  apiDelete(`/MaterialRequisition/deleteMaterialRequisition/${id}`);

// ── Inspections ─────────────────────────────────────────────────────────────

export const getStaffInspections = (
  filter: { status?: InspectionStatus; type?: InspectionType; propertyId?: string; unitId?: string } = {},
) => {
  const q = new URLSearchParams(
    Object.entries(filter).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return apiGet<InspectionDto[]>(`/Inspection/getInspection${q ? `?${q}` : ''}`);
};

export const getStaffInspection = (id: string) => apiGet<InspectionDto>(`/Inspection/getInspection/${id}`);

export const updateStaffInspection = (id: string, body: UpdateInspectionDto) =>
  apiPut<InspectionDto>(`/Inspection/updateInspection/${id}`, body);

export const completeStaffInspection = (id: string) =>
  apiPut<InspectionDto>(`/Inspection/completeInspection/${id}`, {});

export const cancelStaffInspection = (id: string, reason: string) =>
  apiPut<InspectionDto>(`/Inspection/cancelInspection/${id}`, { reason });

export const getStaffInspectionItems = (inspectionId?: string) =>
  apiGet<InspectionItemDto[]>(`/Inspection/getInspectionItem${inspectionId ? `?inspectionId=${inspectionId}` : ''}`);

export const addStaffInspectionItem = (inspectionId: string, body: InspectionItemRequestDto) =>
  apiPost<InspectionItemDto>(`/Inspection/addInspectionItem/${inspectionId}`, body);

export const updateStaffInspectionItem = (itemId: string, body: InspectionItemRequestDto) =>
  apiPut<InspectionItemDto>(`/Inspection/updateInspectionItem/${itemId}`, body);

export const removeStaffInspectionItem = (itemId: string) =>
  apiPut<void>(`/Inspection/removeInspectionItem/${itemId}`, {});

export const raiseStaffInspectionTicket = (
  itemId: string,
  body: { category?: string; priority?: string; description?: string },
) => apiPost<InspectionItemDto>(`/Inspection/raiseInspectionTicket/${itemId}`, body);

export const getStaffInspectionPhotoUri = (photoId: string) =>
  apiImage(`/Inspection/getInspectionPhotoFile/${photoId}`);

export const uploadStaffInspectionPhoto = (itemId: string, uri: string) =>
  apiUploadPhoto(`/Inspection/uploadInspectionPhoto/${itemId}`, uri);

export const removeStaffInspectionPhoto = (photoId: string) =>
  apiPut<void>(`/Inspection/removeInspectionPhoto/${photoId}`, {});

/** The signed-in staff member's own notifications, for the bell. */
export const getInbox = () => apiGet<InboxDto>('/Inbox/getInbox');

export const markInboxRead = (id: string) => apiPut<void>(`/Inbox/markInboxRead/${id}`, {});

export const markInboxAllRead = () => apiPut<void>('/Inbox/markInboxAllRead', {});
