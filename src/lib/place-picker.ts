import type { TFunction } from 'i18next';
import type {
  StaffBuilding,
  StaffInvoice,
  StaffLease,
  StaffProperty,
  StaffTenant,
  StaffUnit,
} from '@/api/staff';
import {
  byLang,
  sortLeasesCurrentFirst,
  staffLeasePhase,
  translateLeaseStatus,
} from '@/lib/staff-helpers';

/** The Building choice for units that sit under no building, such as villas. */
export const VILLAS = 'none';

export interface PlaceSelection {
  propertyId: string;
  buildingId: string;
  unitId: string;
}

export function buildingOptionsForProperty(
  propertyId: string,
  buildings: readonly StaffBuilding[],
  units: readonly StaffUnit[],
  languageCode: string,
  villasLabel: string,
): { label: string; value: string }[] {
  const propertyUnits = propertyId ? units.filter((u) => u.propertyId === propertyId) : units;
  const availableBuildings = propertyId ? buildings.filter((b) => b.propertyId === propertyId) : buildings;
  const options = availableBuildings.map((b) => ({
    label: byLang(languageCode, b.buildingNameEn, b.buildingNameAr),
    value: b.id,
  }));
  if (propertyUnits.some((u) => !u.buildingId)) {
    options.push({ label: villasLabel, value: VILLAS });
  }
  return options;
}

export function unitOptionsForPlace(
  propertyId: string,
  buildingId: string,
  units: readonly StaffUnit[],
): StaffUnit[] {
  const propertyUnits = propertyId ? units.filter((u) => u.propertyId === propertyId) : [...units];
  return propertyUnits.filter(
    (u) => !buildingId || (buildingId === VILLAS ? !u.buildingId : u.buildingId === buildingId),
  );
}

export function placeFromUnitId(
  unitId: string | undefined,
  units: readonly StaffUnit[],
): PlaceSelection {
  if (!unitId) return { propertyId: '', buildingId: '', unitId: '' };
  const u = units.find((x) => x.id === unitId);
  if (!u) return { propertyId: '', buildingId: '', unitId };
  return {
    propertyId: u.propertyId,
    buildingId: u.buildingId || VILLAS,
    unitId: u.id,
  };
}

export function unitMatchesPlace(
  unitId: string | undefined,
  propertyId: string | undefined,
  place: Partial<PlaceSelection>,
  unitById: ReadonlyMap<string, StaffUnit>,
): boolean {
  if (place.unitId) return unitId === place.unitId;
  const u = unitId ? unitById.get(unitId) : undefined;
  const effPropertyId = propertyId || u?.propertyId;
  if (place.propertyId && effPropertyId !== place.propertyId) return false;
  if (place.buildingId) {
    if (!u) return false;
    const bKey = u.buildingId || VILLAS;
    if (bKey !== place.buildingId) return false;
  }
  return true;
}

export function leasesForPlace(
  leases: readonly StaffLease[],
  units: readonly StaffUnit[],
  place: Partial<PlaceSelection>,
  today = new Date(),
): StaffLease[] {
  const unitById = new Map(units.map((u) => [u.id, u]));
  const matching = leases.filter(
    (l) => l.status !== 'Cancelled' && unitMatchesPlace(l.unitId, l.propertyId, place, unitById),
  );
  return sortLeasesCurrentFirst(matching, today);
}

/**
 * Returns the unit's current tenantId (from the unit's current lease, or most recent non-cancelled, non-draft lease).
 */
export function currentTenantForUnit(
  unitId: string | undefined,
  leases: readonly StaffLease[],
  today = new Date(),
): string | undefined {
  if (!unitId) return undefined;
  const unitLeases = sortLeasesCurrentFirst(
    leases.filter((l) => l.unitId === unitId && l.status !== 'Draft'),
    today,
  );
  const current = unitLeases.find((l) => staffLeasePhase(l, today) === 'current');
  return (current ?? unitLeases[0])?.tenantId;
}

/**
 * Returns the unit's current leaseId (or most recent non-cancelled lease on that unit).
 */
export function currentLeaseForUnit(
  unitId: string | undefined,
  leases: readonly StaffLease[],
  today = new Date(),
): string | undefined {
  if (!unitId) return undefined;
  const unitLeases = sortLeasesCurrentFirst(
    leases.filter((l) => l.unitId === unitId),
    today,
  );
  const current = unitLeases.find((l) => staffLeasePhase(l, today) === 'current');
  return (current ?? unitLeases[0])?.id;
}

/**
 * Tenants for a chosen place: lists only tenants who have a lease at that place
 * (with current tenants first), while preserving any saved tenantId.
 * When leases cannot be read (e.g. Maintenance role, so `leases` is empty), falls back to the full tenant list.
 */
export function tenantsForPlace(
  tenants: readonly StaffTenant[],
  leases: readonly StaffLease[],
  units: readonly StaffUnit[],
  place: Partial<PlaceSelection>,
  savedTenantId?: string,
  today = new Date(),
): StaffTenant[] {
  const hasPlace = Boolean(place.propertyId || place.buildingId || place.unitId);
  if (!hasPlace || leases.length === 0) return [...tenants];

  const matchingLeases = leasesForPlace(leases, units, place, today);
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  matchingLeases.forEach((l) => {
    if (l.tenantId && !seen.has(l.tenantId)) {
      seen.add(l.tenantId);
      orderedIds.push(l.tenantId);
    }
  });
  if (savedTenantId && !seen.has(savedTenantId)) {
    seen.add(savedTenantId);
    orderedIds.push(savedTenantId);
  }
  const byId = new Map(tenants.map((t) => [t.id, t]));
  return orderedIds.map((id) => byId.get(id)).filter((x): x is StaffTenant => Boolean(x));
}

export interface UnitPaymentSelection {
  unitId: string;
  leaseId?: string;
  tenantId?: string;
  /** Candidate leases to offer in the Lease dropdown, sorted current first. */
  leases: StaffLease[];
  /** True when the unit has more than one lease with open invoices so the user can choose between them. */
  hasMultipleOpenInvoiceLeases: boolean;
}

const isOpenInvoice = (
  inv: Pick<StaffInvoice, 'status' | 'totalAmount' | 'paidAmount' | 'outstandingAmount'>,
): boolean => {
  if (inv.status === 'Paid' || inv.status === 'Cancelled') return false;
  const outstanding = inv.outstandingAmount ?? inv.totalAmount - (inv.paidAmount || 0);
  return outstanding > 0;
};

/**
 * Pure selection logic for Record Payment when a unit is picked (unit → lease → tenant):
 * - Picks the unit's current lease and that lease's tenant.
 * - If the unit has more than one lease with open invoices, returns those leases so the user
 *   can choose between them (keeping preferredLeaseId if it is one of them, else defaulting
 *   to the current/first lease with open invoices).
 */
export function resolveUnitPaymentSelection(
  unitId: string,
  allLeases: readonly StaffLease[],
  invoices: readonly Pick<
    StaffInvoice,
    'id' | 'leaseId' | 'status' | 'totalAmount' | 'paidAmount' | 'outstandingAmount'
  >[] = [],
  preferredLeaseId?: string,
  today = new Date(),
): UnitPaymentSelection {
  const unitLeases = sortLeasesCurrentFirst(
    allLeases.filter((l) => l.unitId === unitId && l.status !== 'Cancelled' && l.status !== 'Draft'),
    today,
  );
  if (unitLeases.length === 0) {
    return {
      unitId,
      leaseId: undefined,
      tenantId: undefined,
      leases: [],
      hasMultipleOpenInvoiceLeases: false,
    };
  }

  const openLeaseIds = new Set(
    invoices
      .filter(isOpenInvoice)
      .map((inv) => inv.leaseId)
      .filter((id): id is string => Boolean(id)),
  );
  const leasesWithOpen = unitLeases.filter((l) => openLeaseIds.has(l.id));
  const hasMultipleOpenInvoiceLeases = leasesWithOpen.length > 1;

  const currentLease = unitLeases.find((l) => staffLeasePhase(l, today) === 'current');
  let selectedLease: StaffLease | undefined;

  if (hasMultipleOpenInvoiceLeases) {
    selectedLease =
      leasesWithOpen.find((l) => l.id === preferredLeaseId) ??
      leasesWithOpen.find((l) => staffLeasePhase(l, today) === 'current') ??
      leasesWithOpen[0];
  } else {
    selectedLease =
      (preferredLeaseId ? unitLeases.find((l) => l.id === preferredLeaseId) : undefined) ??
      currentLease ??
      leasesWithOpen[0] ??
      unitLeases[0];
  }

  const candidateLeases = hasMultipleOpenInvoiceLeases
    ? leasesWithOpen
    : selectedLease
      ? unitLeases.filter((l) => l.tenantId === selectedLease.tenantId || l.id === selectedLease.id)
      : unitLeases;

  return {
    unitId,
    leaseId: selectedLease?.id,
    tenantId: selectedLease?.tenantId,
    leases: candidateLeases,
    hasMultipleOpenInvoiceLeases,
  };
}

export interface InvoiceAllocationRow {
  invoice: StaffInvoice;
  outstanding: number;
  allocated: number;
}

export interface InvoiceAllocationSummary {
  rows: InvoiceAllocationRow[];
  totalOutstanding: number;
  totalAllocated: number;
  unallocated: number;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Computes the read-only oldest-due-first allocation preview for a tenant's open invoices,
 * matching the website's Record Payment allocation preview and server-side allocation rule.
 */
export function computeInvoiceAllocations(
  invoices: readonly StaffInvoice[],
  tenantId: string | undefined,
  receivedAmount: number,
): InvoiceAllocationSummary {
  if (!tenantId) {
    return { rows: [], totalOutstanding: 0, totalAllocated: 0, unallocated: 0 };
  }
  const openInvoices = invoices
    .filter((i) => i.tenantId === tenantId && i.status !== 'Paid' && i.status !== 'Cancelled')
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const validReceived = Number.isFinite(receivedAmount) && receivedAmount > 0 ? round3(receivedAmount) : 0;
  let left = validReceived;

  const rows: InvoiceAllocationRow[] = openInvoices.map((inv) => {
    const rawOutstanding = inv.outstandingAmount ?? inv.totalAmount - (inv.paidAmount || 0);
    const outstanding = round3(Math.max(rawOutstanding, 0));
    const allocated = round3(Math.min(outstanding, Math.max(left, 0)));
    left = round3(Math.max(0, left - allocated));
    return { invoice: inv, outstanding, allocated };
  });

  const totalOutstanding = round3(rows.reduce((sum, r) => sum + r.outstanding, 0));
  const totalAllocated = round3(rows.reduce((sum, r) => sum + r.allocated, 0));
  const unallocated = round3(validReceived - totalAllocated);

  return { rows, totalOutstanding, totalAllocated, unallocated };
}

/**
 * Formats a lease option label as:
 *   "leaseNumber · unit · building (or villa) · status"
 */
export function formatStaffLeaseOptionLabel(
  lease: Pick<StaffLease, 'leaseNumber' | 'unitId' | 'status'>,
  units: readonly StaffUnit[],
  buildings: readonly StaffBuilding[],
  languageCode: string,
  t: TFunction,
): string {
  const unit = units.find((u) => u.id === lease.unitId);
  const buildingLabel = unit?.buildingId
    ? (() => {
        const b = buildings.find((x) => x.id === unit.buildingId);
        return b ? byLang(languageCode, b.buildingNameEn, b.buildingNameAr) : undefined;
      })()
    : unit
      ? t('staff.villasOtherSpaces')
      : undefined;
  const statusLabel = translateLeaseStatus(t, lease.status);
  return [lease.leaseNumber, unit?.unitCode, buildingLabel, statusLabel].filter(Boolean).join(' · ');
}

/**
 * Formats a tenant option label using byLang (Arabic name in Arabic) and the TEN number.
 */
export function formatStaffTenantOptionLabel(
  tenant: Pick<StaffTenant, 'tenantNumber' | 'displayNameEn' | 'displayNameAr'>,
  languageCode: string,
): string {
  const name = byLang(languageCode, tenant.displayNameEn, tenant.displayNameAr);
  return `${name} (${tenant.tenantNumber})`;
}

export function formatStaffPropertyOptionLabel(
  property: Pick<StaffProperty, 'propertyCode' | 'propertyNameEn' | 'propertyNameAr'>,
  languageCode: string,
): string {
  return `${byLang(languageCode, property.propertyNameEn, property.propertyNameAr)} (${property.propertyCode})`;
}
