import { IconPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffBuildings,
  getStaffFloorZones,
  getStaffInstallments,
  getStaffInvoices,
  getStaffLeases,
  getStaffProperties,
  getStaffPropertyTypes,
  getStaffReceipts,
  getStaffTenants,
  getStaffUnits,
  type StaffBuilding,
  type StaffFloorZone,
  type StaffInstallment,
  type StaffInvoice,
  type StaffLease,
  type StaffProperty,
  type StaffPropertyType,
  type StaffReceipt,
  type StaffTenant,
  type StaffUnit,
} from '@/api/staff';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Onward, Pill, SearchFilterBar, Segmented, SummaryStrip } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import {
  effectiveInstallmentStatus,
  effectiveInvoiceStatus,
  formatCardPlace,
  installmentStatusAccent,
  invoiceStatusAccent,
  PAGE_STEP,
  receiptStatusAccent,
  translateInstallmentStatus,
  translateInvoiceStatus,
  translatePaymentMethod,
  translateReceiptStatus,
  type EffectiveInstallmentStatus,
} from '@/lib/staff-helpers';
import { useLocationFilter } from '@/lib/use-location-filter';
import { space } from '@/theme/tokens';

type Section = 'invoices' | 'receipts' | 'installments';
type InvoiceSort = 'newest' | 'oldest';
type ReceiptDateRange = 'month' | 'lastMonth' | 'all';

const BASE_INVOICE_STATUSES = ['Overdue', 'Posted', 'PartPaid', 'Paid'];
const BASE_INSTALLMENT_STATUSES: EffectiveInstallmentStatus[] = ['Due', 'Overdue', 'Paid'];

export default function StaffFinance() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { accessTo } = useAppSession();
  const canRecordPayment = accessTo('/staff/payment/new') !== null;
  const code = language.code;
  const [section, setSection] = useState<Section>('invoices');

  const [invoices, setInvoices] = useState<StaffInvoice[]>([]);
  const [receipts, setReceipts] = useState<StaffReceipt[]>([]);
  const [installments, setInstallments] = useState<StaffInstallment[]>([]);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<StaffPropertyType[]>([]);
  const [buildings, setBuildings] = useState<StaffBuilding[]>([]);
  const [floorZones, setFloorZones] = useState<StaffFloorZone[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [leases, setLeases] = useState<StaffLease[]>([]);
  const [tenants, setTenants] = useState<StaffTenant[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invoices filters
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('all');
  const [invSort, setInvSort] = useState<InvoiceSort>('newest');
  const [invLimit, setInvLimit] = useState(PAGE_STEP);

  // Receipts filters
  const [recSearch, setRecSearch] = useState('');
  const [recMethod, setRecMethod] = useState('all');
  const [recRange, setRecRange] = useState<ReceiptDateRange>('all');
  const [recLimit, setRecLimit] = useState(PAGE_STEP);

  // Installments filters
  const [instSearch, setInstSearch] = useState('');
  const [instStatus, setInstStatus] = useState<'all' | EffectiveInstallmentStatus>('all');
  const [instLimit, setInstLimit] = useState(PAGE_STEP);

  const resetListLimits = useCallback(() => {
    setInvLimit(PAGE_STEP);
    setRecLimit(PAGE_STEP);
    setInstLimit(PAGE_STEP);
  }, []);

  // Shared location filter across Invoices, Receipts, Installments and the top summary
  const locationFilter = useLocationFilter({
    properties,
    propertyTypes,
    buildings,
    floorZones,
    units,
    onChange: resetListLimits,
  });

  const loadAll = useCallback(async () => {
    const quiet = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
    const [inv, rec, inst, props, pts, blds, fzs, us, ls, tns] = await Promise.all([
      getStaffInvoices(),
      getStaffReceipts(),
      getStaffInstallments(),
      quiet(getStaffProperties()),
      quiet(getStaffPropertyTypes()),
      quiet(getStaffBuildings()),
      quiet(getStaffFloorZones()),
      quiet(getStaffUnits()),
      quiet(getStaffLeases()),
      quiet(getStaffTenants()),
    ]);
    return { inv, rec, inst, props, pts, blds, fzs, us, ls, tns };
  }, []);

  const fetchData = useCallback(
    (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      loadAll()
        .then(({ inv, rec, inst, props, pts, blds, fzs, us, ls, tns }) => {
          setInvoices(inv);
          setReceipts(rec);
          setInstallments(inst);
          setProperties(props);
          setPropertyTypes(pts);
          setBuildings(blds);
          setFloorZones(fzs);
          setUnits(us);
          setLeases(ls);
          setTenants(tns);
          setError(null);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : t('common.errorLoad'));
        })
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [loadAll, t],
  );

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .then(({ inv, rec, inst, props, pts, blds, fzs, us, ls, tns }) => {
        if (!cancelled) {
          setInvoices(inv);
          setReceipts(rec);
          setInstallments(inst);
          setProperties(props);
          setPropertyTypes(pts);
          setBuildings(blds);
          setFloorZones(fzs);
          setUnits(us);
          setLeases(ls);
          setTenants(tns);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('common.errorLoad'));
        }
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
  }, [loadAll, t]);

  const onRefresh = () => {
    fetchData(true);
  };

  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const propertyTypeById = useMemo(() => new Map(propertyTypes.map((pt) => [pt.id, pt])), [propertyTypes]);
  const buildingById = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);
  const floorById = useMemo(() => new Map(floorZones.map((f) => [f.id, f])), [floorZones]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const leaseById = useMemo(() => new Map(leases.map((l) => [l.id, l])), [leases]);
  const tenantById = useMemo(() => new Map(tenants.map((tn) => [tn.id, tn])), [tenants]);
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const placeCtx = useMemo(
    () => ({ code, propertyById, propertyTypeById, buildingById, floorById }),
    [code, propertyById, propertyTypeById, buildingById, floorById],
  );

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const thisMonthPrefix = todayIso.slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Resolve propertyId, tenant, unit, property for a receipt
  const resolveReceiptMeta = useCallback(
    (rec: StaffReceipt) => {
      const inv = rec.invoiceId ? invoiceById.get(rec.invoiceId) : undefined;
      const lease = (rec.leaseId && leaseById.get(rec.leaseId)) || (inv?.leaseId ? leaseById.get(inv.leaseId) : undefined);
      const pId = rec.propertyId || inv?.propertyId || lease?.propertyId;
      const tId = rec.tenantId || inv?.tenantId || lease?.tenantId;
      const uId = lease?.unitId;
      return {
        propertyId: pId,
        tenant: tId ? tenantById.get(tId) : undefined,
        unit: uId ? unitById.get(uId) : undefined,
        property: pId ? propertyById.get(pId) : undefined,
      };
    },
    [invoiceById, leaseById, tenantById, unitById, propertyById],
  );

  const matchInvoice = useCallback(
    (inv: StaffInvoice) => {
      const lease = inv.leaseId ? leaseById.get(inv.leaseId) : undefined;
      return locationFilter.matches({
        propertyId: inv.propertyId || lease?.propertyId,
        unitId: lease?.unitId,
      });
    },
    [leaseById, locationFilter],
  );

  const matchReceipt = useCallback(
    (rec: StaffReceipt) => {
      const meta = resolveReceiptMeta(rec);
      return locationFilter.matches({
        propertyId: meta.propertyId,
        unitId: meta.unit?.id,
      });
    },
    [resolveReceiptMeta, locationFilter],
  );

  const matchInstallment = useCallback(
    (inst: StaffInstallment) => {
      const lease = leaseById.get(inst.leaseId);
      return locationFilter.matches({
        propertyId: lease?.propertyId,
        unitId: lease?.unitId,
      });
    },
    [leaseById, locationFilter],
  );

  // ── Top Summary for current location filter ─────────────────────────────────
  const summary = useMemo(() => {
    const scopedInvoices = invoices.filter(
      (i) => i.status !== 'Cancelled' && i.status !== 'Draft' && matchInvoice(i),
    );
    const outstanding = scopedInvoices.reduce((sum, i) => sum + (i.outstandingAmount || 0), 0);
    const overdueList = scopedInvoices.filter((i) => effectiveInvoiceStatus(i, todayIso) === 'Overdue');
    const overdueAmount = overdueList.reduce((sum, i) => sum + (i.outstandingAmount || 0), 0);

    const scopedReceipts = receipts.filter((r) => {
      if ((r.status || 'Posted') !== 'Posted') return false;
      if (!(r.receiptDate || '').startsWith(thisMonthPrefix)) return false;
      return matchReceipt(r);
    });
    const collectedThisMonth = scopedReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      outstanding,
      overdueCount: overdueList.length,
      overdueAmount,
      collectedThisMonth,
    };
  }, [invoices, receipts, todayIso, thisMonthPrefix, matchInvoice, matchReceipt]);

  // ── Invoices segment ────────────────────────────────────────────────────────
  const searchedInvoices = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return invoices
      .filter((inv) => matchInvoice(inv))
      .filter((inv) => {
        if (!q) return true;
        const tenant = tenantById.get(inv.tenantId);
        const lease = inv.leaseId ? leaseById.get(inv.leaseId) : undefined;
        const unit = lease ? unitById.get(lease.unitId) : undefined;
        const bld = unit?.buildingId ? buildingById.get(unit.buildingId) : undefined;
        const prop = propertyById.get(inv.propertyId);
        return [
          inv.invoiceNumber,
          tenant?.displayNameEn,
          tenant?.displayNameAr,
          unit?.unitCode,
          unit?.unitNameEn,
          bld?.buildingNameEn,
          bld?.buildingNameAr,
          prop?.propertyNameEn,
          prop?.propertyNameAr,
        ].some((v) => v?.toLowerCase().includes(q));
      });
  }, [invoices, invSearch, matchInvoice, tenantById, leaseById, unitById, buildingById, propertyById]);

  const invoiceStatusChips = useMemo(() => {
    const extra = Array.from(
      new Set(
        searchedInvoices
          .map((i) => effectiveInvoiceStatus(i, todayIso))
          .filter((s) => s && !BASE_INVOICE_STATUSES.includes(s)),
      ),
    );
    const allStatuses = [...BASE_INVOICE_STATUSES, ...extra];
    return [
      { value: 'all', label: t('staff.filterAll'), count: searchedInvoices.length },
      ...allStatuses.map((st) => ({
        value: st,
        label: translateInvoiceStatus(t, st),
        count: searchedInvoices.filter((i) => effectiveInvoiceStatus(i, todayIso) === st).length,
      })),
    ];
  }, [searchedInvoices, todayIso, t]);

  const visibleInvoices = useMemo(() => {
    const byStatus =
      invStatus === 'all'
        ? searchedInvoices
        : searchedInvoices.filter((i) => effectiveInvoiceStatus(i, todayIso) === invStatus);
    return [...byStatus].sort((a, b) => {
      const da = a.dueDate || '';
      const db = b.dueDate || '';
      return invSort === 'newest' ? db.localeCompare(da) : da.localeCompare(db);
    });
  }, [searchedInvoices, invStatus, invSort, todayIso]);

  // ── Receipts segment ────────────────────────────────────────────────────────
  const searchedReceipts = useMemo(() => {
    const q = recSearch.trim().toLowerCase();
    return receipts
      .filter((rec) => matchReceipt(rec))
      .filter((rec) => {
        if (recRange === 'month') return (rec.receiptDate || '').startsWith(thisMonthPrefix);
        if (recRange === 'lastMonth') return (rec.receiptDate || '').startsWith(lastMonthPrefix);
        return true;
      })
      .filter((rec) => {
        if (!q) return true;
        const meta = resolveReceiptMeta(rec);
        const bld = meta.unit?.buildingId ? buildingById.get(meta.unit.buildingId) : undefined;
        return [
          rec.receiptNumber,
          rec.referenceNo,
          rec.paymentMethod,
          meta.tenant?.displayNameEn,
          meta.tenant?.displayNameAr,
          meta.unit?.unitCode,
          bld?.buildingNameEn,
          bld?.buildingNameAr,
          meta.property?.propertyNameEn,
          meta.property?.propertyNameAr,
        ].some((v) => v?.toLowerCase().includes(q));
      });
  }, [receipts, recSearch, matchReceipt, recRange, thisMonthPrefix, lastMonthPrefix, resolveReceiptMeta, buildingById]);

  const receiptMethodChips = useMemo(() => {
    const methods = Array.from(new Set(searchedReceipts.map((r) => r.paymentMethod).filter(Boolean)));
    return [
      { value: 'all', label: t('staff.filterAll'), count: searchedReceipts.length },
      ...methods.map((m) => ({
        value: m,
        label: translatePaymentMethod(t, m),
        count: searchedReceipts.filter((r) => r.paymentMethod === m).length,
      })),
    ];
  }, [searchedReceipts, t]);

  const visibleReceipts = useMemo(
    () => (recMethod === 'all' ? searchedReceipts : searchedReceipts.filter((r) => r.paymentMethod === recMethod)),
    [searchedReceipts, recMethod],
  );

  // ── Installments segment ────────────────────────────────────────────────────
  const searchedInstallments = useMemo(() => {
    const q = instSearch.trim().toLowerCase();
    return installments
      .filter((inst) => matchInstallment(inst))
      .filter((inst) => {
        if (!q) return true;
        const lease = leaseById.get(inst.leaseId);
        const tenant = lease ? tenantById.get(lease.tenantId) : undefined;
        const unit = lease ? unitById.get(lease.unitId) : undefined;
        const bld = unit?.buildingId ? buildingById.get(unit.buildingId) : undefined;
        const prop = lease ? propertyById.get(lease.propertyId) : undefined;
        return [
          String(inst.installmentNo),
          lease?.leaseNumber,
          tenant?.displayNameEn,
          tenant?.displayNameAr,
          unit?.unitCode,
          unit?.unitNameEn,
          bld?.buildingNameEn,
          bld?.buildingNameAr,
          prop?.propertyNameEn,
          prop?.propertyNameAr,
        ].some((v) => v?.toLowerCase().includes(q));
      });
  }, [installments, instSearch, matchInstallment, leaseById, tenantById, unitById, buildingById, propertyById]);

  const installmentChips = useMemo(() => {
    const hasCancelled = searchedInstallments.some((i) => i.status === 'Cancelled');
    const statuses: EffectiveInstallmentStatus[] = hasCancelled
      ? [...BASE_INSTALLMENT_STATUSES, 'Cancelled']
      : BASE_INSTALLMENT_STATUSES;
    return [
      { value: 'all' as const, label: t('staff.filterAll'), count: searchedInstallments.length },
      ...statuses.map((st) => ({
        value: st,
        label: translateInstallmentStatus(t, st),
        count: searchedInstallments.filter((i) => effectiveInstallmentStatus(i, todayIso) === st).length,
      })),
    ];
  }, [searchedInstallments, todayIso, t]);

  const visibleInstallments = useMemo(() => {
    const list =
      instStatus === 'all'
        ? searchedInstallments
        : searchedInstallments.filter((i) => effectiveInstallmentStatus(i, todayIso) === instStatus);
    return [...list].sort(
      (a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') || a.installmentNo - b.installmentNo,
    );
  }, [searchedInstallments, instStatus, todayIso]);

  return (
    <Screen
      title={t('tabs.finance')}
      subtitle={t('staff.finance')}
      action={
        canRecordPayment ? (
          <Button
            label={t('staff.recordPayment')}
            icon={IconPlus}
            compact
            onPress={() => router.push('/staff/payment/new')}
          />
        ) : undefined
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      onRetry={() => {
        fetchData(false);
      }}>
      <SummaryStrip
        items={[
          { label: t('staff.outstanding'), value: omr(summary.outstanding, code), tone: summary.outstanding > 0 ? 'warning' : 'default' },
          {
            label: t('staff.overdueCount', { count: summary.overdueCount }),
            value: omr(summary.overdueAmount, code),
            tone: summary.overdueAmount > 0 ? 'danger' : 'default',
          },
          { label: t('staff.collectedMonth'), value: omr(summary.collectedThisMonth, code), tone: 'success' },
        ]}
      />

      <Segmented<Section>
        value={section}
        onChange={setSection}
        options={[
          { value: 'invoices', label: t('staff.invoicesTab') },
          { value: 'receipts', label: t('staff.receiptsTab') },
          { value: 'installments', label: t('staff.installmentsTab') },
        ]}
      />

      {section === 'invoices' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar
            search={invSearch}
            onSearchChange={(v) => {
              setInvSearch(v);
              setInvLimit(PAGE_STEP);
            }}
            placeholder={t('staff.searchInvoices')}
            selects={[
              ...locationFilter.selects,
              {
                key: 'sort',
                label: t('staff.dueDate'),
                value: invSort,
                onChange: (v: string) => setInvSort(v as InvoiceSort),
                options: [
                  { value: 'newest', label: t('staff.sortNewestDue') },
                  { value: 'oldest', label: t('staff.sortOldestDue') },
                ],
              },
            ]}
            chips={invoiceStatusChips}
            chipValue={invStatus}
            onChipChange={(v) => {
              setInvStatus(v);
              setInvLimit(PAGE_STEP);
            }}
          />

          <View style={{ gap: space.sm }}>
            {visibleInvoices.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              <>
                {visibleInvoices.slice(0, invLimit).map((inv) => {
                  const eff = effectiveInvoiceStatus(inv, todayIso);
                  const tenant = tenantById.get(inv.tenantId);
                  const lease = inv.leaseId ? leaseById.get(inv.leaseId) : undefined;
                  const unit = lease ? unitById.get(lease.unitId) : undefined;
                  const prop = propertyById.get(inv.propertyId);
                  const subLine = formatCardPlace(
                    { kind: 'record', tenant, unit, property: prop },
                    placeCtx,
                  );
                  return (
                    <Card
                      key={inv.id}
                      onPress={() => router.push(`/staff/invoice/${inv.id}` as any)}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold">{inv.invoiceNumber}</AppText>
                        <Pill accent={invoiceStatusAccent(eff)} label={translateInvoiceStatus(t, eff)} />
                      </View>
                      {subLine ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                          {subLine}
                        </AppText>
                      ) : null}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <AppText variant="bodyLarge" weight="bold">
                          {omr(inv.totalAmount, code)}
                        </AppText>
                        <AppText variant="caption" tone="secondary">
                          {t('staff.dueDate')}: {inv.dueDate?.slice(0, 10)}
                        </AppText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                        <AppText variant="caption" tone="muted">
                          {t('staff.paidAmount')}: {omr(inv.paidAmount, code)} · {t('staff.outstanding')}: {omr(inv.outstandingAmount, code)}
                        </AppText>
                        <Onward />
                      </View>
                    </Card>
                  );
                })}
                {visibleInvoices.length > invLimit ? (
                  <Button
                    tone="outline"
                    compact
                    label={t('staff.showMore', { count: visibleInvoices.length - invLimit })}
                    onPress={() => setInvLimit((n) => n + PAGE_STEP)}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {section === 'receipts' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar
            search={recSearch}
            onSearchChange={(v) => {
              setRecSearch(v);
              setRecLimit(PAGE_STEP);
            }}
            placeholder={t('staff.searchReceipts')}
            selects={[
              ...locationFilter.selects,
              {
                key: 'range',
                label: t('staff.rangeAllDates'),
                value: recRange,
                onChange: (v: string) => {
                  setRecRange(v as ReceiptDateRange);
                  setRecLimit(PAGE_STEP);
                },
                options: [
                  { value: 'all', label: t('staff.rangeAllDates') },
                  { value: 'month', label: t('staff.rangeThisMonth') },
                  { value: 'lastMonth', label: t('staff.rangeLastMonth') },
                ],
              },
            ]}
            chips={receiptMethodChips}
            chipValue={recMethod}
            onChipChange={(v) => {
              setRecMethod(v);
              setRecLimit(PAGE_STEP);
            }}
          />

          <View style={{ gap: space.sm }}>
            {visibleReceipts.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              <>
                {visibleReceipts.slice(0, recLimit).map((rec) => {
                  const meta = resolveReceiptMeta(rec);
                  const subLine = formatCardPlace(
                    {
                      kind: 'record',
                      tenant: meta.tenant,
                      unit: meta.unit,
                      property: meta.property,
                    },
                    placeCtx,
                  );
                  return (
                    <Card key={rec.id} style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold">{rec.receiptNumber}</AppText>
                        <Pill accent={receiptStatusAccent(rec.status)} label={translateReceiptStatus(t, rec.status)} />
                      </View>
                      {subLine ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                          {subLine}
                        </AppText>
                      ) : null}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <AppText variant="bodyLarge" weight="bold" tone="success">
                          {omr(rec.amount, code)}
                        </AppText>
                        <AppText variant="caption" tone="secondary">
                          {translatePaymentMethod(t, rec.paymentMethod)}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="muted">
                        {rec.receiptDate?.slice(0, 10)} {rec.referenceNo ? `• ${rec.referenceNo}` : ''}
                      </AppText>
                    </Card>
                  );
                })}
                {visibleReceipts.length > recLimit ? (
                  <Button
                    tone="outline"
                    compact
                    label={t('staff.showMore', { count: visibleReceipts.length - recLimit })}
                    onPress={() => setRecLimit((n) => n + PAGE_STEP)}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {section === 'installments' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar
            search={instSearch}
            onSearchChange={(v) => {
              setInstSearch(v);
              setInstLimit(PAGE_STEP);
            }}
            placeholder={t('staff.searchInstallments')}
            selects={locationFilter.selects}
            chips={installmentChips}
            chipValue={instStatus}
            onChipChange={(v) => {
              setInstStatus(v);
              setInstLimit(PAGE_STEP);
            }}
          />

          <View style={{ gap: space.sm }}>
            {visibleInstallments.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              <>
                {visibleInstallments.slice(0, instLimit).map((inst) => {
                  const eff = effectiveInstallmentStatus(inst, todayIso);
                  const lease = leaseById.get(inst.leaseId);
                  const tenant = lease ? tenantById.get(lease.tenantId) : undefined;
                  const unit = lease ? unitById.get(lease.unitId) : undefined;
                  const prop = lease ? propertyById.get(lease.propertyId) : undefined;
                  const titleText = lease
                    ? `${lease.leaseNumber} · #${inst.installmentNo}`
                    : `#${inst.installmentNo}`;
                  const subLine = formatCardPlace(
                    { kind: 'record', tenant, unit, property: prop },
                    placeCtx,
                  );
                  return (
                    <Card
                      key={inst.id}
                      onPress={lease ? () => router.push(`/staff/lease/${lease.id}` as any) : undefined}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold">{titleText}</AppText>
                        <Pill accent={installmentStatusAccent(eff)} label={translateInstallmentStatus(t, eff)} />
                      </View>
                      {subLine ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                          {subLine}
                        </AppText>
                      ) : null}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <AppText variant="bodyLarge" weight="bold">
                          {omr(inst.totalDue, code)}
                        </AppText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <AppText variant="caption" tone="secondary">
                            {t('staff.dueDate')}: {inst.dueDate?.slice(0, 10)}
                          </AppText>
                          {lease ? <Onward /> : null}
                        </View>
                      </View>
                    </Card>
                  );
                })}
                {visibleInstallments.length > instLimit ? (
                  <Button
                    tone="outline"
                    compact
                    label={t('staff.showMore', { count: visibleInstallments.length - instLimit })}
                    onPress={() => setInstLimit((n) => n + PAGE_STEP)}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
