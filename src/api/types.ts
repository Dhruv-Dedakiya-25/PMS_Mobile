/**
 * Shapes returned by PMS_API's /api/Auth and /api/My endpoints.
 */

export interface AuthUser {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  isActive: boolean;
  role: string;
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
