/**
 * Shapes returned by PMS_API's /api/Auth and /api/My endpoints.
 */

export interface AuthUser {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  isActive: boolean;
  /** SuperAdmin, PropertyManager, Maintenance or Tenant: the most the account may do. */
  userType: string;
  /** The company role under the user type, when the account has one. */
  roleId?: string | null;
  roleNameEn?: string | null;
  roleNameAr?: string | null;
  /** Module to actions the role leaves of its user type; the API checks the same. */
  permissions?: Record<string, string[]>;
  companyId?: string | null;
  tenantId?: string | null;
  currencyCode?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
  tokenType: string;
  isPersistent: boolean;
  user: AuthUser;
}

export interface MyTenantSummaryDto {
  id: string;
  tenantNumber: string;
  displayNameEn: string;
  displayNameAr?: string | null;
  primaryMobile: string;
  primaryEmail?: string | null;
  occupantCount: number;
}

export interface MyLeaseSummaryDto {
  id: string;
  leaseNumber: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  rentAmount: number;
  rentFrequency: string;
}

export interface MyUnitDto {
  id: string;
  unitCode: string;
  unitNameEn?: string | null;
  unitNameAr?: string | null;
  unitTypeCode?: string | null;
  unitTypeNameEn?: string | null;
  unitTypeNameAr?: string | null;
  status: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  furnishingStatus?: string | null;
  viewDescription?: string | null;
  hasBalcony?: boolean | null;
}

export interface MyFloorDto {
  id: string;
  code: string;
  nameEn: string;
  nameAr?: string | null;
  floorNumber?: number | null;
}

export interface MyBuildingDto {
  id: string;
  buildingCode: string;
  buildingNameEn: string;
  buildingNameAr?: string | null;
  noOfFloors?: number | null;
  totalUnits: number;
}

export interface MyPropertyDto {
  id: string;
  propertyCode: string;
  propertyNameEn: string;
  propertyNameAr?: string | null;
  addressLine1: string;
  city?: string | null;
  governorate?: string | null;
  countryCode: string;
  ownerNameEn?: string | null;
  ownerNameAr?: string | null;
}

export interface MyParkingBayDto {
  id: string;
  bayCode: string;
  bayType?: string | null;
  status: string;
  zoneCode?: string | null;
  zoneNameEn?: string | null;
  zoneNameAr?: string | null;
}

export interface MyVehicleDto {
  id: string;
  plateNumber: string;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  vehicleType: string;
  permitNo?: string | null;
  /** Pending, Active, Expired or Revoked: the barrier lets the car in only while Active. */
  permitStatus?: string | null;
  permitExpiryDate?: string | null;
  parkingBayId?: string | null;
  bayCode?: string | null;
  bayType?: string | null;
  zoneNameEn?: string | null;
  zoneNameAr?: string | null;
}

export interface MyProfileDto {
  tenant: MyTenantSummaryDto;
  currentLease?: MyLeaseSummaryDto | null;
  unit?: MyUnitDto | null;
  floor?: MyFloorDto | null;
  building?: MyBuildingDto | null;
  property?: MyPropertyDto | null;
  parkingBays: MyParkingBayDto[];
  vehicles: MyVehicleDto[];
}

export interface MyLeaseChargeDto {
  id: string;
  chargeType: string;
  description?: string | null;
  amount: number;
  taxRate?: number | null;
  frequency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isRecurring: boolean;
}

export interface MyDepositDto {
  id: string;
  depositType: string;
  requiredAmount: number;
  receivedAmount: number;
  adjustedAmount: number;
  refundedAmount: number;
  balanceAmount: number;
  status: string;
  receivedDate?: string | null;
  refundDate?: string | null;
  refundReference?: string | null;
  remarks?: string | null;
}

export interface MyLeaseDto {
  id: string;
  leaseNumber: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
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
  comments?: string | null;
  charges: MyLeaseChargeDto[];
  deposits: MyDepositDto[];
  /** This lease and the ones it renewed, oldest first. */
  history?: MyLeaseTermDto[];
}

export interface MyLeaseTermDto {
  id: string;
  leaseNumber: string;
  startDate?: string | null;
  endDate?: string | null;
  rentAmount: number;
  rentFrequency: string;
}

export type ApiInstallmentStatus = 'Scheduled' | 'Invoiced' | 'Paid' | 'Overdue' | 'Cancelled';

export interface MyInstallmentDto {
  id: string;
  leaseId: string;
  installmentNo: number;
  dueDate: string;
  rentAmount?: number | null;
  otherChargesAmount?: number | null;
  taxAmount?: number | null;
  totalDue: number;
  invoiceId?: string | null;
  status: ApiInstallmentStatus | string;
  paymentMethod?: string | null;
  referenceNo?: string | null;
}

export type ApiInvoiceStatus = 'Draft' | 'Posted' | 'PartPaid' | 'Paid' | 'Overdue' | 'Void';

export interface MyInvoiceDto {
  id: string;
  leaseId?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: ApiInvoiceStatus | string;
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  sourceType: string;
  sourceRef?: string | null;
  notes?: string | null;
}

export interface MyReceiptDto {
  id: string;
  leaseId?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  receiptNumber: string;
  receiptDate: string;
  paymentMethod: string;
  amount: number;
  currencyCode: string;
  referenceNo?: string | null;
  bankName?: string | null;
  chequeNo?: string | null;
  chequeDate?: string | null;
  chequeStatus?: string | null;
  status: string;
  notes?: string | null;
}

export interface MyReceiptDetailDto extends MyReceiptDto {
  invoice?: MyInvoiceDto | null;
}

export interface MyDocumentDto {
  id: string;
  leaseId?: string | null;
  documentType: string;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuingCountryCode?: string | null;
  fileName: string;
  verificationStatus: string;
  verifiedAtUtc?: string | null;
  remarks?: string | null;
  hasFile: boolean;
  fileSizeBytes: number;
  fileContentType?: string | null;
  createdAtUtc?: string | null;
}

export type ApiServicePriority = 'Low' | 'Medium' | 'High' | 'Emergency';
export type ApiServiceStatus = 'Open' | 'InProgress' | 'OnHold' | 'Resolved' | 'Closed';

export interface ServiceCategoryOptionDto {
  id?: string;
  code: string;
  nameEn: string;
  nameAr?: string | null;
  sortOrder?: number;
}

export interface MyServiceRequestDto {
  id: string;
  ticketNumber: string;
  category: string;
  subcategory?: string | null;
  priority: ApiServicePriority | string;
  description: string;
  preferredVisitTime?: string | null;
  status: ApiServiceStatus | string;
  assignedTo?: string | null;
  rating?: number | null;
  resolvedOn?: string | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
}

export interface CreateMyServiceRequestDto {
  category: string;
  subcategory?: string | null;
  priority: ApiServicePriority;
  description: string;
  preferredVisitTime?: string | null;
}

export interface MyAnnouncementDto {
  id: string;
  title: string;
  titleAr?: string | null;
  body: string;
  bodyAr?: string | null;
  date: string;
  category: string;
  kind: 'notice' | 'event' | 'rule';
  icon: 'maintenance' | 'fire' | 'event' | 'hours' | 'rule' | 'water';
  priority: string;
  needsAck: boolean;
  acknowledged: boolean;
  propertyId?: string | null;
}

export interface MyNotificationDto {
  id: string;
  kind: 'payment' | 'lease' | 'maintenance' | 'visitor' | 'announcement' | 'booking' | 'inspection';
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string | null;
}

/** A visitor pass, as /api/My/getMyVisitors and inviteMyVisitor send it. passCode is what the QR carries. */
export interface MyVisitorDto {
  id: string;
  guestName?: string | null;
  guestMobile?: string | null;
  unitCode?: string | null;
  propertyName?: string | null;
  passNumber: string;
  passCode: string;
  validFromUtc: string;
  validToUtc: string;
  purpose: 'Family' | 'Friend' | 'Delivery' | 'Service' | 'Other';
  plateNumber?: string | null;
  status: 'Expected' | 'Arrived' | 'Left' | 'Cancelled' | 'Expired';
}

export interface InviteMyVisitorDto {
  guestName: string;
  guestMobile?: string;
  validFromUtc: string;
  validToUtc: string;
  purpose: MyVisitorDto['purpose'];
  plateNumber?: string;
}

/** A bookable facility at a property where the tenant has a current lease. */
export interface MyFacilityDto {
  id: string;
  propertyId: string;
  buildingId?: string | null;
  floorZoneId?: string | null;
  facilityCode: string;
  facilityTypeId: string;
  nameEn: string;
  nameAr?: string | null;
  locationDescription?: string | null;
  bookable: boolean;
  capacity?: number | null;
  openingTime?: string | null;
  closingTime?: string | null;
  slotMinutes: number;
  bookingFee: number;
  requiresApproval: boolean;
  status: string;
  isActive: boolean;
}

/** One fixed slot of a bookable facility's day. */
export interface MyFacilitySlotDto {
  startUtc: string;
  endUtc: string;
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  isPast: boolean;
  isTaken: boolean;
  bookingStatus?: 'Pending' | 'Confirmed' | string | null;
}

export type ApiFacilityBookingStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'Cancelled';

/** A tenant's facility reservation, as /api/My/getMyBookings and bookMyFacility return it. */
export interface MyFacilityBookingDto {
  id: string;
  number: string;
  facilityId: string;
  facilityCode?: string | null;
  facilityNameEn: string;
  facilityNameAr?: string | null;
  propertyId?: string | null;
  propertyNameEn?: string | null;
  propertyNameAr?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  tenantNameAr?: string | null;
  unitId?: string | null;
  unitCode?: string | null;
  title?: string | null;
  startUtc: string;
  endUtc: string;
  date: string;
  startTime: string;
  endTime: string;
  slotLabel: string;
  guests: number;
  fee: number;
  status: ApiFacilityBookingStatus;
  notes?: string | null;
  decisionReason?: string | null;
  cancelReason?: string | null;
  canCancel: boolean;
}

export interface BookMyFacilityDto {
  facilityId: string;
  startUtc?: string;
  date?: string;
  startTime?: string;
  guests: number;
  unitId?: string;
  notes?: string;
}

// ── Inspections ─────────────────────────────────────────────────────────────

export type InspectionType = 'MoveIn' | 'MoveOut' | 'Routine' | 'Emergency';
export type InspectionStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
export type InspectionCondition = 'Unchecked' | 'Good' | 'Fair' | 'Damaged' | 'NotApplicable';

export interface InspectionPhotoDto {
  id: string;
  inspectionItemId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdOn: string;
}

/** One checklist line of an inspection report. */
export interface InspectionItemDto {
  id: string;
  inspectionId: string;
  inspectionNumber?: string | null;
  inspectionType?: InspectionType | null;
  inspectionStatus?: InspectionStatus | null;
  unitCode?: string | null;
  area: string;
  name: string;
  templateKey?: string | null;
  sortOrder: number;
  condition: InspectionCondition;
  note?: string | null;
  chargeAmount?: number | null;
  serviceRequestId?: string | null;
  ticketNumber?: string | null;
  photos: InspectionPhotoDto[];
}

/** An inspection report as returned by PMS_API. */
export interface InspectionDto {
  id: string;
  number: string;
  type: InspectionType;
  status: InspectionStatus;
  propertyId: string;
  propertyNameEn?: string | null;
  propertyNameAr?: string | null;
  buildingNameEn?: string | null;
  buildingNameAr?: string | null;
  unitId?: string | null;
  unitCode?: string | null;
  leaseId?: string | null;
  leaseNumber?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  tenantNameAr?: string | null;
  title?: string | null;
  scheduledAtUtc: string;
  inspectorUserId?: string | null;
  inspectorName?: string | null;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  completedByName?: string | null;
  electricityReading?: number | null;
  waterReading?: number | null;
  chillerReading?: number | null;
  keysCount?: number | null;
  accessCardsCount?: number | null;
  parkingRemotesCount?: number | null;
  mailboxKeysCount?: number | null;
  summary?: string | null;
  tenantAcceptedAtUtc?: string | null;
  tenantComment?: string | null;
  cancelledAtUtc?: string | null;
  cancelledByName?: string | null;
  cancelReason?: string | null;
  itemCount: number;
  checkedCount: number;
  goodCount: number;
  fairCount: number;
  damagedCount: number;
  notApplicableCount: number;
  chargeTotal: number;
  isLocked: boolean;
  canAccept: boolean;
  createdOn?: string | null;
  items: InspectionItemDto[];
}

export interface UpdateInspectionDto {
  scheduledAtUtc?: string;
  inspectorUserId?: string | null;
  title?: string | null;
  summary?: string | null;
  electricityReading?: number | null;
  waterReading?: number | null;
  chillerReading?: number | null;
  keysCount?: number | null;
  accessCardsCount?: number | null;
  parkingRemotesCount?: number | null;
  mailboxKeysCount?: number | null;
}

export interface InspectionItemRequestDto {
  area: string;
  name: string;
  condition: InspectionCondition;
  note?: string | null;
  chargeAmount?: number | null;
}

/** A violation recorded against the tenant, with every appeal or question raised on it. */
export interface MyViolationDto {
  id: string;
  violationNumber: string;
  violationType: string;
  description?: string | null;
  violationDate: string;
  fineAmount?: number | null;
  /** Open, NoticeSent, Disputed, Paid, Waived or Cancelled. */
  status: string;
  evidenceCount: number;
  appeals: MyViolationAppealDto[];
}

export type ViolationAppealType = 'Appeal' | 'Question';

/** An appeal or question on a violation, and the office's answer once it has one. */
export interface MyViolationAppealDto {
  id: string;
  appealNumber: string;
  type: ViolationAppealType | string;
  /** Pending, Accepted, Rejected or Answered. */
  status: string;
  reason: string;
  response?: string | null;
  previousFineAmount?: number | null;
  revisedFineAmount?: number | null;
  createdAtUtc: string;
  decidedAtUtc?: string | null;
}

/** A photo or PDF the office attached to a violation. */
export interface MyViolationEvidenceDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  description?: string | null;
}

/** One of a staff member's own notifications: a lease expiry or SLA breach reminder, say. */
export interface InboxItemDto {
  id: string;
  notificationType: string;
  subject?: string | null;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  sentAtUtc?: string | null;
  readAtUtc?: string | null;
}

/** The staff bell: how many are unread, and the newest twenty. */
export interface InboxDto {
  unread: number;
  items: InboxItemDto[];
}

export type ApiContactRole = 'PropertyManager' | 'MaintenanceDesk' | 'Reception' | 'Security' | 'Emergency';

/** Someone the tenant can call: their property's contacts, the office, or emergency services. */
export interface MyContactDto {
  role: ApiContactRole;
  name: string;
  phone: string;
  email?: string | null;
  hours?: string | null;
  propertyName?: string | null;
}

export type ApiMoveOutReason = 'Relocating' | 'Buying' | 'Job' | 'Size' | 'Other';

/** A renewal request or notice the tenant sent, and the office's answer. */
export interface MyLeaseRequestDto {
  id: string;
  requestNumber: string;
  type: 'Renewal' | 'Termination';
  status: 'Pending' | 'Accepted' | 'Declined';
  termMonths?: number | null;
  moveOutDate?: string | null;
  reason?: ApiMoveOutReason | null;
  note?: string | null;
  response?: string | null;
  decidedAtUtc?: string | null;
  renewalLeaseNumber?: string | null;
  createdOn: string;
}

/** The mobile key's code for now; it changes every periodSeconds. */
export interface MyAccessKeyDto {
  code: string;
  secondsLeft: number;
  periodSeconds: number;
}

export interface MyAccessCardDto {
  id: string;
  cardNumber: string;
  holderName: string;
  isPrimary: boolean;
  zones?: string | null;
  validUntil?: string | null;
  status: 'Active' | 'Lost' | 'Cancelled';
  lostReportedAtUtc?: string | null;
  propertyName?: string | null;
}

