import type { TFunction } from 'i18next';
import type {
  StaffBuilding,
  StaffFloorZone,
  StaffInstallment,
  StaffInvoice,
  StaffLease,
  StaffProperty,
  StaffPropertyType,
  StaffTenant,
  StaffUnit,
} from '@/api/staff';
import type { Accent } from '@/theme/tokens';

export const PAGE_STEP = 20;

/** Returns Arabic text when the active language is Arabic and an Arabic value exists, otherwise English. */
export function byLang(code: string, en?: string | null, ar?: string | null): string {
  const isAr = code.startsWith('ar');
  if (isAr && ar && ar.trim()) return ar;
  return en || ar || '';
}

export function unitStatusAccent(status?: string): Accent {
  switch (status) {
    case 'Occupied':
      return 'success';
    case 'Vacant':
    case 'NoticePeriod':
      return 'warning';
    case 'Reserved':
      return 'teal';
    case 'OwnerOccupied':
      return 'violet';
    case 'UnderMaintenance':
    case 'Blocked':
      return 'danger';
    default:
      return 'primary';
  }
}

export function translateUnitStatus(t: TFunction, status?: string): string {
  if (!status) return '—';
  return t(`staff.unitStatus.${status}`, { defaultValue: status });
}

export function leaseStatusAccent(status?: string): Accent {
  switch (status) {
    case 'Active':
    case 'Renewed':
      return 'success';
    case 'PendingApproval':
    case 'NoticePeriod':
      return 'warning';
    case 'Expired':
    case 'Terminated':
    case 'Cancelled':
      return 'danger';
    case 'Draft':
    default:
      return 'primary';
  }
}

export function translateLeaseStatus(t: TFunction, status?: string): string {
  if (!status) return '—';
  return t(`lease.statuses.${status}`, { defaultValue: status });
}

export function translateRentFrequency(t: TFunction, freq?: string): string {
  if (!freq) return '';
  return t(`lease.frequencies.${freq}`, { defaultValue: freq });
}

export function translateStructure(t: TFunction, structure?: string): string {
  if (!structure) return '';
  return t(`staff.structure.${structure}`, { defaultValue: structure });
}

export function translateFurnishing(t: TFunction, furnishing?: string): string {
  if (!furnishing) return '—';
  return t(`staff.furnishing.${furnishing}`, { defaultValue: furnishing });
}

export function translateTicketStatus(t: TFunction, status?: string): string {
  if (!status) return '—';
  return t(`staff.ticketStatus.${status}`, { defaultValue: status });
}

export function translatePriority(t: TFunction, priority?: string): string {
  if (!priority) return '—';
  return t(`staff.priorityLevel.${priority}`, { defaultValue: priority });
}

export function unitSpecsText(u: Pick<StaffUnit, 'bedrooms' | 'bathrooms' | 'areaSqm'>, t: TFunction): string {
  return `${u.bedrooms ?? 0} ${t('staff.beds')} • ${u.bathrooms ?? 0} ${t('staff.baths')} • ${u.areaSqm ?? 0} ${t('staff.sqm')}`;
}

/** True when a lease currently holds its unit (mirrors the website's leasePhase === 'current'). */
export function isCurrentLease(l: StaffLease, today = new Date()): boolean {
  if (
    l.status === 'Cancelled' ||
    l.status === 'Draft' ||
    l.status === 'Expired' ||
    l.status === 'Terminated' ||
    l.status === 'Renewed' ||
    l.status === 'PendingApproval'
  ) {
    return false;
  }
  if (l.startDate && new Date(l.startDate) > today) {
    return false;
  }
  return true;
}

/** Computes total, occupied, vacant, noticePeriod, occupancyPct, and activeLeases for a set of units. */
export function summarizeUnits(units: StaffUnit[], leases: StaffLease[]) {
  const total = units.length;
  const occupied = units.filter((u) => u.status === 'Occupied').length;
  const vacant = units.filter((u) => u.status === 'Vacant').length;
  const noticePeriod = units.filter((u) => u.status === 'NoticePeriod').length;
  const taken = occupied + noticePeriod;
  const occupancyPct = total > 0 ? Math.round((taken / total) * 100) : 0;
  const unitIds = new Set(units.map((u) => u.id));
  const activeLeases = leases.filter((l) => unitIds.has(l.unitId) && isCurrentLease(l)).length;
  return {
    total,
    occupied,
    vacant,
    noticePeriod,
    taken,
    occupancyPct,
    activeLeases,
  };
}

/**
 * Formats a property, building or floor card's unit counts using the exact same numbers as the
 * summary strip (occupied is Occupied only, and NoticePeriod is shown separately when > 0).
 */
export function formatUnitsSummary(
  stats: Pick<ReturnType<typeof summarizeUnits>, 'total' | 'occupied' | 'vacant' | 'noticePeriod'>,
  t: TFunction,
): string {
  const base = t('staff.unitsSummary', {
    count: stats.total,
    occupied: stats.occupied,
    vacant: stats.vacant,
  });
  if (stats.noticePeriod > 0) {
    return `${base} · ${t('staff.noticeCount', { n: stats.noticePeriod })}`;
  }
  return base;
}

/** Matches PMS.Core.Enums.InvoiceStatus: Draft | Posted | PartPaid | Paid | Overdue | Cancelled */
export type EffectiveInvoiceStatus = 'Overdue' | 'Posted' | 'PartPaid' | 'Paid' | 'Draft' | 'Cancelled' | string;

export function effectiveInvoiceStatus(inv: StaffInvoice, todayIso = new Date().toISOString().slice(0, 10)): EffectiveInvoiceStatus {
  if (inv.status === 'Paid') return 'Paid';
  if (inv.status === 'Cancelled') return 'Cancelled';
  if (inv.status === 'Draft') return 'Draft';
  if (inv.status === 'Overdue' || (inv.outstandingAmount > 0 && inv.dueDate && inv.dueDate.slice(0, 10) < todayIso)) {
    return 'Overdue';
  }
  if (inv.status === 'PartPaid' || inv.status === 'PartiallyPaid' || inv.status === 'PartlyPaid' || (inv.paidAmount > 0 && inv.outstandingAmount > 0)) {
    return 'PartPaid';
  }
  if (inv.status === 'Posted' || inv.status === 'Issued' || inv.status === 'Unpaid' || inv.outstandingAmount > 0) {
    return 'Posted';
  }
  return inv.status || 'Posted';
}

export function invoiceStatusAccent(status: EffectiveInvoiceStatus): Accent {
  switch (status) {
    case 'Paid':
      return 'success';
    case 'Overdue':
    case 'Cancelled':
      return 'danger';
    case 'PartPaid':
    case 'Posted':
      return 'warning';
    case 'Draft':
    default:
      return 'primary';
  }
}

export function translateInvoiceStatus(t: TFunction, status: EffectiveInvoiceStatus): string {
  return t(`staff.invoiceStatus.${status}`, { defaultValue: status });
}

/** Matches PMS.Core.Enums.ReceiptStatus: Draft | Posted | Reversed */
export function receiptStatusAccent(status?: string): Accent {
  const s = status || 'Posted';
  if (s === 'Posted') return 'success';
  if (s === 'Reversed') return 'danger';
  return 'primary';
}

export function translateReceiptStatus(t: TFunction, status?: string): string {
  const s = status || 'Posted';
  return t(`staff.receiptStatus.${s}`, { defaultValue: s });
}

/** Matches PMS.Core.Enums.PaymentMethod: Cash | Cheque | BankTransfer | Card | OnlineGateway | Other */
export function translatePaymentMethod(t: TFunction, method?: string): string {
  if (!method) return '—';
  return t(`staff.paymentMethods.${method}`, { defaultValue: method });
}

/**
 * Matches PMS.Core.Enums.InstallmentStatus: Scheduled | Invoiced | PartPaid | Paid | Overdue | Cancelled.
 * Cancelled is never treated as Overdue or Due.
 */
export type EffectiveInstallmentStatus = 'Due' | 'Overdue' | 'Paid' | 'Cancelled';

export function effectiveInstallmentStatus(
  inst: StaffInstallment,
  todayIso = new Date().toISOString().slice(0, 10),
): EffectiveInstallmentStatus {
  if (inst.status === 'Cancelled') return 'Cancelled';
  if (inst.status === 'Paid') return 'Paid';
  if (inst.status === 'Overdue' || (inst.dueDate && inst.dueDate.slice(0, 10) < todayIso)) {
    return 'Overdue';
  }
  return 'Due';
}

export function installmentStatusAccent(status: EffectiveInstallmentStatus): Accent {
  if (status === 'Paid') return 'success';
  if (status === 'Overdue') return 'danger';
  if (status === 'Cancelled') return 'primary';
  return 'warning';
}

export function translateInstallmentStatus(t: TFunction, status: EffectiveInstallmentStatus): string {
  return t(`staff.installmentStatus.${status}`, { defaultValue: status });
}

export interface PlaceLookupContext {
  code: string;
  propertyById: Map<string, StaffProperty>;
  propertyTypeById?: Map<string, StaffPropertyType>;
  buildingById: Map<string, StaffBuilding>;
  floorById?: Map<string, StaffFloorZone>;
}

function joinPlaceParts(parts: (string | undefined | null)[]): string {
  const clean = parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
  return clean.filter((p, idx) => idx === 0 || p !== clean[idx - 1]).join(' • ');
}

export function resolveBuildingOrVillaType(
  unit: StaffUnit | undefined,
  property: StaffProperty | undefined,
  ctx: PlaceLookupContext,
): string | undefined {
  if (!unit) return undefined;
  if (unit.buildingId) {
    const bld = ctx.buildingById.get(unit.buildingId);
    if (bld) return byLang(ctx.code, bld.buildingNameEn, bld.buildingNameAr);
  }
  const pt =
    (unit.propertyTypeId ? ctx.propertyTypeById?.get(unit.propertyTypeId) : undefined) ??
    (property?.propertyTypeId ? ctx.propertyTypeById?.get(property.propertyTypeId) : undefined);
  return pt ? byLang(ctx.code, pt.nameEn, pt.nameAr) : undefined;
}

/**
 * Formats a unit's place trail as "Unit › Building (or villa type) › Property",
 * deduplicating adjacent identical segments (e.g. an Individual structure property).
 */
export function formatUnitTrail(
  unit: StaffUnit | undefined,
  property: StaffProperty | undefined,
  ctx: PlaceLookupContext,
): string {
  const prop = property ?? (unit ? ctx.propertyById.get(unit.propertyId) : undefined);
  const propName = prop ? byLang(ctx.code, prop.propertyNameEn, prop.propertyNameAr) : undefined;
  const bldOrType = resolveBuildingOrVillaType(unit, prop, ctx);
  const parts = [unit?.unitCode, bldOrType, propName]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  return parts.filter((p, idx) => idx === 0 || p !== parts[idx - 1]).join(' › ');
}

export type StaffLeasePhase = 'current' | 'upcoming' | 'draft' | 'past';

/** Mirrors the website's leasePhase in src/feature-module/leases/lease-phase.ts. */
export function staffLeasePhase(l: StaffLease, today = new Date()): StaffLeasePhase | undefined {
  if (l.status === 'Cancelled') return undefined;
  if (l.status === 'Draft') return 'draft';
  if (l.status === 'Expired' || l.status === 'Terminated' || l.status === 'Renewed') return 'past';
  if (l.status === 'PendingApproval' || (l.startDate && new Date(l.startDate) > today)) return 'upcoming';
  return 'current';
}

/** The last day a lease held its unit: the termination date when it ended early. */
export function leaseEffectiveEnd(l: StaffLease): string | null {
  if (l.terminationDate && l.endDate && new Date(l.terminationDate) < new Date(l.endDate)) {
    return l.terminationDate;
  }
  return l.endDate;
}

/** True when a lease was terminated before its original end date. */
export function wasEndedEarly(l: StaffLease): boolean {
  return Boolean(l.terminationDate && l.endDate && new Date(l.terminationDate) < new Date(l.endDate));
}

const LEASE_PHASE_ORDER: Record<StaffLeasePhase, number> = {
  current: 0,
  upcoming: 1,
  draft: 2,
  past: 3,
};

/**
 * Sorts a list of leases with current ones first, then upcoming/draft, then past ones,
 * and newest startDate first within each phase (leaving out Cancelled leases).
 */
export function sortLeasesCurrentFirst(leases: StaffLease[], today = new Date()): StaffLease[] {
  return leases
    .filter((l) => staffLeasePhase(l, today) !== undefined)
    .sort((a, b) => {
      const pa = staffLeasePhase(a, today);
      const pb = staffLeasePhase(b, today);
      const rankDiff = (pa ? LEASE_PHASE_ORDER[pa] : 4) - (pb ? LEASE_PHASE_ORDER[pb] : 4);
      if (rankDiff !== 0) return rankDiff;
      const da = a.startDate ? new Date(a.startDate).getTime() : 0;
      const db = b.startDate ? new Date(b.startDate).getTime() : 0;
      return db - da;
    });
}

/** Counts how many renewals precede this lease by walking previousLeaseId. */
export function computeRenewalNumber(lease: StaffLease, allLeases: StaffLease[]): number {
  const byId = new Map(allLeases.map((l) => [l.id, l]));
  const visited = new Set<string>([lease.id]);
  let count = 0;
  let currentId = lease.previousLeaseId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    count += 1;
    const prev = byId.get(currentId);
    currentId = prev?.previousLeaseId;
  }
  return count;
}

export function translateTenantType(t: TFunction, type?: string | null): string {
  if (!type) return '—';
  return t(`staff.tenantTypes.${type}`, { defaultValue: type });
}

export function translateOccupantType(t: TFunction, type?: string | null): string {
  if (!type) return '—';
  return t(`staff.occupantTypes.${type}`, { defaultValue: type });
}

export function translateVehicleType(t: TFunction, type?: string | null): string {
  if (!type) return '—';
  return t(`staff.vehicleTypes.${type}`, { defaultValue: type });
}

export function translateDocumentType(t: TFunction, type?: string | null): string {
  if (!type) return '—';
  return t(`staff.documentTypes.${type}`, { defaultValue: type });
}

export function translateVerificationStatus(t: TFunction, status?: string | null): string {
  if (!status) return '—';
  return t(`staff.verificationStatuses.${status}`, { defaultValue: status });
}

export function verificationStatusAccent(status?: string | null): Accent {
  switch (status) {
    case 'Verified':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Rejected':
    case 'Expired':
      return 'danger';
    default:
      return 'primary';
  }
}

export function translateDepositType(t: TFunction, type?: string | null): string {
  if (!type) return '—';
  return t(`staff.depositTypes.${type}`, { defaultValue: type });
}

export function translateDepositStatus(t: TFunction, status?: string | null): string {
  if (!status) return '—';
  return t(`staff.depositStatuses.${status}`, { defaultValue: status });
}

export function depositStatusAccent(status?: string | null): Accent {
  switch (status) {
    case 'Held':
      return 'teal';
    case 'Refunded':
      return 'success';
    case 'PartRefunded':
    case 'Pending':
      return 'warning';
    case 'Forfeited':
      return 'danger';
    default:
      return 'primary';
  }
}

export function translateChargeType(t: TFunction, type?: string | null): string {
  if (!type) return '—';
  return t(`staff.chargeTypes.${type}`, { defaultValue: type });
}

/**
 * Shared one-line place text for every staff list card:
 * - Units card (`kind: 'unit'`): Tenant • Building (or villa type) • Floor • Property
 * - Leases, Tenants, Invoices, Receipts, Installments (`kind: 'record'`):
 *   Lead (Tenant name or Lease number) • Unit code • Building (or villa type) • Property
 */
export function formatCardPlace(
  item:
    | {
        kind: 'unit';
        unit: StaffUnit;
        tenant?: StaffTenant;
      }
    | {
        kind: 'record';
        lead?: string;
        tenant?: StaffTenant;
        unit?: StaffUnit;
        property?: StaffProperty;
      },
  ctx: PlaceLookupContext,
): string {
  if (item.kind === 'unit') {
    const prop = ctx.propertyById.get(item.unit.propertyId);
    const propName = prop ? byLang(ctx.code, prop.propertyNameEn, prop.propertyNameAr) : undefined;
    const bldOrType = resolveBuildingOrVillaType(item.unit, prop, ctx);
    const fl = item.unit.floorZoneId ? ctx.floorById?.get(item.unit.floorZoneId) : undefined;
    const floorName = fl ? byLang(ctx.code, fl.nameEn, fl.nameAr) : undefined;
    const tenantName = item.tenant
      ? byLang(ctx.code, item.tenant.displayNameEn, item.tenant.displayNameAr)
      : undefined;
    return joinPlaceParts([tenantName, bldOrType, floorName, propName]);
  }

  const prop = item.property ?? (item.unit ? ctx.propertyById.get(item.unit.propertyId) : undefined);
  const propName = prop ? byLang(ctx.code, prop.propertyNameEn, prop.propertyNameAr) : undefined;
  const bldOrType = resolveBuildingOrVillaType(item.unit, prop, ctx);
  const leadText =
    item.lead ??
    (item.tenant ? byLang(ctx.code, item.tenant.displayNameEn, item.tenant.displayNameAr) : undefined);
  return joinPlaceParts([leadText, item.unit?.unitCode, bldOrType, propName]);
}

