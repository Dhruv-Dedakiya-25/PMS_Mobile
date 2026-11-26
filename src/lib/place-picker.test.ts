import { describe, expect, it } from '@jest/globals';
import type { StaffInvoice, StaffLease, StaffTenant, StaffUnit } from '@/api/staff';
import {
  VILLAS,
  computeInvoiceAllocations,
  currentLeaseForUnit,
  currentTenantForUnit,
  placeFromUnitId,
  resolveUnitPaymentSelection,
  tenantsForPlace,
} from './place-picker';

const TODAY = new Date('2026-06-15T00:00:00Z');

const units: StaffUnit[] = [
  {
    id: 'unit-a1204',
    propertyId: 'prop-marina',
    buildingId: 'bldg-a',
    unitTypeId: 'ut-1',
    unitCode: 'A-1204',
    unitNameEn: '2BR Sea View',
    status: 'Occupied',
    isActive: true,
  },
  {
    id: 'unit-b0301',
    propertyId: 'prop-marina',
    buildingId: 'bldg-b',
    unitTypeId: 'ut-1',
    unitCode: 'B-0301',
    unitNameEn: '1BR City View',
    status: 'Occupied',
    isActive: true,
  },
  {
    id: 'unit-v22',
    propertyId: 'prop-villas',
    buildingId: null,
    unitTypeId: 'ut-2',
    unitCode: 'V-22',
    unitNameEn: '4BR Villa',
    status: 'Occupied',
    isActive: true,
  },
];

const tenants: StaffTenant[] = [
  {
    id: 'ten-ahmed',
    tenantNumber: 'TEN-0001',
    displayNameEn: 'Ahmed Al Harthy',
    displayNameAr: 'أحمد الحارثي',
    primaryMobile: '+96891234567',
    isActive: true,
  },
  {
    id: 'ten-fatima',
    tenantNumber: 'TEN-0002',
    displayNameEn: 'Fatima Al Lawati',
    displayNameAr: 'فاطمة اللواتي',
    primaryMobile: '+96892345678',
    isActive: true,
  },
  {
    id: 'ten-salim',
    tenantNumber: 'TEN-0003',
    displayNameEn: 'Salim Al Rawahi',
    displayNameAr: 'سالم الرواحي',
    primaryMobile: '+96893456789',
    isActive: true,
  },
];

const makeLease = (
  overrides: Partial<StaffLease> & Pick<StaffLease, 'id' | 'leaseNumber' | 'unitId' | 'tenantId'>,
): StaffLease => ({
  propertyId: 'prop-marina',
  status: 'Active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  rentAmount: 750,
  rentFrequency: 'Monthly',
  isActive: true,
  ...overrides,
});

const makeInvoice = (
  overrides: Partial<StaffInvoice> & Pick<StaffInvoice, 'id' | 'invoiceNumber' | 'dueDate' | 'totalAmount'>,
): StaffInvoice => ({
  propertyId: 'prop-marina',
  tenantId: 'ten-ahmed',
  leaseId: 'l-cur',
  invoiceDate: '2026-01-01',
  status: 'Overdue',
  currencyCode: 'OMR',
  paidAmount: 0,
  outstandingAmount: overrides.totalAmount - (overrides.paidAmount ?? 0),
  ...overrides,
});

describe('phone place-picker helpers', () => {
  it('resolves unit → lease → tenant for a picked unit and derives place from unitId', () => {
    const currentLease = makeLease({
      id: 'l-cur',
      leaseNumber: 'LSE-2026-0001',
      unitId: 'unit-a1204',
      tenantId: 'ten-ahmed',
      status: 'Active',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const pastLease = makeLease({
      id: 'l-past',
      leaseNumber: 'LSE-2025-0001',
      unitId: 'unit-a1204',
      tenantId: 'ten-fatima',
      status: 'Expired',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });

    expect(placeFromUnitId('unit-a1204', units)).toEqual({
      propertyId: 'prop-marina',
      buildingId: 'bldg-a',
      unitId: 'unit-a1204',
    });
    expect(placeFromUnitId('unit-v22', units)).toEqual({
      propertyId: 'prop-villas',
      buildingId: VILLAS,
      unitId: 'unit-v22',
    });

    expect(currentTenantForUnit('unit-a1204', [pastLease, currentLease], TODAY)).toBe('ten-ahmed');
    expect(currentLeaseForUnit('unit-a1204', [pastLease, currentLease], TODAY)).toBe('l-cur');

    const resolved = resolveUnitPaymentSelection(
      'unit-a1204',
      [pastLease, currentLease],
      [{ id: 'inv-1', leaseId: 'l-cur', status: 'Overdue', totalAmount: 750, paidAmount: 0, outstandingAmount: 750 }],
      undefined,
      TODAY,
    );
    expect(resolved.leaseId).toBe('l-cur');
    expect(resolved.tenantId).toBe('ten-ahmed');
    expect(resolved.hasMultipleOpenInvoiceLeases).toBe(false);
  });

  it('offers multiple leases when more than one lease on the unit has open invoices and switches tenant with the chosen lease', () => {
    const currentLease = makeLease({
      id: 'l-cur',
      leaseNumber: 'LSE-2026-0001',
      unitId: 'unit-a1204',
      tenantId: 'ten-ahmed',
      status: 'Active',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const priorLeaseOtherTenant = makeLease({
      id: 'l-prior',
      leaseNumber: 'LSE-2024-0001',
      unitId: 'unit-a1204',
      tenantId: 'ten-fatima',
      status: 'Expired',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
    const invoices = [
      { id: 'inv-1', leaseId: 'l-cur', status: 'Overdue', totalAmount: 750, paidAmount: 0, outstandingAmount: 750 },
      { id: 'inv-2', leaseId: 'l-prior', status: 'Overdue', totalAmount: 500, paidAmount: 100, outstandingAmount: 400 },
    ];

    const multi = resolveUnitPaymentSelection(
      'unit-a1204',
      [priorLeaseOtherTenant, currentLease],
      invoices,
      undefined,
      TODAY,
    );
    expect(multi.hasMultipleOpenInvoiceLeases).toBe(true);
    expect(multi.leases.map((l) => l.id)).toEqual(['l-cur', 'l-prior']);
    expect(multi.leaseId).toBe('l-cur');
    expect(multi.tenantId).toBe('ten-ahmed');

    const pickedPrior = resolveUnitPaymentSelection(
      'unit-a1204',
      [priorLeaseOtherTenant, currentLease],
      invoices,
      'l-prior',
      TODAY,
    );
    expect(pickedPrior.leaseId).toBe('l-prior');
    expect(pickedPrior.tenantId).toBe('ten-fatima');
  });

  it('narrows tenants to the chosen place and falls back to the full tenant list when leases is empty', () => {
    const leases: StaffLease[] = [
      makeLease({ id: 'l-a', leaseNumber: 'LSE-2026-0001', unitId: 'unit-a1204', tenantId: 'ten-ahmed' }),
      makeLease({ id: 'l-b', leaseNumber: 'LSE-2026-0002', unitId: 'unit-b0301', tenantId: 'ten-fatima' }),
    ];

    expect(
      tenantsForPlace(tenants, leases, units, { propertyId: 'prop-marina', buildingId: 'bldg-a' }, undefined, TODAY).map(
        (t) => t.id,
      ),
    ).toEqual(['ten-ahmed']);

    // Empty leases fallback (e.g. Maintenance role without Lease View permission)
    expect(
      tenantsForPlace(tenants, [], units, { propertyId: 'prop-marina', buildingId: 'bldg-a' }, undefined, TODAY).map(
        (t) => t.id,
      ),
    ).toEqual(['ten-ahmed', 'ten-fatima', 'ten-salim']);
  });

  it('allocates payment amount against open invoices oldest-due first and computes unallocated remainder', () => {
    const invoices: StaffInvoice[] = [
      makeInvoice({
        id: 'inv-newer',
        invoiceNumber: 'INV-2026-0002',
        dueDate: '2026-05-01',
        totalAmount: 750,
        paidAmount: 0,
        outstandingAmount: 750,
      }),
      makeInvoice({
        id: 'inv-oldest',
        invoiceNumber: 'INV-2026-0001',
        dueDate: '2026-04-01',
        totalAmount: 500,
        paidAmount: 100,
        outstandingAmount: 400,
      }),
      makeInvoice({
        id: 'inv-paid',
        invoiceNumber: 'INV-2026-0000',
        dueDate: '2026-03-01',
        status: 'Paid',
        totalAmount: 500,
        paidAmount: 500,
        outstandingAmount: 0,
      }),
    ];

    // Partial payment covering oldest (400) + part of newer (250)
    const partial = computeInvoiceAllocations(invoices, 'ten-ahmed', 650);
    expect(partial.rows.map((r) => r.invoice.id)).toEqual(['inv-oldest', 'inv-newer']);
    expect(partial.rows.map((r) => r.allocated)).toEqual([400, 250]);
    expect(partial.totalOutstanding).toBe(1150);
    expect(partial.totalAllocated).toBe(650);
    expect(partial.unallocated).toBe(0);

    // Overpayment leaving an unallocated advance balance
    const overpaid = computeInvoiceAllocations(invoices, 'ten-ahmed', 1300);
    expect(overpaid.rows.map((r) => r.allocated)).toEqual([400, 750]);
    expect(overpaid.totalAllocated).toBe(1150);
    expect(overpaid.unallocated).toBe(150);
  });
});
