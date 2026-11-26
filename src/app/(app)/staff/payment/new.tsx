import { IconAlertTriangle, IconCheck, IconRefresh } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, View } from 'react-native';

import {
  createStaffReceipt,
  getStaffBuildings,
  getStaffInvoices,
  getStaffLeases,
  getStaffProperties,
  getStaffTenants,
  getStaffUnits,
  type StaffBuilding,
  type StaffInvoice,
  type StaffLease,
  type StaffProperty,
  type StaffTenant,
  type StaffUnit,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { PlacePicker } from '@/components/place-picker';
import { Button, Card, DetailRow, Field, Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { getCurrencyCode, longDate, omr, weekday } from '@/lib/format';
import {
  computeInvoiceAllocations,
  formatStaffLeaseOptionLabel,
  formatStaffTenantOptionLabel,
  resolveUnitPaymentSelection,
  tenantsForPlace,
  unitMatchesPlace,
  type PlaceSelection,
} from '@/lib/place-picker';
import {
  sortLeasesCurrentFirst,
  staffLeasePhase,
  translatePaymentMethod,
} from '@/lib/staff-helpers';
import { dateDaysAgo } from '@/mock/clock';
import { radius, space, usePalette } from '@/theme/tokens';

const PAYMENT_METHODS = [
  'BankTransfer',
  'Card',
  'Cheque',
  'Cash',
  'OnlineGateway',
  'Other',
] as const;

/** Today and the past 30 days for the receipt date picker. */
const RECEIPT_DATES = Array.from({ length: 31 }, (_, d) => dateDaysAgo(d));

export default function NewPayment() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();

  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [buildings, setBuildings] = useState<StaffBuilding[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [tenants, setTenants] = useState<StaffTenant[]>([]);
  const [leases, setLeases] = useState<StaffLease[]>([]);
  const [invoices, setInvoices] = useState<StaffInvoice[]>([]);

  const [place, setPlace] = useState<PlaceSelection>({
    propertyId: '',
    buildingId: '',
    unitId: '',
  });
  const [tenantId, setTenantId] = useState('');
  const [leaseId, setLeaseId] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => dateDaysAgo(0));
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('BankTransfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStaffProperties().catch(() => [] as StaffProperty[]),
      getStaffBuildings().catch(() => [] as StaffBuilding[]),
      getStaffUnits().catch(() => [] as StaffUnit[]),
      getStaffTenants(),
      getStaffLeases(),
      getStaffInvoices().catch(() => [] as StaffInvoice[]),
    ])
      .then(([pr, bl, un, tn, ls, inv]) => {
        if (!cancelled) {
          setProperties(pr);
          setBuildings(bl);
          setUnits(un);
          setTenants(tn);
          setLeases(ls);
          setInvoices(inv);
          setLoadError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t('common.errorLoad'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t, retryCount]);

  const handleRetry = () => {
    setLoading(true);
    setLoadError(null);
    setRetryCount((c) => c + 1);
  };

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const hasPlace = Boolean(place.propertyId || place.buildingId || place.unitId);

  const availableTenants = useMemo(
    () => tenantsForPlace(tenants, leases, units, place, tenantId || undefined),
    [tenants, leases, units, place, tenantId],
  );

  const availableLeases = useMemo(() => {
    if (place.unitId) {
      const unitResolution = resolveUnitPaymentSelection(place.unitId, leases, invoices, leaseId || undefined);
      if (unitResolution.hasMultipleOpenInvoiceLeases) {
        return unitResolution.leases;
      }
    }
    const base = tenantId
      ? sortLeasesCurrentFirst(leases.filter((l) => l.tenantId === tenantId))
      : hasPlace
        ? sortLeasesCurrentFirst(
            leases.filter((l) => unitMatchesPlace(l.unitId, l.propertyId, place, unitById)),
          )
        : sortLeasesCurrentFirst(leases);

    if (hasPlace && tenantId) {
      return base.filter((l) => unitMatchesPlace(l.unitId, l.propertyId, place, unitById));
    }
    return base;
  }, [place, leases, invoices, leaseId, tenantId, hasPlace, unitById]);

  const handlePlaceChange = (
    nextPlace: PlaceSelection,
    changedLevel: 'property' | 'building' | 'unit',
  ) => {
    setPlace(nextPlace);
    if (changedLevel === 'unit') {
      if (!nextPlace.unitId) {
        setLeaseId('');
        setTenantId('');
        return;
      }
      const resolved = resolveUnitPaymentSelection(nextPlace.unitId, leases, invoices);
      setLeaseId(resolved.leaseId ?? '');
      setTenantId(resolved.tenantId ?? '');
      return;
    }

    const nextHasPlace = Boolean(nextPlace.propertyId || nextPlace.buildingId || nextPlace.unitId);
    if (!nextHasPlace) return;

    const matchingTenants = tenantsForPlace(tenants, leases, units, nextPlace);
    if (tenantId && !matchingTenants.some((tn) => tn.id === tenantId)) {
      setTenantId('');
      setLeaseId('');
      return;
    }
    if (tenantId) {
      const atPlace = sortLeasesCurrentFirst(
        leases.filter(
          (l) =>
            l.tenantId === tenantId &&
            unitMatchesPlace(l.unitId, l.propertyId, nextPlace, unitById),
        ),
      );
      if (!leaseId || !atPlace.some((l) => l.id === leaseId)) {
        const nextLease = atPlace.find((l) => staffLeasePhase(l) === 'current') ?? atPlace[0];
        setLeaseId(nextLease?.id ?? '');
      }
    }
  };

  const handleTenantChange = (newTenantId: string) => {
    setTenantId(newTenantId);
    if (!newTenantId) {
      setLeaseId('');
      return;
    }
    const tenantLeases = sortLeasesCurrentFirst(
      leases.filter(
        (l) =>
          l.tenantId === newTenantId &&
          (!hasPlace || unitMatchesPlace(l.unitId, l.propertyId, place, unitById)),
      ),
    );
    const picked = tenantLeases.find((l) => staffLeasePhase(l) === 'current') ?? tenantLeases[0];
    setLeaseId(picked?.id ?? '');
  };

  const handleLeaseChange = (newLeaseId: string) => {
    setLeaseId(newLeaseId);
    if (newLeaseId) {
      const selected = leases.find((l) => l.id === newLeaseId);
      if (selected && selected.tenantId !== tenantId) {
        setTenantId(selected.tenantId);
      }
    }
  };

  const parsedAmount = parseFloat(amount);
  const allocation = useMemo(
    () => computeInvoiceAllocations(invoices, tenantId || undefined, parsedAmount),
    [invoices, tenantId, parsedAmount],
  );

  const selectedLease = useMemo(() => leases.find((l) => l.id === leaseId), [leases, leaseId]);
  const showBankName = paymentMethod === 'Cheque' || paymentMethod === 'BankTransfer';
  const isValid =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    Boolean(tenantId) &&
    Boolean(selectedLease) &&
    selectedLease?.tenantId === tenantId;

  const handleSubmit = async () => {
    if (!isValid || !selectedLease || selectedLease.tenantId !== tenantId || submitting) return;
    setSubmitting(true);
    try {
      const created = await createStaffReceipt({
        tenantId,
        leaseId,
        propertyId: selectedLease.propertyId,
        amount: Math.round(parsedAmount * 1000) / 1000,
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        bankName: showBankName ? bankName.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        receiptDate: new Date(`${receiptDate}T00:00:00Z`).toISOString(),
        currencyCode: getCurrencyCode(),
        status: 'Posted',
      });
      const receiptLabel = created?.receiptNumber
        ? `${t('pay.receiptNo')}: ${created.receiptNumber}`
        : t('done.payment.title');
      if (Platform.OS === 'web') {
        window.alert(receiptLabel);
        router.back();
      } else {
        Alert.alert(t('pay.receipt'), receiptLabel, [
          { text: t('common.back'), onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert(e instanceof Error ? e.message : t('common.errorLoad'));
      } else {
        Alert.alert(t('common.errorLoad'), e instanceof Error ? e.message : '');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page
      title={t('staff.recordPayment')}
      footer={
        <Button
          label={t('common.submit')}
          icon={IconCheck}
          disabled={!isValid || submitting || loading || !!loadError}
          onPress={() => void handleSubmit()}
        />
      }>
      {loadError ? (
        <Card style={{ gap: space.md, alignItems: 'center', paddingVertical: space.xl }}>
          <IconAlertTriangle size={36} color="#E0413F" />
          <AppText weight="medium" tone="danger" style={{ textAlign: 'center' }}>
            {loadError}
          </AppText>
          <Button
            label={t('common.retry')}
            icon={IconRefresh}
            tone="outline"
            onPress={handleRetry}
          />
        </Card>
      ) : (
        <Card style={{ gap: space.md }}>
          <PlacePicker
            properties={properties}
            buildings={buildings}
            units={units}
            value={place}
            onChange={handlePlaceChange}
          />

          <Select
            label={t('lease.tenant')}
            value={tenantId}
            onChange={handleTenantChange}
            options={[
              { label: t('common.select'), value: '' },
              ...availableTenants.map((item) => ({
                label: formatStaffTenantOptionLabel(item, language.code),
                value: item.id,
              })),
            ]}
          />

          <Select
            label={t('lease.leaseNo')}
            value={leaseId}
            onChange={handleLeaseChange}
            options={[
              { label: t('common.select'), value: '' },
              ...availableLeases.map((l) => ({
                label: formatStaffLeaseOptionLabel(l, units, buildings, language.code, t),
                value: l.id,
              })),
            ]}
          />

          {tenantId ? (
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: palette.border,
                padding: space.md,
                gap: space.xs,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="small" weight="semibold">
                  {t('staff.openInvoices')} ({allocation.rows.length})
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('staff.autoAllocateOldestFirst')}
                </AppText>
              </View>
              <DetailRow
                first
                label={t('staff.totalOutstanding')}
                value={omr(allocation.totalOutstanding, language.code, true)}
              />
              {allocation.rows.map((row) => (
                <View
                  key={row.invoice.id}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: palette.border,
                    paddingVertical: space.sm,
                    gap: 2,
                  }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="small" weight="semibold">
                      {row.invoice.invoiceNumber}
                    </AppText>
                    <AppText variant="small" weight="semibold">
                      {omr(row.outstanding, language.code, true)}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="caption" tone="muted">
                      {t('staff.dueDate')}: {longDate(row.invoice.dueDate, language.code)}
                    </AppText>
                    <AppText
                      variant="caption"
                      weight="semibold"
                      tone={row.allocated > 0 ? 'success' : 'muted'}>
                      {t('staff.allocated')}: {omr(row.allocated, language.code, true)}
                    </AppText>
                  </View>
                </View>
              ))}
              {parsedAmount > 0 ? (
                <>
                  <DetailRow
                    label={t('staff.totalAllocated')}
                    value={omr(allocation.totalAllocated, language.code, true)}
                  />
                  <DetailRow
                    label={t('staff.unallocated')}
                    value={
                      <AppText
                        variant="small"
                        weight="semibold"
                        tone={allocation.unallocated === 0 ? 'success' : 'warning'}>
                        {omr(allocation.unallocated, language.code, true)}
                      </AppText>
                    }
                  />
                  {allocation.unallocated === 0 ? (
                    <AppText variant="caption" tone="success">
                      {t('staff.fullyAllocated')}
                    </AppText>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          <Select
            label={t('staff.receiptDate')}
            value={receiptDate}
            onChange={setReceiptDate}
            options={RECEIPT_DATES.map((day) => ({
              label: `${weekday(day, language.code)}, ${longDate(day, language.code)}`,
              value: day,
            }))}
          />

          <Field
            label={t('staff.amount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.000"
          />

          <Select
            label={t('staff.paymentMethod')}
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={PAYMENT_METHODS.map((m) => ({
              label: translatePaymentMethod(t, m),
              value: m,
            }))}
          />

          {showBankName ? (
            <Field
              label={t('staff.bankName')}
              value={bankName}
              onChangeText={setBankName}
              placeholder={t('staff.bankNamePlaceholder')}
            />
          ) : null}

          <Field
            label={t('staff.referenceNo')}
            value={referenceNo}
            onChangeText={setReferenceNo}
            placeholder={t('staff.referencePlaceholder')}
          />

          <Field
            label={t('staff.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder={t('staff.notesPlaceholder')}
          />
        </Card>
      )}
    </Page>
  );
}
