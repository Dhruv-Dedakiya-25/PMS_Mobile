import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffBuildings,
  getStaffDeposits,
  getStaffInstallments,
  getStaffInvoices,
  getStaffLease,
  getStaffLeaseCharges,
  getStaffLeases,
  getStaffProperties,
  getStaffPropertyTypes,
  getStaffTenants,
  getStaffUnits,
  type StaffBuilding,
  type StaffDeposit,
  type StaffInstallment,
  type StaffInvoice,
  type StaffLease,
  type StaffLeaseCharge,
  type StaffProperty,
  type StaffPropertyType,
  type StaffTenant,
  type StaffUnit,
} from '@/api/staff';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Details, Onward, Pill, SectionHeader, SummaryStrip } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, omr } from '@/lib/format';
import {
  byLang,
  computeRenewalNumber,
  depositStatusAccent,
  effectiveInstallmentStatus,
  effectiveInvoiceStatus,
  formatUnitTrail,
  installmentStatusAccent,
  invoiceStatusAccent,
  leaseEffectiveEnd,
  leaseStatusAccent,
  PAGE_STEP,
  staffLeasePhase,
  translateChargeType,
  translateDepositStatus,
  translateDepositType,
  translateInstallmentStatus,
  translateInvoiceStatus,
  translateLeaseStatus,
  translateRentFrequency,
  wasEndedEarly,
  type PlaceLookupContext,
} from '@/lib/staff-helpers';
import { space } from '@/theme/tokens';

export default function LeaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const { accessTo } = useAppSession();
  const canSeeFinance = accessTo('/staff/finance') !== null;
  const canSeeTenant = accessTo('/staff/tenant') !== null;
  const canSeeUnit = accessTo('/staff/unit') !== null;
  const canSeeLease = accessTo('/staff/lease') !== null;
  const canSeeInvoice = accessTo('/staff/invoice') !== null;

  const [lease, setLease] = useState<StaffLease | null>(null);
  const [allLeases, setAllLeases] = useState<StaffLease[]>([]);
  const [tenants, setTenants] = useState<StaffTenant[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [buildings, setBuildings] = useState<StaffBuilding[]>([]);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<StaffPropertyType[]>([]);
  const [deposits, setDeposits] = useState<StaffDeposit[]>([]);
  const [charges, setCharges] = useState<StaffLeaseCharge[]>([]);
  const [installments, setInstallments] = useState<StaffInstallment[]>([]);
  const [invoices, setInvoices] = useState<StaffInvoice[]>([]);
  const [instLimit, setInstLimit] = useState(PAGE_STEP);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!id) return null;
    const quiet = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
    const [
      singleLease,
      leasesList,
      allTenants,
      allUnits,
      allBuildings,
      allProps,
      allPropTypes,
      allDeposits,
      allCharges,
      allInstallments,
      allInvoices,
    ] = await Promise.all([
      getStaffLease(id).catch(() => null),
      quiet(getStaffLeases()),
      quiet(getStaffTenants()),
      quiet(getStaffUnits()),
      quiet(getStaffBuildings()),
      quiet(getStaffProperties()),
      quiet(getStaffPropertyTypes()),
      canSeeFinance ? quiet(getStaffDeposits()) : Promise.resolve([] as StaffDeposit[]),
      canSeeFinance ? quiet(getStaffLeaseCharges()) : Promise.resolve([] as StaffLeaseCharge[]),
      canSeeFinance ? quiet(getStaffInstallments()) : Promise.resolve([] as StaffInstallment[]),
      canSeeFinance ? quiet(getStaffInvoices()) : Promise.resolve([] as StaffInvoice[]),
    ]);
    const resolvedLease = singleLease ?? leasesList.find((l) => l.id === id) ?? null;
    return {
      resolvedLease,
      leasesList,
      allTenants,
      allUnits,
      allBuildings,
      allProps,
      allPropTypes,
      allDeposits,
      allCharges,
      allInstallments,
      allInvoices,
    };
  }, [id, canSeeFinance]);

  const applyData = useCallback(
    (res: NonNullable<Awaited<ReturnType<typeof loadAll>>>) => {
      setLease(res.resolvedLease);
      setAllLeases(res.leasesList);
      setTenants(res.allTenants);
      setUnits(res.allUnits);
      setBuildings(res.allBuildings);
      setProperties(res.allProps);
      setPropertyTypes(res.allPropTypes);
      setDeposits(res.allDeposits.filter((d) => d.leaseId === id));
      setCharges(res.allCharges.filter((c) => c.leaseId === id));
      setInstallments(
        res.allInstallments
          .filter((inst) => inst.leaseId === id)
          .sort((a, b) => a.installmentNo - b.installmentNo),
      );
      setInvoices(
        res.allInvoices
          .filter((inv) => inv.leaseId === id)
          .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || '')),
      );
      setError(null);
    },
    [id],
  );

  const fetchData = useCallback(
    (isRefresh = false) => {
      if (!id) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      loadAll()
        .then((res) => {
          if (res) applyData(res);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : t('common.errorLoad'));
        })
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [id, loadAll, applyData, t],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadAll()
      .then((res) => {
        if (!cancelled && res) applyData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.errorLoad'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, loadAll, applyData, t]);

  const tenant = useMemo(
    () => (lease ? tenants.find((tn) => tn.id === lease.tenantId) ?? null : null),
    [lease, tenants],
  );
  const unit = useMemo(
    () => (lease ? units.find((u) => u.id === lease.unitId) ?? undefined : undefined),
    [lease, units],
  );
  const property = useMemo(
    () => (lease ? properties.find((p) => p.id === lease.propertyId) ?? undefined : undefined),
    [lease, properties],
  );

  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const propertyTypeById = useMemo(() => new Map(propertyTypes.map((pt) => [pt.id, pt])), [propertyTypes]);
  const buildingById = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);

  const placeCtx = useMemo<PlaceLookupContext>(
    () => ({ code, propertyById, propertyTypeById, buildingById }),
    [code, propertyById, propertyTypeById, buildingById],
  );

  const unitTrail = useMemo(
    () => formatUnitTrail(unit, property, placeCtx) || unit?.unitCode || '—',
    [unit, property, placeCtx],
  );

  const previousLease = useMemo(
    () => (lease?.previousLeaseId ? allLeases.find((l) => l.id === lease.previousLeaseId) ?? null : null),
    [lease, allLeases],
  );
  const renewedIntoLease = useMemo(
    () => (lease ? allLeases.find((l) => l.previousLeaseId === lease.id) ?? null : null),
    [lease, allLeases],
  );
  const renewalNumber = useMemo(
    () => (lease ? computeRenewalNumber(lease, allLeases) : 0),
    [lease, allLeases],
  );

  const effectiveEnd = lease ? leaseEffectiveEnd(lease) : null;
  const daysText = useMemo(() => {
    if (!lease || !effectiveEnd) return '—';
    const d = daysUntil(effectiveEnd);
    const phase = staffLeasePhase(lease);
    if (d < 0 || phase === 'past') {
      return `${t('staff.leaseEnded')} (${t('staff.nDays', { value: String(Math.abs(d)) })})`;
    }
    return t('staff.nDays', { value: String(d) });
  }, [lease, effectiveEnd, t]);

  const depositsHeldTotal = useMemo(
    () => deposits.reduce((sum, d) => sum + (d.balanceAmount || 0), 0),
    [deposits],
  );

  const installmentStats = useMemo(() => {
    let paidCount = 0;
    let paidTotal = 0;
    let dueCount = 0;
    let dueTotal = 0;
    let overdueCount = 0;
    let overdueTotal = 0;
    for (const inst of installments) {
      const st = effectiveInstallmentStatus(inst);
      if (st === 'Paid') {
        paidCount += 1;
        paidTotal += inst.totalDue || 0;
      } else if (st === 'Overdue') {
        overdueCount += 1;
        overdueTotal += inst.totalDue || 0;
      } else if (st === 'Due') {
        dueCount += 1;
        dueTotal += inst.totalDue || 0;
      }
    }
    return { paidCount, paidTotal, dueCount, dueTotal, overdueCount, overdueTotal };
  }, [installments]);

  const breadcrumbs = useMemo(
    () => [
      { label: t('tabs.properties'), onPress: () => router.push('/staff/properties' as any) },
      { label: t('staff.leasesTab'), onPress: () => router.push('/staff/properties' as any) },
      { label: lease?.leaseNumber || t('staff.leaseDetails') },
    ],
    [lease?.leaseNumber, t],
  );

  return (
    <Page
      title={lease?.leaseNumber || t('staff.leaseDetails')}
      breadcrumbs={breadcrumbs}
      right={
        lease ? (
          <Pill accent={leaseStatusAccent(lease.status)} label={translateLeaseStatus(t, lease.status)} />
        ) : undefined
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
      error={error}
      onRetry={() => fetchData(false)}>
      {lease && (
        <View style={{ gap: space.md }}>
          {/* Top rent & status card */}
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <AppText variant="bodyLarge" weight="bold">
                {lease.leaseNumber}
              </AppText>
              <Pill accent={leaseStatusAccent(lease.status)} label={translateLeaseStatus(t, lease.status)} />
            </View>

            <View style={{ gap: space.xs }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.rentAmount')}
              </AppText>
              <AppText variant="heading" weight="bold" tone="primary">
                {omr(lease.rentAmount, code)} / {translateRentFrequency(t, lease.rentFrequency)}
              </AppText>
            </View>

            {wasEndedEarly(lease) && lease.endDate ? (
              <AppText variant="caption" tone="warning">
                {t('staff.endedEarly', { date: longDate(lease.endDate, code) })}
              </AppText>
            ) : null}
          </Card>

          {/* Linked Tenant Card */}
          <Card
            onPress={canSeeTenant && lease.tenantId ? () => router.push(`/staff/tenant/${lease.tenantId}` as any) : undefined}
            style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" tone="secondary">
                  {t('staff.tenant')}
                </AppText>
                <AppText variant="bodyLarge" weight="bold" tone={canSeeTenant && lease.tenantId ? 'primary' : 'default'}>
                  {tenant ? byLang(code, tenant.displayNameEn, tenant.displayNameAr) : '—'}
                </AppText>
                {tenant ? (
                  <AppText variant="caption" tone="muted">
                    {[tenant.tenantNumber, tenant.primaryMobile].filter(Boolean).join(' • ')}
                  </AppText>
                ) : null}
              </View>
              {canSeeTenant && lease.tenantId ? <Onward /> : null}
            </View>
          </Card>

          {/* Linked Unit › Building › Property Card */}
          <Card
            onPress={canSeeUnit && lease.unitId ? () => router.push(`/staff/unit/${lease.unitId}` as any) : undefined}
            style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" tone="secondary">
                  {t('staff.unit')}
                </AppText>
                <AppText variant="bodyLarge" weight="bold" tone={canSeeUnit && lease.unitId ? 'primary' : 'default'}>
                  {unitTrail}
                </AppText>
              </View>
              {canSeeUnit && lease.unitId ? <Onward /> : null}
            </View>
          </Card>

          {/* Lease Details & Terms */}
          <Details
            title={t('staff.leaseDetails')}
            rows={[
              [t('staff.status'), translateLeaseStatus(t, lease.status)],
              [
                t('staff.rentAmount'),
                `${omr(lease.rentAmount, code)} / ${translateRentFrequency(t, lease.rentFrequency)}`,
              ],
              [t('staff.startDate'), lease.startDate ? longDate(lease.startDate, code) : '—'],
              [t('staff.endDate'), effectiveEnd ? longDate(effectiveEnd, code) : '—'],
              [t('staff.daysRemaining'), daysText],
              [t('staff.signedDate'), lease.signedDate ? longDate(lease.signedDate, code) : '—'],
              [
                t('staff.noticePeriod'),
                lease.noticePeriodDays != null ? t('staff.nDays', { value: String(lease.noticePeriodDays) }) : '—',
              ],
              [
                t('staff.escalation'),
                lease.escalationRuleRef ? t('staff.nRenewal', { value: `${lease.escalationRuleRef}%` }) : '—',
              ],
              [t('staff.renewal'), `#${renewalNumber}`],
            ]}
          />

          {/* Lease History (PreviousLeaseId and RenewedInto) */}
          <View style={{ gap: space.sm }}>
            <SectionHeader title={t('staff.leaseHistory')} />
            {!previousLease && !renewedIntoLease ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                <AppText tone="secondary">{t('staff.noRenewalYet')}</AppText>
              </Card>
            ) : (
              <>
                {previousLease ? (
                  <Card
                    onPress={canSeeLease ? () => router.push(`/staff/lease/${previousLease.id}` as any) : undefined}
                    style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText weight="bold" tone={canSeeLease ? 'primary' : 'default'}>
                        {t('staff.renewedFromN', { value: previousLease.leaseNumber })}
                      </AppText>
                      <Pill
                        accent={leaseStatusAccent(previousLease.status)}
                        label={translateLeaseStatus(t, previousLease.status)}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="caption" tone="muted">
                        {previousLease.startDate ? longDate(previousLease.startDate, code) : '—'} →{' '}
                        {leaseEffectiveEnd(previousLease) ? longDate(leaseEffectiveEnd(previousLease)!, code) : '—'}
                      </AppText>
                      {canSeeLease ? <Onward /> : null}
                    </View>
                  </Card>
                ) : null}

                {renewedIntoLease ? (
                  <Card
                    onPress={canSeeLease ? () => router.push(`/staff/lease/${renewedIntoLease.id}` as any) : undefined}
                    style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText weight="bold" tone={canSeeLease ? 'primary' : 'default'}>
                        {t('staff.renewedIntoN', { value: renewedIntoLease.leaseNumber })}
                      </AppText>
                      <Pill
                        accent={leaseStatusAccent(renewedIntoLease.status)}
                        label={translateLeaseStatus(t, renewedIntoLease.status)}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="caption" tone="muted">
                        {renewedIntoLease.startDate ? longDate(renewedIntoLease.startDate, code) : '—'} →{' '}
                        {leaseEffectiveEnd(renewedIntoLease) ? longDate(leaseEffectiveEnd(renewedIntoLease)!, code) : '—'}
                      </AppText>
                      {canSeeLease ? <Onward /> : null}
                    </View>
                  </Card>
                ) : null}
              </>
            )}
          </View>

          {/* Money sections (shown only to roles that can see Finance) */}
          {canSeeFinance && (
            <>
              {/* Deposits held */}
              <View style={{ gap: space.sm }}>
                <SectionHeader title={`${t('staff.deposits')} (${omr(depositsHeldTotal, code)})`} count={deposits.length} />
                {deposits.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                    <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                  </Card>
                ) : (
                  deposits.map((dep) => (
                    <Card key={dep.id} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold">{translateDepositType(t, dep.depositType)}</AppText>
                        <Pill accent={depositStatusAccent(dep.status)} label={translateDepositStatus(t, dep.status)} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.xs }}>
                        <AppText variant="caption" tone="secondary">
                          {t('staff.requiredAmount')}: {omr(dep.requiredAmount, code)}
                        </AppText>
                        <AppText variant="caption" tone="secondary">
                          {t('staff.receivedAmount')}: {omr(dep.receivedAmount, code)}
                        </AppText>
                        {dep.refundedAmount > 0 ? (
                          <AppText variant="caption" tone="secondary">
                            {t('staff.refundedAmount')}: {omr(dep.refundedAmount, code)}
                          </AppText>
                        ) : null}
                      </View>
                      <AppText variant="small" weight="bold" tone="primary">
                        {t('staff.depositHeld')}: {omr(dep.balanceAmount, code)}
                      </AppText>
                    </Card>
                  ))
                )}
              </View>

              {/* Charge Schedule */}
              <View style={{ gap: space.sm }}>
                <SectionHeader title={t('staff.chargeSchedule')} count={charges.length} />
                {charges.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                    <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                  </Card>
                ) : (
                  charges.map((ch) => {
                    const total = ch.amount * (1 + (ch.taxRate ?? 0) / 100);
                    return (
                      <Card key={ch.id} style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                          <AppText weight="bold">{ch.description || translateChargeType(t, ch.chargeType)}</AppText>
                          <AppText weight="bold" tone="primary">
                            {omr(total, code)}
                          </AppText>
                        </View>
                        <AppText variant="caption" tone="secondary">
                          {[
                            ch.frequency ? translateRentFrequency(t, ch.frequency) : undefined,
                            `${t('staff.amount')}: ${omr(ch.amount, code)}`,
                            ch.taxRate ? `${t('staff.tax')}: ${ch.taxRate}%` : undefined,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </AppText>
                      </Card>
                    );
                  })
                )}
              </View>

              {/* Instalments (paid / due / overdue, with totals) */}
              <View style={{ gap: space.sm }}>
                <SectionHeader title={t('staff.installmentsTab')} count={installments.length} />
                <SummaryStrip
                  columns={3}
                  items={[
                    {
                      label: `${t('staff.installmentStatus.Paid')} (${installmentStats.paidCount})`,
                      value: omr(installmentStats.paidTotal, code),
                      tone: 'success',
                    },
                    {
                      label: `${t('staff.installmentStatus.Due')} (${installmentStats.dueCount})`,
                      value: omr(installmentStats.dueTotal, code),
                      tone: 'warning',
                    },
                    {
                      label: `${t('staff.installmentStatus.Overdue')} (${installmentStats.overdueCount})`,
                      value: omr(installmentStats.overdueTotal, code),
                      tone: installmentStats.overdueCount > 0 ? 'danger' : 'default',
                    },
                  ]}
                />
                {installments.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                    <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                  </Card>
                ) : (
                  <>
                    {installments.slice(0, instLimit).map((inst) => {
                      const eff = effectiveInstallmentStatus(inst);
                      return (
                        <Card key={inst.id} style={{ gap: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                            <AppText weight="bold">
                              #{inst.installmentNo} • {inst.dueDate ? longDate(inst.dueDate, code) : '—'}
                            </AppText>
                            <Pill accent={installmentStatusAccent(eff)} label={translateInstallmentStatus(t, eff)} />
                          </View>
                          <AppText variant="small" weight="bold" tone="primary">
                            {omr(inst.totalDue, code)}
                          </AppText>
                        </Card>
                      );
                    })}
                    {installments.length > instLimit ? (
                      <Button
                        tone="outline"
                        compact
                        label={t('staff.showMore', { count: installments.length - instLimit })}
                        onPress={() => setInstLimit((n) => n + PAGE_STEP)}
                      />
                    ) : null}
                  </>
                )}
              </View>

              {/* Invoices for this lease */}
              <View style={{ gap: space.sm }}>
                <SectionHeader title={t('staff.invoicesTab')} count={invoices.length} />
                {invoices.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                    <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                  </Card>
                ) : (
                  invoices.map((inv) => {
                    const eff = effectiveInvoiceStatus(inv);
                    return (
                      <Card
                        key={inv.id}
                        onPress={canSeeInvoice ? () => router.push(`/staff/invoice/${inv.id}` as any) : undefined}
                        style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                          <AppText weight="bold">{inv.invoiceNumber}</AppText>
                          <Pill accent={invoiceStatusAccent(eff)} label={translateInvoiceStatus(t, eff)} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <AppText variant="small" weight="bold" tone="primary">
                            {omr(inv.totalAmount, code)}
                          </AppText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                            <AppText variant="caption" tone="muted">
                              {t('staff.dueDate')}: {inv.dueDate ? longDate(inv.dueDate, code) : '—'}
                            </AppText>
                            {canSeeInvoice ? <Onward /> : null}
                          </View>
                        </View>
                        {inv.outstandingAmount > 0 ? (
                          <AppText variant="caption" tone="danger">
                            {t('staff.outstanding')}: {omr(inv.outstandingAmount, code)}
                          </AppText>
                        ) : null}
                      </Card>
                    );
                  })
                )}
              </View>
            </>
          )}
        </View>
      )}
    </Page>
  );
}
