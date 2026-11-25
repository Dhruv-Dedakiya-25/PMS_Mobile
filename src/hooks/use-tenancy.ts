/**
 * One data layer for PMS_Mobile:
 * - In `demo` mode, returns sample data from `src/mock/data.ts` and `src/mock/store.ts`.
 * - In `api` mode, calls `src/api/my.ts` and maps responses into the shapes the screens render.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  acknowledgeAnnouncement as apiAcknowledgeAnnouncement,
  appealMyViolation,
  bookMyFacility,
  cancelMyBooking,
  cancelMyVisitor,
  createMyServiceRequest,
  getMyAnnouncement,
  getMyAnnouncements,
  getMyAvailability,
  getMyBookings,
  getMyDocuments,
  getMyFacilities,
  getMyInstallments,
  getMyInvoices,
  getMyLease,
  getMyNotifications,
  getMyProfile,
  getMyReceipt,
  getMyReceipts,
  getMyServiceCategories,
  getMyServiceRequest,
  getMyServiceRequestPhotoUris,
  getMyServiceRequests,
  getMyViolations,
  getMyVisitors,
  inviteMyVisitor,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  markNotificationRead as apiMarkNotificationRead,
  uploadMyServiceRequestPhoto,
} from '@/api/my';
import type {
  ApiFacilityBookingStatus,
  ApiServicePriority,
  MyAnnouncementDto,
  MyDocumentDto,
  MyFacilityBookingDto,
  MyFacilityDto,
  MyFacilitySlotDto,
  MyInstallmentDto,
  MyInvoiceDto,
  MyLeaseDto,
  MyNotificationDto,
  MyProfileDto,
  MyReceiptDetailDto,
  MyReceiptDto,
  MyServiceRequestDto,
  MyViolationDto,
  MyVisitorDto,
  ServiceCategoryOptionDto,
  ViolationAppealType,
} from '@/api/types';
import { login, logout, restoreSession, useAuth } from '@/auth/session';
import { authMode, brand } from '@/config';
import { useLanguage } from '@/i18n';
import { daysUntil } from '@/lib/format';
import {
  DEFAULT_SERVICE_CATEGORIES,
  findServiceCategory,
  normalizeCategoryName,
} from '@/lib/service-categories';
import { omanToday } from '@/mock/clock';
import {
  announcements as mockAnnouncements,
  documents as mockDocuments,
  facilities as mockFacilities,
  lease as mockLease,
  parking as mockParking,
  escalation as mockEscalation,
  property as mockProperty,
  rentalSchedule as mockRentalSchedule,
  tenant as mockTenant,
  unit as mockUnit,
  type DocumentKind,
  type FacilityKind,
  type MaintenanceRequest,
  type Payment,
  type PaymentMethod,
  type RequestCategory,
  type RequestPriority,
  type RequestStage,
  type VisitPurpose,
  type VisitStatus,
} from '@/mock/data';
import {
  acknowledge as mockAcknowledge,
  appealViolation as mockAppealViolation,
  book as mockBook,
  cancelBooking as mockCancelBooking,
  markAllRead as mockMarkAllRead,
  markRead as mockMarkRead,
  nextRentMonth,
  inviteVisitor as mockInviteVisitor,
  raiseRequest,
  signIn as mockSignIn,
  signOut as mockSignOut,
  unpaidUtilities,
  useMockState,
} from '@/mock/store';

export interface MappedDocument {
  id: string;
  title: string;
  kind: DocumentKind;
  date: string;
  ref: string;
  pages: number;
  hasFile?: boolean;
  fileName?: string;
}

export interface MappedMaintenanceRequest extends MaintenanceRequest {
  /** Custom category text when the API category does not match one of the 8 standard keys. */
  categoryLabel?: string;
  /** The raw category text stored on the ticket. */
  rawCategory?: string;
  /** The matched ServiceCategory code when the ticket's category is found in the category list. */
  categoryCode?: string;
  unitCode?: string;
}

export interface ScheduleRow {
  key: string;
  month: string;
  amount: number;
  status: 'paid' | 'due' | 'upcoming';
}

interface LiveCache {
  profile?: MyProfileDto;
  lease?: MyLeaseDto | null;
  installments?: MyInstallmentDto[];
  invoices?: MyInvoiceDto[];
  receipts?: MyReceiptDto[];
  receiptDetails: Record<string, MyReceiptDetailDto>;
  documents?: MyDocumentDto[];
  serviceCategories?: ServiceCategoryOptionDto[];
  requests?: MyServiceRequestDto[];
  requestDetails: Record<string, MyServiceRequestDto>;
  /** A request's photos as data URIs, loaded with its detail. */
  requestPhotos: Record<string, string[]>;
  announcements?: MyAnnouncementDto[];
  announcementDetails: Record<string, MyAnnouncementDto>;
  notifications?: MyNotificationDto[];
  visitors?: MyVisitorDto[];
  facilities?: MyFacilityDto[];
  bookings?: MyFacilityBookingDto[];
  violations?: MyViolationDto[];
}

let cache: LiveCache = {
  receiptDetails: {},
  requestDetails: {},
  requestPhotos: {},
  announcementDetails: {},
};
const cacheListeners = new Set<() => void>();

function notifyCache() {
  cache = { ...cache };
  cacheListeners.forEach((l) => l());
}

/** Whether the car park barrier opens for a vehicle: only while its permit is active. */
const barrierOf = (permitStatus?: string | null): 'enabled' | 'pending' | 'off' =>
  permitStatus === 'Active' ? 'enabled' : permitStatus === 'Pending' ? 'pending' : 'off';

export function clearTenancyCache() {
  cache = { receiptDetails: {}, requestDetails: {}, requestPhotos: {}, announcementDetails: {} };
  cacheListeners.forEach((l) => l());
}

let profileRequest: Promise<MyProfileDto> | null = null;

/** Screens that open together share one profile request instead of each sending their own. */
function fetchProfileOnce() {
  profileRequest ??= getMyProfile().finally(() => {
    profileRequest = null;
  });
  return profileRequest;
}

function useLiveCache() {
  return useSyncExternalStore(
    (listener) => {
      cacheListeners.add(listener);
      return () => cacheListeners.delete(listener);
    },
    () => cache,
  );
}

const CATEGORY_TO_API: Record<RequestCategory, string> = {
  airConditioning: 'Air Conditioning',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  appliance: 'Appliances',
  carpentry: 'Doors & Carpentry',
  pestControl: 'Pest Control',
  cleaning: 'Cleaning',
  other: 'Other',
};

const SEEDED_CODES = new Set<string>(DEFAULT_SERVICE_CATEGORIES.map((c) => c.code));

const PRIORITY_TO_API: Record<RequestPriority, ApiServicePriority> = {
  low: 'Low',
  normal: 'Medium',
  high: 'High',
  urgent: 'Emergency',
};

function mapPriorityFromApi(priority: string): RequestPriority {
  switch (priority) {
    case 'Low':
      return 'low';
    case 'High':
      return 'high';
    case 'Emergency':
      return 'urgent';
    default:
      return 'normal';
  }
}

function mapStageFromApi(status: string, assignedTo?: string | null): RequestStage {
  if (status === 'Resolved' || status === 'Closed') return 'completed';
  if (status === 'InProgress' || status === 'OnHold') return 'inProgress';
  if (assignedTo && assignedTo.trim().length > 0) return 'assigned';
  return 'submitted';
}

function mapCategoryFromApi(
  rawCategory: string,
  categories: readonly ServiceCategoryOptionDto[] = DEFAULT_SERVICE_CATEGORIES,
): { category: RequestCategory; categoryCode?: string; categoryLabel?: string; rawCategory: string } {
  const trimmed = (rawCategory ?? '').trim();
  const matched = findServiceCategory(trimmed, categories);
  if (matched) {
    const isSeeded = SEEDED_CODES.has(matched.code);
    return {
      category: (isSeeded ? matched.code : 'other') as RequestCategory,
      categoryCode: matched.code,
      rawCategory: trimmed,
    };
  }
  return {
    category: 'other',
    categoryCode: undefined,
    categoryLabel: trimmed || undefined,
    rawCategory: trimmed,
  };
}

export function mapServiceRequestDto(
  dto: MyServiceRequestDto,
  categories: readonly ServiceCategoryOptionDto[] = DEFAULT_SERVICE_CATEGORIES,
): MappedMaintenanceRequest {
  const stage = mapStageFromApi(dto.status, dto.assignedTo);
  const { category, categoryCode, categoryLabel, rawCategory } = mapCategoryFromApi(dto.category, categories);
  const raisedOn = (dto.createdAtUtc ?? omanToday()).slice(0, 10);
  const updatedOn = (dto.updatedAtUtc ?? dto.createdAtUtc ?? omanToday()).slice(0, 10);
  const resolvedOn = (dto.resolvedOn ?? dto.updatedAtUtc ?? dto.createdAtUtc ?? omanToday()).slice(0, 10);

  const stages: Partial<Record<RequestStage, string>> = { submitted: raisedOn };
  if (stage === 'assigned' || stage === 'inProgress' || stage === 'completed') {
    stages.assigned = updatedOn;
  }
  if (stage === 'inProgress' || stage === 'completed') {
    stages.inProgress = updatedOn;
  }
  if (stage === 'completed') {
    stages.completed = resolvedOn;
  }

  return {
    id: dto.id,
    requestNo: dto.ticketNumber || dto.id.slice(0, 8).toUpperCase(),
    category,
    categoryCode,
    categoryLabel,
    rawCategory,
    priority: mapPriorityFromApi(dto.priority),
    description: dto.description,
    stage,
    raisedOn,
    stages,
    technician: dto.assignedTo?.trim()
      ? {
          name: dto.assignedTo.trim(),
          mobile: '',
          visit: dto.preferredVisitTime || undefined,
        }
      : undefined,
    photos: [],
  };
}

function mapPaymentMethodFromApi(method: string): PaymentMethod {
  switch (method) {
    case 'BankTransfer':
      return 'bankTransfer';
    case 'Cheque':
      return 'cheque';
    default:
      return 'card';
  }
}

function mapReceiptDto(dto: MyReceiptDto): Payment {
  const paidOn = (dto.receiptDate ?? omanToday()).slice(0, 10);
  return {
    id: dto.id,
    receiptNo: dto.receiptNumber,
    invoiceNo: dto.invoiceNumber || dto.referenceNo || '—',
    forMonth: `${paidOn.slice(0, 7)}-01`,
    paidOn,
    amount: Number(dto.amount ?? 0),
    method: mapPaymentMethodFromApi(dto.paymentMethod),
  };
}

/** The API's TenantDocumentType names, sorted into the app's document tabs. */
function mapDocumentKind(docType: string): DocumentKind {
  switch (docType) {
    case 'TenancyContract':
    case 'NationalId':
    case 'Passport':
    case 'ResidentCard':
      return 'agreement';
    default:
      return 'letter';
  }
}

function mapDocumentDto(dto: MyDocumentDto): MappedDocument {
  const date = (dto.issueDate ?? dto.createdAtUtc ?? omanToday()).slice(0, 10);
  return {
    id: dto.id,
    title: dto.fileName || dto.documentType,
    kind: mapDocumentKind(dto.documentType),
    date,
    ref: dto.documentNumber || dto.documentType,
    pages: Math.max(1, Math.round((dto.fileSizeBytes || 50_000) / 50_000)),
    hasFile: dto.hasFile,
    fileName: dto.fileName,
  };
}

function mapUnitType(bedrooms?: number | null, code?: string | null, nameEn?: string | null): 'studio' | 'oneBed' | 'twoBed' | 'threeBed' {
  const text = `${code ?? ''} ${nameEn ?? ''}`.toLowerCase();
  if (text.includes('studio') || bedrooms === 0) return 'studio';
  if (bedrooms === 1 || text.includes('1')) return 'oneBed';
  if (bedrooms === 3 || (bedrooms != null && bedrooms >= 3) || text.includes('3')) return 'threeBed';
  return 'twoBed';
}

function mapFurnishing(status?: string | null): 'unfurnished' | 'semi' | 'full' {
  if (status === 'Furnished') return 'full';
  if (status === 'SemiFurnished') return 'semi';
  return 'unfurnished';
}

function mapProfileData(dto: MyProfileDto | undefined, isAr: boolean, fallbackName?: string | null) {
  if (!dto) {
    return {
      tenant: {
        name: fallbackName || '—',
        tenantCode: '—',
        mobile: '—',
        email: '—',
        occupants: 1,
      },
      property: {
        ...mockProperty,
        name: brand.name,
        building: '—',
        unitNo: '—',
        floor: 1,
        address: '—',
        developer: brand.name,
      },
      unit: {
        ...mockUnit,
        areaSqm: 0,
        bedrooms: 0,
        bathrooms: 1,
        view: '—',
      },
      leaseSummary: {
        leaseNo: '—',
        title: mockLease.title,
        start: omanToday(),
        end: omanToday(),
        rent: 0,
        deposit: 0,
        escalationPercent: mockLease.escalationPercent,
        noticeDays: mockLease.noticeDays,
      },
      parking: [] as typeof mockParking,
    };
  }

  const tenantName = (isAr && dto.tenant.displayNameAr?.trim()) || dto.tenant.displayNameEn || fallbackName || '—';
  const propertyName = (isAr && dto.property?.propertyNameAr?.trim()) || dto.property?.propertyNameEn || brand.name;
  const buildingName =
    (isAr && dto.building?.buildingNameAr?.trim()) || dto.building?.buildingNameEn || dto.building?.buildingCode || '—';
  const ownerName = (isAr && dto.property?.ownerNameAr?.trim()) || dto.property?.ownerNameEn || propertyName;
  const addressParts = [dto.property?.addressLine1, dto.property?.city, dto.property?.governorate].filter(Boolean);

  const parkingList =
    dto.parkingBays.length > 0
      ? dto.parkingBays.map((b, idx) => {
          const vehicle =
            dto.vehicles.find((v) => v.parkingBayId === b.id || v.bayCode === b.bayCode) ?? dto.vehicles[idx];
          const vehicleLabel = vehicle
            ? [vehicle.make, vehicle.model, vehicle.colour ? `(${vehicle.colour})` : ''].filter(Boolean).join(' ') ||
              vehicle.vehicleType
            : '—';
          return {
            bay: b.bayCode,
            level: (isAr && b.zoneNameAr?.trim()) || b.zoneNameEn || b.zoneCode || '—',
            kind: (b.bayType === 'Open' ? 'open' : 'covered') as 'covered' | 'open',
            vehicle: vehicleLabel,
            plate: vehicle?.plateNumber || '—',
            tag: vehicle?.permitNo || '—',
            barrier: barrierOf(vehicle?.permitStatus),
          };
        })
      : dto.vehicles.map((v) => ({
          bay: v.bayCode || '—',
          level: (isAr && v.zoneNameAr?.trim()) || v.zoneNameEn || '—',
          kind: (v.bayType === 'Open' ? 'open' : 'covered') as 'covered' | 'open',
          vehicle: [v.make, v.model, v.colour ? `(${v.colour})` : ''].filter(Boolean).join(' ') || v.vehicleType,
          plate: v.plateNumber || '—',
          tag: v.permitNo || '—',
          barrier: barrierOf(v.permitStatus),
        }));

  const startDate = dto.currentLease?.startDate?.slice(0, 10) || omanToday();
  const endDate = dto.currentLease?.endDate?.slice(0, 10) || omanToday();

  return {
    tenant: {
      name: tenantName,
      tenantCode: dto.tenant.tenantNumber || '—',
      mobile: dto.tenant.primaryMobile || '—',
      email: dto.tenant.primaryEmail || '—',
      occupants: dto.tenant.occupantCount || 1,
    },
    property: {
      name: propertyName,
      building: buildingName,
      unitNo: dto.unit?.unitCode || '—',
      floor: dto.floor?.floorNumber ?? (Number.parseInt(dto.floor?.code ?? '', 10) || 1),
      address: addressParts.join(', ') || '—',
      developer: ownerName,
      completed: mockProperty.completed,
      floors: dto.building?.noOfFloors ?? mockProperty.floors,
      units: dto.building?.totalUnits || mockProperty.units,
      lifts: mockProperty.lifts,
      managementOffice: mockProperty.managementOffice,
    },
    unit: {
      type: mapUnitType(dto.unit?.bedrooms, dto.unit?.unitTypeCode, dto.unit?.unitTypeNameEn),
      bedrooms: dto.unit?.bedrooms ?? 0,
      bathrooms: Number(dto.unit?.bathrooms ?? 1),
      areaSqm: Number(dto.unit?.areaSqm ?? 0),
      furnishing: mapFurnishing(dto.unit?.furnishingStatus),
      view: dto.unit?.viewDescription || '—',
      balcony: Boolean(dto.unit?.hasBalcony),
      moveIn: startDate,
    },
    leaseSummary: {
      leaseNo: dto.currentLease?.leaseNumber || '—',
      title: mockLease.title,
      start: startDate,
      end: endDate,
      rent: Number(dto.currentLease?.rentAmount ?? 0),
      deposit: Number(dto.currentLease?.rentAmount ?? 0),
      escalationPercent: mockLease.escalationPercent,
      noticeDays: mockLease.noticeDays,
    },
    parking: parkingList,
  };
}

/** Unified session hook for both demo and api modes. */
export function useSession() {
  const mock = useMockState();
  const auth = useAuth();
  const isDemo = authMode === 'demo';

  const handleSignIn = useCallback(
    async (username: string, password: string) => {
      if (isDemo) {
        mockSignIn();
        return;
      }
      clearTenancyCache();
      await login(username, password);
    },
    [isDemo],
  );

  const handleSignOut = useCallback(async () => {
    if (isDemo) {
      mockSignOut();
      return;
    }
    // Signed out first, so the tenant screens close before the data is cleared: cleared
    // while they are open, they would ask for it again and renew the session.
    await logout();
    clearTenancyCache();
  }, [isDemo]);

  return {
    isDemo,
    ready: isDemo ? true : auth.status !== 'starting',
    signedIn: isDemo ? mock.signedIn : auth.status === 'signedIn',
    notLinked: isDemo ? false : auth.status === 'signedIn' && Boolean(auth.notLinked),
    user: auth.status === 'signedIn' ? auth.user : null,
    signIn: handleSignIn,
    signOut: handleSignOut,
    restore: isDemo ? () => Promise.resolve() : restoreSession,
  };
}

function useResource(hasData: boolean, fetcher: () => Promise<void>) {
  const isDemo = authMode === 'demo';
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo || hasData) return;
    let cancelled = false;
    fetcher()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo, hasData, fetcher]);

  const refresh = useCallback(async () => {
    if (isDemo) return;
    setError(null);
    if (hasData) setRefreshing(true);
    else setFetching(true);
    try {
      await fetcher();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  }, [isDemo, hasData, fetcher]);

  return {
    loading: !isDemo && ((!hasData && !error) || fetching),
    refreshing,
    error,
    refresh,
  };
}

/** Tenant profile, property, building, unit, parking, and current lease summary. */
export function useProfile() {
  const isDemo = authMode === 'demo';
  const { language } = useLanguage();
  const isAr = language.code === 'ar';
  const auth = useAuth();
  const live = useLiveCache();

  const fetchProfile = useCallback(async () => {
    const data = await fetchProfileOnce();
    cache.profile = data;
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.profile), fetchProfile);

  if (isDemo) {
    return {
      tenant: mockTenant,
      property: mockProperty,
      unit: mockUnit,
      lease: mockLease,
      parking: mockParking,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const fallbackName = auth.status === 'signedIn' ? auth.user.displayName || auth.user.username : undefined;
  const mapped = mapProfileData(live.profile, isAr, fallbackName);

  return {
    tenant: mapped.tenant,
    property: mapped.property,
    unit: mapped.unit,
    lease: mapped.leaseSummary,
    parking: mapped.parking,
    ...status,
  };
}

/** Lease details, agreement terms, and security deposit. */
export function useLease() {
  const isDemo = authMode === 'demo';
  const { language } = useLanguage();
  const isAr = language.code === 'ar';
  const mock = useMockState();
  const auth = useAuth();
  const live = useLiveCache();

  const fetchLease = useCallback(async () => {
    const [profileData, leaseData] = await Promise.all([
      cache.profile ? Promise.resolve(cache.profile) : fetchProfileOnce(),
      getMyLease(),
    ]);
    cache.profile = profileData;
    cache.lease = leaseData;
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.profile) && live.lease !== undefined, fetchLease);

  if (isDemo) {
    return {
      lease: {
        ...mockLease,
        status: 'Active',
        frequency: 'Monthly',
        escalationText: null as string | null,
        escalationStated: true,
        history: mockEscalation.map((e) => ({ from: e.from, rent: e.rent, frequency: 'Monthly' })),
      },
      depositInfo: {
        amount: mockLease.deposit,
        paidOn: mockLease.start as string | null,
        receiptNo: 'RCP-DEP-2024-0412' as string | null,
        heldBy: mockProperty.developer,
        deductions: 0,
        refunded: false,
      },
      tenant: mockTenant,
      property: mockProperty,
      renewal: mock.renewal,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const fallbackName = auth.status === 'signedIn' ? auth.user.displayName || auth.user.username : undefined;
  const mappedProfile = mapProfileData(live.profile, isAr, fallbackName);
  const l = live.lease;
  const start = l?.startDate?.slice(0, 10) || mappedProfile.leaseSummary.start;
  const end = l?.endDate?.slice(0, 10) || mappedProfile.leaseSummary.end;
  const rent = Number(l?.rentAmount ?? mappedProfile.leaseSummary.rent);
  const firstDeposit = l?.deposits?.[0];
  const depositAmount = Number(
    l?.securityDepositAmount ?? firstDeposit?.receivedAmount ?? firstDeposit?.requiredAmount ?? 0,
  );
  // The website keeps the rise on renewal as a bare number ("5"); older leases may say "5%".
  const parsedPercent = l?.escalationRuleRef?.match(/(\d+(?:\.\d+)?)/)?.[1];
  const escalationPercent = parsedPercent ? Number(parsedPercent) : 0;
  const current = live.profile?.currentLease;

  return {
    lease: {
      leaseNo: l?.leaseNumber || mappedProfile.leaseSummary.leaseNo,
      title: mockLease.title,
      start,
      end,
      rent,
      deposit: depositAmount,
      status: l?.status ?? current?.status ?? 'Active',
      frequency: l?.rentFrequency ?? current?.rentFrequency ?? 'Monthly',
      escalationPercent,
      escalationText: null as string | null,
      escalationStated: parsedPercent !== undefined,
      noticeDays: l?.noticePeriodDays ?? 0,
      history: (l?.history ?? []).map((h) => ({
        from: h.startDate?.slice(0, 10) ?? start,
        rent: Number(h.rentAmount),
        frequency: h.rentFrequency,
      })),
    },
    depositInfo: {
      amount: Number(firstDeposit?.balanceAmount || firstDeposit?.receivedAmount || depositAmount),
      // Known only from a deposit record; the API has no receipt number for a deposit.
      paidOn: firstDeposit?.receivedDate?.slice(0, 10) ?? null,
      receiptNo: null as string | null,
      heldBy: mappedProfile.property.developer,
      deductions: Number(firstDeposit?.adjustedAmount ?? 0),
      refunded: firstDeposit?.status === 'Refunded',
    },
    tenant: mappedProfile.tenant,
    property: mappedProfile.property,
    renewal: mock.renewal,
    ...status,
  };
}

/** Installments, invoices, receipts, next rent due, and outstanding balance. */
export function usePayments() {
  const isDemo = authMode === 'demo';
  const mock = useMockState();
  const live = useLiveCache();

  const fetchPayments = useCallback(async () => {
    const [profileData, installmentsData, invoicesData, receiptsData] = await Promise.all([
      fetchProfileOnce(),
      getMyInstallments(),
      getMyInvoices(),
      getMyReceipts(),
    ]);
    cache.profile = profileData;
    cache.installments = installmentsData;
    cache.invoices = invoicesData;
    cache.receipts = receiptsData;
    notifyCache();
  }, []);

  const status = useResource(
    Boolean(live.installments && live.invoices && live.receipts && live.profile),
    fetchPayments,
  );

  if (isDemo) {
    const next = nextRentMonth(mock);
    const paidMonths = new Set(mock.payments.map((p) => p.forMonth));
    const bills = unpaidUtilities(mock);
    const overdueBills = bills.filter((b) => daysUntil(b.due) < 0);
    const overdueTotal = overdueBills.reduce((sum, b) => sum + b.amount, 0);
    const scheduleRows: ScheduleRow[] = mockRentalSchedule.map((month) => ({
      key: month,
      month,
      amount: mockLease.rent,
      status: paidMonths.has(month) ? 'paid' : month === next ? 'due' : 'upcoming',
    }));

    return {
      rentAmount: mockLease.rent,
      nextDueAmount: mockLease.rent,
      nextDueDate: next,
      outstandingTotal: overdueTotal,
      overdueCount: overdueBills.length,
      payments: mock.payments,
      scheduleRows,
      scheduleYear: mockLease.end.slice(0, 4),
      // The sample schedule is month by month, and its pages say so in their own words.
      scheduleFrequency: null as string | null,
      openInvoices: [] as MyInvoiceDto[],
      utilities: bills,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const installments = live.installments ?? [];
  const invoices = live.invoices ?? [];
  const receipts = live.receipts ?? [];
  const leaseSummary = live.profile?.currentLease;

  // Earliest installment not Paid or Cancelled.
  const nextInstallment = installments.find((i) => i.status !== 'Paid' && i.status !== 'Cancelled');
  const rentAmount = Number(leaseSummary?.rentAmount ?? nextInstallment?.totalDue ?? 0);
  const nextDueAmount = Number(nextInstallment?.totalDue ?? rentAmount);
  const nextDueDate = (nextInstallment?.dueDate ?? leaseSummary?.endDate ?? omanToday()).slice(0, 10);

  // Sum of outstandingAmount on Posted, PartPaid and Overdue invoices.
  const openInvoices = invoices.filter(
    (inv) =>
      (inv.status === 'Posted' || inv.status === 'PartPaid' || inv.status === 'Overdue') &&
      Number(inv.outstandingAmount) > 0,
  );
  const outstandingTotal = openInvoices.reduce((sum, inv) => sum + Number(inv.outstandingAmount || 0), 0);

  const scheduleRows: ScheduleRow[] = installments.map((inst) => ({
    key: inst.id,
    month: inst.dueDate.slice(0, 10),
    amount: Number(inst.totalDue),
    status:
      inst.status === 'Paid'
        ? 'paid'
        : inst.id === nextInstallment?.id || inst.status === 'Overdue' || inst.status === 'Invoiced'
          ? 'due'
          : 'upcoming',
  }));

  const scheduleYear =
    scheduleRows[scheduleRows.length - 1]?.month.slice(0, 4) ||
    leaseSummary?.endDate?.slice(0, 4) ||
    omanToday().slice(0, 4);

  return {
    rentAmount,
    nextDueAmount,
    nextDueDate,
    outstandingTotal,
    overdueCount: openInvoices.length,
    payments: receipts.map(mapReceiptDto),
    scheduleRows,
    scheduleYear,
    scheduleFrequency: leaseSummary?.rentFrequency ?? null,
    openInvoices,
    utilities: unpaidUtilities(mock),
    ...status,
  };
}

/** Single receipt detail via getMyReceipt/{id}. */
export function useReceiptDetail(id: string) {
  const isDemo = authMode === 'demo';
  const { language } = useLanguage();
  const isAr = language.code === 'ar';
  const mock = useMockState();
  const auth = useAuth();
  const live = useLiveCache();
  const cachedDetail = live.receiptDetails[id];

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const [profileData, detail] = await Promise.all([
      cache.profile ? Promise.resolve(cache.profile) : fetchProfileOnce(),
      getMyReceipt(id),
    ]);
    cache.profile = profileData;
    cache.receiptDetails = { ...cache.receiptDetails, [id]: detail };
    notifyCache();
  }, [id]);

  const status = useResource(Boolean(cachedDetail), fetchDetail);

  if (isDemo) {
    const payment = mock.payments.find((p) => p.id === id) ?? mock.payments[0];
    return {
      payment,
      tenant: mockTenant,
      property: mockProperty,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const fallbackName = auth.status === 'signedIn' ? auth.user.displayName || auth.user.username : undefined;
  const mappedProfile = mapProfileData(live.profile, isAr, fallbackName);
  const fallbackListReceipt = live.receipts?.find((r) => r.id === id);
  const source = cachedDetail ?? fallbackListReceipt;
  const payment: Payment = source
    ? {
        ...mapReceiptDto(source),
        invoiceNo:
          cachedDetail?.invoiceNumber ||
          cachedDetail?.invoice?.invoiceNumber ||
          source.invoiceNumber ||
          source.referenceNo ||
          '—',
        forMonth: `${(cachedDetail?.invoice?.dueDate ?? source.receiptDate ?? omanToday()).slice(0, 7)}-01`,
      }
    : mock.payments[0];

  return {
    payment,
    tenant: mappedProfile.tenant,
    property: mappedProfile.property,
    ...status,
  };
}

/** Tenant documents list and detail via getMyDocuments. */
export function useDocuments() {
  const isDemo = authMode === 'demo';
  const { language } = useLanguage();
  const isAr = language.code === 'ar';
  const auth = useAuth();
  const live = useLiveCache();

  const fetchDocs = useCallback(async () => {
    const [profileData, docsData] = await Promise.all([
      cache.profile ? Promise.resolve(cache.profile) : fetchProfileOnce(),
      getMyDocuments(),
    ]);
    cache.profile = profileData;
    cache.documents = docsData;
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.documents), fetchDocs);

  if (isDemo) {
    return {
      documents: mockDocuments as MappedDocument[],
      tenant: mockTenant,
      property: mockProperty,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const fallbackName = auth.status === 'signedIn' ? auth.user.displayName || auth.user.username : undefined;
  const mappedProfile = mapProfileData(live.profile, isAr, fallbackName);

  return {
    documents: (live.documents ?? []).map(mapDocumentDto),
    tenant: mappedProfile.tenant,
    property: mappedProfile.property,
    ...status,
  };
}

/** Maintenance service requests list and creation. */
export function useRequests() {
  const isDemo = authMode === 'demo';
  const mock = useMockState();
  const live = useLiveCache();

  const fetchRequests = useCallback(async () => {
    const [data, cats] = await Promise.all([
      getMyServiceRequests(),
      getMyServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
    ]);
    cache.requests = data;
    cache.serviceCategories = cats.length > 0 ? cats : DEFAULT_SERVICE_CATEGORIES;
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.requests && live.serviceCategories), fetchRequests);

  const submitRequest = useCallback(
    async (input: {
      category: string;
      priority: RequestPriority;
      description: string;
      photos: string[];
    }): Promise<{ requestNo: string }> => {
      if (isDemo) {
        const matchedCode = (
          DEFAULT_SERVICE_CATEGORIES.find(
            (c) => c.code === input.category || normalizeCategoryName(c.nameEn) === normalizeCategoryName(input.category),
          )?.code ?? 'other'
        ) as RequestCategory;
        const created = raiseRequest({ ...input, category: matchedCode });
        return { requestNo: created.requestNo };
      }
      const activeCategories =
        cache.serviceCategories && cache.serviceCategories.length > 0
          ? cache.serviceCategories
          : DEFAULT_SERVICE_CATEGORIES;
      const matched = findServiceCategory(input.category, activeCategories);
      const categoryNameEn = matched ? matched.nameEn : (CATEGORY_TO_API[input.category as RequestCategory] ?? input.category);
      const created = await createMyServiceRequest({
        category: categoryNameEn,
        priority: PRIORITY_TO_API[input.priority],
        description: input.description,
      });
      // The request is already saved, so a photo that fails to send must not undo it.
      for (const uri of input.photos) {
        await uploadMyServiceRequestPhoto(created.id, uri).catch((e) => {
          if (__DEV__) console.warn('A request photo was not sent:', e);
        });
      }
      cache.requests = [created, ...(cache.requests ?? [])];
      cache.requestDetails = { ...cache.requestDetails, [created.id]: created };
      notifyCache();
      return { requestNo: created.ticketNumber || created.id.slice(0, 8).toUpperCase() };
    },
    [isDemo],
  );

  if (isDemo) {
    return {
      isDemo: true,
      categories: DEFAULT_SERVICE_CATEGORIES,
      requests: mock.requests.map((r) => ({ ...r, categoryCode: r.category, rawCategory: r.category })) as MappedMaintenanceRequest[],
      submitRequest,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const categories =
    live.serviceCategories && live.serviceCategories.length > 0
      ? live.serviceCategories
      : DEFAULT_SERVICE_CATEGORIES;

  return {
    isDemo: false,
    categories,
    requests: (live.requests ?? []).map((dto) => mapServiceRequestDto(dto, categories)),
    submitRequest,
    ...status,
  };
}

/** Single maintenance request detail via getMyServiceRequest/{id}. */
export function useRequestDetail(id: string) {
  const isDemo = authMode === 'demo';
  const mock = useMockState();
  const live = useLiveCache();
  const cachedDetail = live.requestDetails[id];

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const [profileData, detail, photos, cats] = await Promise.all([
      cache.profile ? Promise.resolve(cache.profile) : fetchProfileOnce(),
      getMyServiceRequest(id),
      // The request still shows if its photos cannot be loaded.
      getMyServiceRequestPhotoUris(id).catch(() => [] as string[]),
      cache.serviceCategories
        ? Promise.resolve(cache.serviceCategories)
        : getMyServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
    ]);
    cache.profile = profileData;
    cache.requestDetails = { ...cache.requestDetails, [id]: detail };
    cache.requestPhotos = { ...cache.requestPhotos, [id]: photos };
    cache.serviceCategories = cats.length > 0 ? cats : DEFAULT_SERVICE_CATEGORIES;
    notifyCache();
  }, [id]);

  const status = useResource(Boolean(cachedDetail), fetchDetail);

  if (isDemo) {
    const found = (mock.requests.find((x) => x.id === id) ?? mock.requests[0]) as MappedMaintenanceRequest;
    return {
      categories: DEFAULT_SERVICE_CATEGORIES,
      request: { ...found, categoryCode: found.category, rawCategory: found.category, unitCode: mockProperty.unitNo },
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const categories =
    live.serviceCategories && live.serviceCategories.length > 0
      ? live.serviceCategories
      : DEFAULT_SERVICE_CATEGORIES;
  const fallbackFromList = live.requests?.find((x) => x.id === id);
  const source = cachedDetail ?? fallbackFromList;
  const mapped = source
    ? { ...mapServiceRequestDto(source, categories), unitCode: live.profile?.unit?.unitCode || '—', photos: live.requestPhotos[id] ?? [] }
    : ({ ...mock.requests[0], categoryCode: mock.requests[0].category, rawCategory: mock.requests[0].category, unitCode: live.profile?.unit?.unitCode || '—' } as MappedMaintenanceRequest);

  return {
    categories,
    request: mapped,
    ...status,
  };
}

/** Resident announcements hook. */
export function useAnnouncements() {
  const isDemo = authMode === 'demo';
  const mock = useMockState();
  const live = useLiveCache();

  const fetchAnnouncements = useCallback(async () => {
    const data = await getMyAnnouncements();
    cache.announcements = data;
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.announcements), fetchAnnouncements);

  const acknowledge = useCallback(
    async (id: string) => {
      if (isDemo) {
        mockAcknowledge(id);
        return;
      }
      await apiAcknowledgeAnnouncement(id);
      if (cache.announcements) {
        cache.announcements = cache.announcements.map((a) =>
          a.id === id ? { ...a, acknowledged: true } : a,
        );
      }
      if (cache.announcementDetails[id]) {
        cache.announcementDetails[id] = { ...cache.announcementDetails[id], acknowledged: true };
      }
      notifyCache();
    },
    [isDemo],
  );

  if (isDemo) {
    return {
      isDemo: true,
      announcements: mockAnnouncements,
      acknowledged: mock.acknowledged,
      acknowledge,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const list = live.announcements ?? [];
  return {
    isDemo: false,
    announcements: list.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      titleAr: a.titleAr,
      body: a.body,
      bodyAr: a.bodyAr,
      date: typeof a.date === 'string' ? a.date.slice(0, 10) : '',
      icon: a.icon,
      needsAck: a.needsAck,
    })),
    acknowledged: list.filter((a) => a.acknowledged).map((a) => a.id),
    acknowledge,
    ...status,
  };
}

/** Single announcement detail hook. */
export function useAnnouncementDetail(id: string) {
  const isDemo = authMode === 'demo';
  const mock = useMockState();
  const live = useLiveCache();
  const cachedDetail = live.announcementDetails[id];

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const detail = await getMyAnnouncement(id);
    cache.announcementDetails = { ...cache.announcementDetails, [id]: detail };
    notifyCache();
  }, [id]);

  const status = useResource(Boolean(cachedDetail), fetchDetail);

  const acknowledge = useCallback(async () => {
    if (isDemo) {
      mockAcknowledge(id);
      return;
    }
    await apiAcknowledgeAnnouncement(id);
    if (cache.announcementDetails[id]) {
      cache.announcementDetails[id] = { ...cache.announcementDetails[id], acknowledged: true };
    }
    if (cache.announcements) {
      cache.announcements = cache.announcements.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a,
      );
    }
    notifyCache();
  }, [id, isDemo]);

  if (isDemo) {
    const found = mockAnnouncements.find((x) => x.id === id) ?? mockAnnouncements[0];
    return {
      isDemo: true,
      announcement: found,
      acknowledged: mock.acknowledged.includes(found.id),
      acknowledge,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const detail = cachedDetail ?? live.announcements?.find((x) => x.id === id);
  const isDone = detail ? detail.acknowledged : false;

  return {
    isDemo: false,
    announcement: detail
      ? {
          id: detail.id,
          kind: detail.kind,
          title: detail.title,
          titleAr: detail.titleAr,
          body: detail.body,
          bodyAr: detail.bodyAr,
          date: typeof detail.date === 'string' ? detail.date.slice(0, 10) : '',
          icon: detail.icon,
          needsAck: detail.needsAck,
        }
      : undefined,
    acknowledged: isDone,
    acknowledge,
    ...status,
  };
}

/** Resident notifications hook. */
export function useNotifications() {
  const isDemo = authMode === 'demo';
  const mock = useMockState();
  const live = useLiveCache();

  const fetchNotifications = useCallback(async () => {
    const data = await getMyNotifications();
    cache.notifications = data;
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.notifications), fetchNotifications);

  const markRead = useCallback(
    async (id: string) => {
      if (isDemo) {
        mockMarkRead(id);
        return;
      }
      await apiMarkNotificationRead(id);
      if (cache.notifications) {
        cache.notifications = cache.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        );
        notifyCache();
      }
    },
    [isDemo],
  );

  const markAllRead = useCallback(async () => {
    if (isDemo) {
      mockMarkAllRead();
      return;
    }
    await apiMarkAllNotificationsRead();
    if (cache.notifications) {
      cache.notifications = cache.notifications.map((n) => ({ ...n, read: true }));
      notifyCache();
    }
  }, [isDemo]);

  if (isDemo) {
    const list = [...mock.notifications].sort((a, b) => b.at.localeCompare(a.at));
    return {
      isDemo: true,
      notifications: list,
      unread: list.some((n) => !n.read),
      markRead,
      markAllRead,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const list = [...(live.notifications ?? [])]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      at: typeof n.at === 'string' ? n.at.slice(0, 10) : '',
      read: n.read,
      href: n.href || '/announcements',
    }));

  return {
    isDemo: false,
    notifications: list,
    unread: list.some((n) => !n.read),
    markRead,
    markAllRead,
    ...status,
  };
}

/** A visitor pass as the screens show it. The live API adds Left and Cancelled to the sample statuses. */
export interface MappedVisitor {
  id: string;
  passNo: string;
  name: string;
  mobile: string;
  /** The visit day, YYYY-MM-DD on the phone's clock. */
  date: string;
  purpose: VisitPurpose;
  vehicle: string;
  status: VisitStatus | 'left' | 'cancelled';
  /** What the gate checks; the QR carries it. Absent in the sample app. */
  code?: string;
  unit?: string;
  building?: string;
}

const PURPOSE_TO_API: Record<VisitPurpose, MyVisitorDto['purpose']> = {
  family: 'Family', friend: 'Friend', delivery: 'Delivery', service: 'Service', other: 'Other',
};

const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const mapVisitor = (v: MyVisitorDto): MappedVisitor => ({
  id: v.id,
  passNo: v.passNumber,
  name: v.guestName ?? '',
  mobile: v.guestMobile ?? '',
  date: localDay(v.validFromUtc),
  purpose: v.purpose.toLowerCase() as VisitPurpose,
  vehicle: v.plateNumber ?? '',
  status: v.status.toLowerCase() as MappedVisitor['status'],
  code: v.passCode,
  unit: v.unitCode ?? undefined,
  building: v.propertyName ?? undefined,
});

/**
 * The tenant's visitors: invite one for a day, and the pass is ready for the gate at once.
 * The whole visit day on the phone's clock is sent, so the pass works on that date only.
 */
export function useVisitors() {
  const isDemo = authMode === 'demo';
  const mock = useMockState();
  const live = useLiveCache();

  const fetchVisitors = useCallback(async () => {
    cache.visitors = await getMyVisitors();
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.visitors), fetchVisitors);

  const invite = useCallback(
    async (input: { name: string; mobile: string; date: string; purpose: VisitPurpose; vehicle: string }): Promise<string> => {
      if (isDemo) return mockInviteVisitor(input).id;
      const created = await inviteMyVisitor({
        guestName: input.name,
        guestMobile: input.mobile || undefined,
        validFromUtc: new Date(`${input.date}T00:00:00`).toISOString(),
        validToUtc: new Date(`${input.date}T23:59:59`).toISOString(),
        purpose: PURPOSE_TO_API[input.purpose],
        plateNumber: input.vehicle || undefined,
      });
      cache.visitors = [created, ...(cache.visitors ?? [])];
      notifyCache();
      return created.id;
    },
    [isDemo],
  );

  const cancel = useCallback(
    async (id: string) => {
      if (isDemo) return;
      const saved = await cancelMyVisitor(id);
      cache.visitors = (cache.visitors ?? []).map((v) => (v.id === id ? saved : v));
      notifyCache();
    },
    [isDemo],
  );

  if (isDemo) {
    return {
      isDemo: true,
      visitors: mock.visitors as MappedVisitor[],
      invite,
      cancel,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  return { isDemo: false, visitors: (live.visitors ?? []).map(mapVisitor), invite, cancel, ...status };
}

/** A bookable facility as the phone screens render it. */
export interface MappedFacility {
  id: string;
  kind: FacilityKind;
  name: string;
  location: string;
  fee: number;
  capacity: number;
  opens: string;
  closes: string;
  slotMinutes: number;
  requiresApproval: boolean;
}

/** A facility reservation as the phone screens render it. */
export interface MappedBooking {
  id: string;
  number: string;
  facilityId: string;
  facilityName: string;
  date: string;
  slot: string;
  guests: number;
  fee: number;
  status: ApiFacilityBookingStatus;
  notes?: string;
  reason?: string;
  canCancel: boolean;
}

function inferFacilityKind(dto: MyFacilityDto): FacilityKind {
  const text = `${dto.facilityCode ?? ''} ${dto.nameEn ?? ''}`.toLowerCase();
  if (text.includes('pool') || text.includes('swim')) return 'pool';
  if (text.includes('gym') || text.includes('fitness')) return 'gym';
  if (text.includes('club') || text.includes('lounge') || text.includes('hall')) return 'clubhouse';
  if (text.includes('bbq') || text.includes('grill') || text.includes('barbecue')) return 'bbq';
  if (text.includes('court') || text.includes('padel') || text.includes('tennis') || text.includes('squash')) return 'court';
  if (text.includes('park')) return 'guestParking';
  return 'meetingRoom';
}

function mapFacilityDto(dto: MyFacilityDto, isAr: boolean): MappedFacility {
  return {
    id: dto.id,
    kind: inferFacilityKind(dto),
    name: (isAr && dto.nameAr?.trim()) || dto.nameEn,
    location: dto.locationDescription?.trim() || dto.facilityCode || '—',
    fee: Number(dto.bookingFee ?? 0),
    capacity: dto.capacity && dto.capacity > 0 ? dto.capacity : 0,
    opens: dto.openingTime || '08:00',
    closes: dto.closingTime || '22:00',
    slotMinutes: dto.slotMinutes && dto.slotMinutes >= 15 ? dto.slotMinutes : 60,
    requiresApproval: Boolean(dto.requiresApproval),
  };
}

function mapBookingDto(dto: MyFacilityBookingDto, isAr: boolean): MappedBooking {
  return {
    id: dto.id,
    number: dto.number,
    facilityId: dto.facilityId,
    facilityName: (isAr && dto.facilityNameAr?.trim()) || dto.facilityNameEn,
    date: dto.date,
    slot: dto.slotLabel,
    guests: dto.guests,
    fee: Number(dto.fee ?? 0),
    status: dto.status,
    notes: dto.notes?.trim() || undefined,
    reason: (dto.cancelReason || dto.decisionReason)?.trim() || undefined,
    canCancel: Boolean(dto.canCancel),
  };
}

function buildDemoSlots(opens: string, closes: string, date: string): MyFacilitySlotDto[] {
  const start = Number(opens.slice(0, 2));
  const end = closes === '23:59' ? 24 : Number(closes.slice(0, 2));
  const out: MyFacilitySlotDto[] = [];
  let idx = 0;
  for (let h = start; h + 2 <= end; h += 2) {
    const startTime = `${String(h).padStart(2, '0')}:00`;
    const endTime = `${String(h + 2).padStart(2, '0')}:00`;
    const isTaken = (idx + Number(date.slice(8))) % 3 === 0;
    out.push({
      startUtc: `${date}T${startTime}:00Z`,
      endUtc: `${date}T${endTime}:00Z`,
      startTime,
      endTime,
      label: `${startTime}–${endTime}`,
      isAvailable: !isTaken,
      isPast: false,
      isTaken,
      bookingStatus: isTaken ? 'Confirmed' : null,
    });
    idx++;
  }
  return out;
}

/**
 * Bookable facilities at the tenant's leased properties, day-by-day slot availability,
 * and the tenant's own reservations with book and cancel.
 */
export function useFacilities() {
  const isDemo = authMode === 'demo';
  const { language } = useLanguage();
  const isAr = language.code === 'ar';
  const mock = useMockState();
  const live = useLiveCache();

  const fetchFacilitiesAndBookings = useCallback(async () => {
    const [facs, bkgs] = await Promise.all([getMyFacilities(), getMyBookings()]);
    cache.facilities = facs;
    cache.bookings = bkgs;
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.facilities && live.bookings), fetchFacilitiesAndBookings);

  const loadAvailability = useCallback(
    async (facilityId: string, date: string): Promise<MyFacilitySlotDto[]> => {
      if (isDemo) {
        const fac = mockFacilities.find((x) => x.id === facilityId) ?? mockFacilities[0];
        return buildDemoSlots(fac.opens, fac.closes, date);
      }
      return getMyAvailability(facilityId, date);
    },
    [isDemo],
  );

  const bookFacility = useCallback(
    async (input: {
      facilityId: string;
      date: string;
      startTime: string;
      slotLabel: string;
      guests: number;
      notes?: string;
    }): Promise<MappedBooking> => {
      if (isDemo) {
        const created = mockBook({
          facilityId: input.facilityId,
          date: input.date,
          slot: input.slotLabel,
          guests: input.guests,
        });
        const fac = mockFacilities.find((x) => x.id === input.facilityId);
        return {
          id: created.id,
          number: `BKG-${input.date.slice(0, 4)}-000${mock.bookings.length + 1}`,
          facilityId: created.facilityId,
          facilityName: fac?.name ?? '—',
          date: created.date,
          slot: created.slot,
          guests: created.guests,
          fee: fac?.fee ?? 0,
          status: 'Confirmed',
          notes: input.notes?.trim() || undefined,
          canCancel: true,
        };
      }
      const created = await bookMyFacility({
        facilityId: input.facilityId,
        date: input.date,
        startTime: input.startTime,
        guests: input.guests,
        notes: input.notes?.trim() || undefined,
      });
      cache.bookings = [created, ...(cache.bookings ?? [])];
      notifyCache();
      return mapBookingDto(created, isAr);
    },
    [isAr, isDemo, mock.bookings.length],
  );

  const cancel = useCallback(
    async (id: string) => {
      if (isDemo) {
        mockCancelBooking(id);
        return;
      }
      const saved = await cancelMyBooking(id);
      cache.bookings = (cache.bookings ?? []).map((b) => (b.id === id ? saved : b));
      notifyCache();
    },
    [isDemo],
  );

  if (isDemo) {
    return {
      isDemo: true,
      facilities: mockFacilities.map((f) => ({
        ...f,
        slotMinutes: 120,
        requiresApproval: false,
      })) as MappedFacility[],
      bookings: mock.bookings.map((b, idx) => {
        const fac = mockFacilities.find((x) => x.id === b.facilityId);
        return {
          id: b.id,
          number: `BKG-${b.date.slice(0, 4)}-${String(idx + 1).padStart(4, '0')}`,
          facilityId: b.facilityId,
          facilityName: fac?.name ?? '—',
          date: b.date,
          slot: b.slot,
          guests: b.guests,
          fee: fac?.fee ?? 0,
          status: 'Confirmed' as const,
          canCancel: true,
        };
      }) as MappedBooking[],
      loadAvailability,
      bookFacility,
      cancel,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  return {
    isDemo: false,
    facilities: (live.facilities ?? []).map((f) => mapFacilityDto(f, isAr)),
    bookings: (live.bookings ?? []).map((b) => mapBookingDto(b, isAr)),
    loadAvailability,
    bookFacility,
    cancel,
    ...status,
  };
}

/**
 * What the tenant may do on a violation, by the same rule as the website: appeal while it is
 * open or a notice has been sent, ask a question unless it is cancelled, and neither while an
 * earlier appeal or question is still waiting for the office.
 */
export function violationActions(v: MyViolationDto) {
  const pending = v.appeals.some((a) => a.status === 'Pending');
  return {
    canAppeal: !pending && (v.status === 'Open' || v.status === 'NoticeSent'),
    canAsk: !pending && v.status !== 'Cancelled',
  };
}

/** The violations recorded against the tenant, and appealing or asking about one. */
export function useViolations() {
  const isDemo = authMode === 'demo';
  const mock = useMockState();
  const live = useLiveCache();

  const fetchViolations = useCallback(async () => {
    cache.violations = await getMyViolations();
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.violations), fetchViolations);

  const appeal = useCallback(
    async (id: string, type: ViolationAppealType, reason: string) => {
      if (isDemo) {
        mockAppealViolation(id, type, reason);
        return;
      }
      const created = await appealMyViolation(id, { type, reason });
      cache.violations = (cache.violations ?? []).map((v) => (v.id === id ? { ...v, appeals: [...v.appeals, created] } : v));
      notifyCache();
    },
    [isDemo],
  );

  if (isDemo) {
    return { isDemo: true, violations: mock.violations, appeal, loading: false, refreshing: false, error: null, refresh: () => Promise.resolve() };
  }
  return { isDemo: false, violations: live.violations ?? [], appeal, ...status };
}
