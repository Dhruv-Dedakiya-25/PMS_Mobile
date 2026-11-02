/**
 * One data layer for PMS_Mobile:
 * - In `demo` mode, returns sample data from `src/mock/data.ts` and `src/mock/store.ts`.
 * - In `api` mode, calls `src/api/my.ts` and maps responses into the shapes the screens render.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  createMyServiceRequest,
  getMyDocuments,
  getMyInstallments,
  getMyInvoices,
  getMyLease,
  getMyProfile,
  getMyReceipt,
  getMyReceipts,
  getMyServiceRequest,
  getMyServiceRequests,
} from '@/api/my';
import type {
  ApiServicePriority,
  MyDocumentDto,
  MyInstallmentDto,
  MyInvoiceDto,
  MyLeaseDto,
  MyProfileDto,
  MyReceiptDetailDto,
  MyReceiptDto,
  MyServiceRequestDto,
} from '@/api/types';
import { login, logout, restoreSession, useAuth } from '@/auth/session';
import { authMode, brand } from '@/config';
import { useLanguage } from '@/i18n';
import { daysUntil } from '@/lib/format';
import { omanToday } from '@/mock/clock';
import {
  documents as mockDocuments,
  lease as mockLease,
  parking as mockParking,
  property as mockProperty,
  rentalSchedule as mockRentalSchedule,
  tenant as mockTenant,
  unit as mockUnit,
  type DocumentKind,
  type MaintenanceRequest,
  type Payment,
  type PaymentMethod,
  type RequestCategory,
  type RequestPriority,
  type RequestStage,
} from '@/mock/data';
import {
  nextRentMonth,
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
  requests?: MyServiceRequestDto[];
  requestDetails: Record<string, MyServiceRequestDto>;
}

let cache: LiveCache = {
  receiptDetails: {},
  requestDetails: {},
};
const cacheListeners = new Set<() => void>();

function notifyCache() {
  cache = { ...cache };
  cacheListeners.forEach((l) => l());
}

export function clearTenancyCache() {
  cache = { receiptDetails: {}, requestDetails: {} };
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

const API_TO_CATEGORY: Record<string, RequestCategory> = {
  airconditioning: 'airConditioning',
  'air conditioning': 'airConditioning',
  ac: 'airConditioning',
  hvac: 'airConditioning',
  plumbing: 'plumbing',
  electrical: 'electrical',
  appliance: 'appliance',
  appliances: 'appliance',
  carpentry: 'carpentry',
  'doors & carpentry': 'carpentry',
  'doors and carpentry': 'carpentry',
  pestcontrol: 'pestControl',
  'pest control': 'pestControl',
  cleaning: 'cleaning',
  other: 'other',
};

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

function mapCategoryFromApi(rawCategory: string): { category: RequestCategory; categoryLabel?: string } {
  const normalized = (rawCategory ?? '').trim().toLowerCase();
  const matched = API_TO_CATEGORY[normalized];
  if (matched) return { category: matched };
  const trimmed = (rawCategory ?? '').trim();
  return { category: 'other', categoryLabel: trimmed || undefined };
}

export function mapServiceRequestDto(dto: MyServiceRequestDto): MappedMaintenanceRequest {
  const stage = mapStageFromApi(dto.status, dto.assignedTo);
  const { category, categoryLabel } = mapCategoryFromApi(dto.category);
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
    categoryLabel,
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
          };
        })
      : dto.vehicles.map((v) => ({
          bay: v.bayCode || '—',
          level: (isAr && v.zoneNameAr?.trim()) || v.zoneNameEn || '—',
          kind: (v.bayType === 'Open' ? 'open' : 'covered') as 'covered' | 'open',
          vehicle: [v.make, v.model, v.colour ? `(${v.colour})` : ''].filter(Boolean).join(' ') || v.vehicleType,
          plate: v.plateNumber || '—',
          tag: v.permitNo || '—',
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
      },
      depositInfo: {
        amount: mockLease.deposit,
        paidOn: mockLease.start as string | null,
        receiptNo: 'RCP-DEP-2024-0412' as string | null,
        heldBy: mockProperty.developer,
        deductions: 0,
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
  const parsedPercent = l?.escalationRuleRef?.match(/(\d+(?:\.\d+)?)\s*%/)?.[1];
  // The renewal and escalation pages are still sample pages and need a figure to work with;
  // the lease pages show "—" when the lease states no escalation rule.
  const escalationPercent = parsedPercent ? Number(parsedPercent) : mockLease.escalationPercent;
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
      escalationText: l?.escalationRuleRef || null,
      escalationStated: Boolean(l?.escalationRuleRef),
      noticeDays: l?.noticePeriodDays ?? mockLease.noticeDays,
    },
    depositInfo: {
      amount: Number(firstDeposit?.balanceAmount || firstDeposit?.receivedAmount || depositAmount),
      // Known only from a deposit record; the API has no receipt number for a deposit.
      paidOn: firstDeposit?.receivedDate?.slice(0, 10) ?? null,
      receiptNo: null as string | null,
      heldBy: mappedProfile.property.developer,
      deductions: Number(firstDeposit?.adjustedAmount ?? 0),
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
    const data = await getMyServiceRequests();
    cache.requests = data;
    notifyCache();
  }, []);

  const status = useResource(Boolean(live.requests), fetchRequests);

  const submitRequest = useCallback(
    async (input: {
      category: RequestCategory;
      priority: RequestPriority;
      description: string;
      photos: string[];
    }): Promise<{ requestNo: string }> => {
      if (isDemo) {
        const created = raiseRequest(input);
        return { requestNo: created.requestNo };
      }
      const created = await createMyServiceRequest({
        category: CATEGORY_TO_API[input.category],
        priority: PRIORITY_TO_API[input.priority],
        description: input.description,
      });
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
      requests: mock.requests as MappedMaintenanceRequest[],
      submitRequest,
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  return {
    isDemo: false,
    requests: (live.requests ?? []).map(mapServiceRequestDto),
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
    const [profileData, detail] = await Promise.all([
      cache.profile ? Promise.resolve(cache.profile) : fetchProfileOnce(),
      getMyServiceRequest(id),
    ]);
    cache.profile = profileData;
    cache.requestDetails = { ...cache.requestDetails, [id]: detail };
    notifyCache();
  }, [id]);

  const status = useResource(Boolean(cachedDetail), fetchDetail);

  if (isDemo) {
    const found = (mock.requests.find((x) => x.id === id) ?? mock.requests[0]) as MappedMaintenanceRequest;
    return {
      request: { ...found, unitCode: mockProperty.unitNo },
      loading: false,
      refreshing: false,
      error: null,
      refresh: () => Promise.resolve(),
    };
  }

  const fallbackFromList = live.requests?.find((x) => x.id === id);
  const source = cachedDetail ?? fallbackFromList;
  const mapped = source
    ? { ...mapServiceRequestDto(source), unitCode: live.profile?.unit?.unitCode || '—' }
    : ({ ...mock.requests[0], unitCode: live.profile?.unit?.unitCode || '—' } as MappedMaintenanceRequest);

  return {
    request: mapped,
    ...status,
  };
}
