import { describe, expect, it } from '@jest/globals';

import type { StaffLease } from '@/api/staff';

import {
  computeRenewalNumber,
  leaseEffectiveEnd,
  sortLeasesCurrentFirst,
  staffLeasePhase,
  wasEndedEarly,
} from './staff-helpers';

const makeLease = (overrides: Partial<StaffLease>): StaffLease => ({
  id: 'l-default',
  leaseNumber: 'LSE-0001',
  propertyId: 'p1',
  unitId: 'u1',
  tenantId: 't1',
  status: 'Active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  rentAmount: 500,
  rentFrequency: 'Monthly',
  isActive: true,
  ...overrides,
});

describe('staff-helpers lease helpers', () => {
  const today = new Date('2026-06-15T00:00:00Z');

  it('classifies lease phases and ignores Cancelled', () => {
    expect(staffLeasePhase(makeLease({ status: 'Cancelled' }), today)).toBeUndefined();
    expect(staffLeasePhase(makeLease({ status: 'Draft' }), today)).toBe('draft');
    expect(staffLeasePhase(makeLease({ status: 'Expired' }), today)).toBe('past');
    expect(staffLeasePhase(makeLease({ status: 'Terminated' }), today)).toBe('past');
    expect(staffLeasePhase(makeLease({ status: 'Renewed' }), today)).toBe('past');
    expect(staffLeasePhase(makeLease({ status: 'PendingApproval' }), today)).toBe('upcoming');
    expect(staffLeasePhase(makeLease({ status: 'Active', startDate: '2026-09-01' }), today)).toBe('upcoming');
    expect(staffLeasePhase(makeLease({ status: 'Active', startDate: '2026-01-01' }), today)).toBe('current');
    expect(staffLeasePhase(makeLease({ status: 'NoticePeriod', startDate: '2026-01-01' }), today)).toBe('current');
  });

  it('sorts leases with Cancelled left out, current → upcoming → draft → past, and newest startDate first', () => {
    const leases: StaffLease[] = [
      makeLease({ id: 'cancelled', status: 'Cancelled', startDate: '2026-05-01' }),
      makeLease({ id: 'past-old', status: 'Expired', startDate: '2023-01-01' }),
      makeLease({ id: 'draft', status: 'Draft', startDate: '2027-01-01' }),
      makeLease({ id: 'current-older', status: 'Active', startDate: '2025-06-01' }),
      makeLease({ id: 'upcoming', status: 'PendingApproval', startDate: '2026-08-01' }),
      makeLease({ id: 'past-newer', status: 'Terminated', startDate: '2024-03-01' }),
      makeLease({ id: 'current-newer', status: 'NoticePeriod', startDate: '2026-02-01' }),
    ];

    const sorted = sortLeasesCurrentFirst(leases, today);
    expect(sorted.map((l) => l.id)).toEqual([
      'current-newer',
      'current-older',
      'upcoming',
      'draft',
      'past-newer',
      'past-old',
    ]);
  });

  it('computes leaseEffectiveEnd and wasEndedEarly from terminationDate vs endDate', () => {
    const normal = makeLease({ endDate: '2026-12-31', terminationDate: null });
    expect(leaseEffectiveEnd(normal)).toBe('2026-12-31');
    expect(wasEndedEarly(normal)).toBe(false);

    const early = makeLease({ endDate: '2026-12-31', terminationDate: '2026-08-15' });
    expect(leaseEffectiveEnd(early)).toBe('2026-08-15');
    expect(wasEndedEarly(early)).toBe(true);

    const atEnd = makeLease({ endDate: '2026-12-31', terminationDate: '2026-12-31' });
    expect(leaseEffectiveEnd(atEnd)).toBe('2026-12-31');
    expect(wasEndedEarly(atEnd)).toBe(false);
  });

  it('computes renewal number along previousLeaseId chain and terminates safely on a loop', () => {
    const l0 = makeLease({ id: 'l0', previousLeaseId: null });
    const l1 = makeLease({ id: 'l1', previousLeaseId: 'l0' });
    const l2 = makeLease({ id: 'l2', previousLeaseId: 'l1' });
    const all = [l0, l1, l2];

    expect(computeRenewalNumber(l0, all)).toBe(0);
    expect(computeRenewalNumber(l1, all)).toBe(1);
    expect(computeRenewalNumber(l2, all)).toBe(2);

    const cycA = makeLease({ id: 'cycA', previousLeaseId: 'cycB' });
    const cycB = makeLease({ id: 'cycB', previousLeaseId: 'cycA' });
    expect(computeRenewalNumber(cycA, [cycA, cycB])).toBe(1);
  });
});
