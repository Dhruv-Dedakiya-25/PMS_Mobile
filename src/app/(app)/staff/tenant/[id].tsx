import { IconMail, IconPhone } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';

import {
  getStaffBuildings,
  getStaffInvoices,
  getStaffLeases,
  getStaffOccupants,
  getStaffProperties,
  getStaffPropertyTypes,
  getStaffReceipts,
  getStaffServiceCategories,
  getStaffTenant,
  getStaffTenantDocuments,
  getStaffTenantVehicles,
  getStaffTickets,
  getStaffUnits,
  type StaffBuilding,
  type StaffInvoice,
  type StaffLease,
  type StaffOccupant,
  type StaffProperty,
  type StaffPropertyType,
  type StaffReceipt,
  type StaffTenant,
  type StaffTenantDocument,
  type StaffTenantVehicle,
  type StaffTicket,
  type StaffUnit,
} from '@/api/staff';
import type { ServiceCategoryOptionDto } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Avatar, Button, Card, Details, Onward, Pill, SectionHeader, SummaryStrip } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { languageByCode } from '@/i18n/languages';
import { daysUntil, longDate, ltr, omr } from '@/lib/format';
import { DEFAULT_SERVICE_CATEGORIES, formatTicketCategory } from '@/lib/service-categories';
import {
  byLang,
  effectiveInvoiceStatus,
  formatUnitTrail,
  invoiceStatusAccent,
  leaseEffectiveEnd,
  leaseStatusAccent,
  PAGE_STEP,
  receiptStatusAccent,
  sortLeasesCurrentFirst,
  staffLeasePhase,
  translateDocumentType,
  translateInvoiceStatus,
  translateLeaseStatus,
  translateOccupantType,
  translatePaymentMethod,
  translatePriority,
  translateReceiptStatus,
  translateRentFrequency,
  translateTenantType,
  translateTicketStatus,
  translateVehicleType,
  translateVerificationStatus,
  verificationStatusAccent,
  wasEndedEarly,
  type PlaceLookupContext,
} from '@/lib/staff-helpers';
import { space } from '@/theme/tokens';

export default function StaffTenantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const { accessTo, isDemo, isPropertyConsultant } = useAppSession();
  const canSeeFinance = accessTo('/staff/finance') !== null;
  const canSeeTickets = accessTo('/staff/ticket') !== null;
  const canSeeVehicles = !isPropertyConsultant;
  const canSeeLease = accessTo('/staff/lease') !== null;
  const canSeeInvoice = accessTo('/staff/invoice') !== null;

  const [tenant, setTenant] = useState<StaffTenant | null>(null);
  const [leases, setLeases] = useState<StaffLease[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [buildings, setBuildings] = useState<StaffBuilding[]>([]);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<StaffPropertyType[]>([]);
  const [invoices, setInvoices] = useState<StaffInvoice[]>([]);
  const [receipts, setReceipts] = useState<StaffReceipt[]>([]);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOptionDto[]>(DEFAULT_SERVICE_CATEGORIES);
  const [occupants, setOccupants] = useState<StaffOccupant[]>([]);
  const [vehicles, setVehicles] = useState<StaffTenantVehicle[]>([]);
  const [documents, setDocuments] = useState<StaffTenantDocument[]>([]);

  const [invoiceLimit, setInvoiceLimit] = useState(PAGE_STEP);
  const [receiptLimit, setReceiptLimit] = useState(PAGE_STEP);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!id) return null;
    const quiet = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
    const [
      tn,
      allLeases,
      allUnits,
      allBuildings,
      allProps,
      allPropTypes,
      allInvoices,
      allReceipts,
      allTickets,
      cats,
      allOccupants,
      allVehicles,
      allDocs,
    ] = await Promise.all([
      getStaffTenant(id),
      quiet(getStaffLeases()),
      quiet(getStaffUnits()),
      quiet(getStaffBuildings()),
      quiet(getStaffProperties()),
      quiet(getStaffPropertyTypes()),
      canSeeFinance ? quiet(getStaffInvoices()) : Promise.resolve([] as StaffInvoice[]),
      canSeeFinance ? quiet(getStaffReceipts()) : Promise.resolve([] as StaffReceipt[]),
      canSeeTickets ? quiet(getStaffTickets()) : Promise.resolve([] as StaffTicket[]),
      !canSeeTickets || isDemo
        ? Promise.resolve(DEFAULT_SERVICE_CATEGORIES)
        : getStaffServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
      quiet(getStaffOccupants()),
      canSeeVehicles ? quiet(getStaffTenantVehicles()) : Promise.resolve([] as StaffTenantVehicle[]),
      quiet(getStaffTenantDocuments()),
    ]);
    return {
      tn,
      allLeases,
      allUnits,
      allBuildings,
      allProps,
      allPropTypes,
      allInvoices,
      allReceipts,
      allTickets,
      cats: cats.length > 0 ? cats : DEFAULT_SERVICE_CATEGORIES,
      allOccupants,
      allVehicles,
      allDocs,
    };
  }, [id, canSeeFinance, canSeeTickets, canSeeVehicles, isDemo]);

  const applyData = useCallback(
    (res: NonNullable<Awaited<ReturnType<typeof loadAll>>>) => {
      setTenant(res.tn);
      setLeases(res.allLeases.filter((l) => l.tenantId === id));
      setUnits(res.allUnits);
      setBuildings(res.allBuildings);
      setProperties(res.allProps);
      setPropertyTypes(res.allPropTypes);
      setInvoices(
        res.allInvoices
          .filter((inv) => inv.tenantId === id)
          .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || '')),
      );
      setReceipts(
        res.allReceipts
          .filter((rcp) => rcp.tenantId === id)
          .sort((a, b) => (b.receiptDate || '').localeCompare(a.receiptDate || '')),
      );
      setTickets(
        res.allTickets
          .filter((tk) => tk.tenantId === id)
          .sort((a, b) => {
            const aOpen = a.status !== 'Resolved' && a.status !== 'Closed' ? 1 : 0;
            const bOpen = b.status !== 'Resolved' && b.status !== 'Closed' ? 1 : 0;
            if (bOpen !== aOpen) return bOpen - aOpen;
            return (b.createdAtUtc || '').localeCompare(a.createdAtUtc || '');
          }),
      );
      setCategories(res.cats);
      setOccupants(res.allOccupants.filter((o) => o.tenantId === id));
      setVehicles(res.allVehicles.filter((v) => v.tenantId === id));
      setDocuments(res.allDocs.filter((d) => d.tenantId === id));
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

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const propertyTypeById = useMemo(() => new Map(propertyTypes.map((pt) => [pt.id, pt])), [propertyTypes]);
  const buildingById = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);

  const placeCtx = useMemo<PlaceLookupContext>(
    () => ({ code, propertyById, propertyTypeById, buildingById }),
    [code, propertyById, propertyTypeById, buildingById],
  );

  const sortedLeases = useMemo(() => sortLeasesCurrentFirst(leases), [leases]);
  const currentLeases = useMemo(
    () => sortedLeases.filter((l) => staffLeasePhase(l) === 'current'),
    [sortedLeases],
  );
  const pastLeases = useMemo(
    () => sortedLeases.filter((l) => staffLeasePhase(l) === 'past'),
    [sortedLeases],
  );

  const liveInvoices = useMemo(
    () => invoices.filter((inv) => inv.status !== 'Cancelled' && inv.status !== 'Draft'),
    [invoices],
  );
  const totalInvoiced = useMemo(
    () => liveInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
    [liveInvoices],
  );
  const totalPaid = useMemo(
    () => liveInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
    [liveInvoices],
  );
  const balanceDue = useMemo(
    () => liveInvoices.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0),
    [liveInvoices],
  );

  const openTicketCount = useMemo(
    () => tickets.filter((tk) => tk.status !== 'Resolved' && tk.status !== 'Closed').length,
    [tickets],
  );

  const uniqueOccupants = useMemo(() => {
    const seen = new Set<string>();
    return occupants.filter((o) => {
      const key = (o.nationalIdNo || o.passportNo || o.fullNameEn).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [occupants]);

  const tenantName = tenant ? byLang(code, tenant.displayNameEn, tenant.displayNameAr) : t('staff.tenant');

  const breadcrumbs = useMemo(
    () => [
      { label: t('tabs.properties'), onPress: () => router.push('/staff/properties' as any) },
      { label: t('staff.tenantsTab'), onPress: () => router.push('/staff/properties' as any) },
      { label: tenantName },
    ],
    [tenantName, t],
  );

  const summaryItems = useMemo(() => {
    const base: {
      label: string;
      value: string | number;
      tone?: 'default' | 'primary' | 'secondary' | 'muted' | 'danger' | 'success' | 'warning';
    }[] = [
      { label: t('staff.currentLease'), value: currentLeases.length, tone: 'primary' },
      { label: t('staff.leasePhase.past'), value: pastLeases.length },
    ];
    if (canSeeFinance) {
      base.push(
        { label: t('staff.invoiced'), value: omr(totalInvoiced, code) },
        { label: t('staff.paid'), value: omr(totalPaid, code), tone: 'success' },
        {
          label: t('staff.balance'),
          value: omr(balanceDue, code),
          tone: balanceDue > 0 ? 'danger' : 'default',
        },
      );
    }
    if (canSeeTickets) {
      base.push({
        label: t('staff.openTickets'),
        value: openTicketCount,
        tone: openTicketCount > 0 ? 'warning' : 'default',
      });
    }
    return base;
  }, [currentLeases.length, pastLeases.length, canSeeFinance, canSeeTickets, totalInvoiced, totalPaid, balanceDue, openTicketCount, code, t]);

  const signatoriesText = useMemo(() => {
    if (!tenant) return '—';
    const list = tenant.contacts?.filter((c) => c.kind === 'Signatory').map((c) => c.name) ?? [];
    if (list.length > 0) return list.join(', ');
    return tenant.authorisedSignatory || '—';
  }, [tenant]);

  const contactsText = useMemo(() => {
    if (!tenant) return '—';
    const list = tenant.contacts?.filter((c) => c.kind === 'Contact') ?? [];
    if (list.length === 0) return '—';
    return list.map((c) => [c.name, c.phone, c.email].filter(Boolean).join(' · ')).join('\n');
  }, [tenant]);

  const preferredLangLabel = useMemo(() => {
    if (!tenant?.preferredLanguage) return '—';
    const found = languageByCode(tenant.preferredLanguage);
    return found ? `${found.nativeName} (${found.name})` : tenant.preferredLanguage;
  }, [tenant]);

  return (
    <Page
      title={tenantName}
      breadcrumbs={breadcrumbs}
      right={
        tenant ? (
          <Pill
            accent={tenant.isActive ? 'success' : 'danger'}
            label={tenant.isActive ? t('staff.active') : t('staff.inactive')}
          />
        ) : undefined
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
      error={error}
      onRetry={() => fetchData(false)}>
      {tenant && (
        <View style={{ gap: space.md }}>
          {/* Top header card */}
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar name={tenant.displayNameEn || tenantName} size={52} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="bodyLarge" weight="bold">
                  {tenantName}
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                  <Pill accent="primary" label={tenant.tenantNumber} />
                  <Pill
                    accent={tenant.isActive ? 'success' : 'danger'}
                    label={tenant.isActive ? t('staff.active') : t('staff.inactive')}
                  />
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {tenant.primaryMobile ? (
                <View style={{ flex: 1, minWidth: 140 }}>
                  <Button
                    tone="outline"
                    compact
                    icon={IconPhone}
                    label={ltr(tenant.primaryMobile)}
                    onPress={() => void Linking.openURL(`tel:${tenant.primaryMobile.replace(/\s+/g, '')}`)}
                  />
                </View>
              ) : null}
              {tenant.primaryEmail ? (
                <View style={{ flex: 1, minWidth: 140 }}>
                  <Button
                    tone="outline"
                    compact
                    icon={IconMail}
                    label={tenant.primaryEmail}
                    onPress={() => void Linking.openURL(`mailto:${tenant.primaryEmail}`)}
                  />
                </View>
              ) : null}
            </View>
          </Card>

          {/* Summary Strip */}
          <SummaryStrip items={summaryItems} />

          {/* Profile details matching the website's Tenant Profile tab */}
          <Details
            title={t('staff.tenantProfile')}
            rows={[
              [t('staff.tenantCode'), tenant.tenantNumber || '—'],
              [t('staff.tenantType'), translateTenantType(t, tenant.tenantType)],
              [t('staff.category'), tenant.tenantCategory || '—'],
              [t('staff.nationality'), tenant.nationalityCode || '—'],
              [
                t('staff.mobile'),
                tenant.primaryMobile ? (
                  <Pressable
                    key="mobile"
                    onPress={() => void Linking.openURL(`tel:${tenant.primaryMobile.replace(/\s+/g, '')}`)}>
                    <AppText variant="small" weight="semibold" tone="primary">
                      {ltr(tenant.primaryMobile)}
                    </AppText>
                  </Pressable>
                ) : (
                  '—'
                ),
              ],
              [
                t('staff.email'),
                tenant.primaryEmail ? (
                  <Pressable key="email" onPress={() => void Linking.openURL(`mailto:${tenant.primaryEmail}`)}>
                    <AppText variant="small" weight="semibold" tone="primary">
                      {tenant.primaryEmail}
                    </AppText>
                  </Pressable>
                ) : (
                  '—'
                ),
              ],
              ...(tenant.tenantType && tenant.tenantType !== 'Individual'
                ? ([
                    [t('staff.authorisedSignatories'), signatoriesText],
                    [t('staff.contactPersons'), contactsText],
                  ] as [string, string][])
                : []),
              [t('staff.appAccess'), tenant.appUsername || '—'],
              [t('staff.displayNameArabic'), tenant.displayNameAr || '—'],
              [t('staff.onboarded'), tenant.createdAtUtc ? longDate(tenant.createdAtUtc, code) : '—'],
              [t('staff.preferredLanguage'), preferredLangLabel],
              [t('staff.createdAt'), tenant.createdAtUtc ? longDate(tenant.createdAtUtc, code) : '—'],
              [t('staff.modifiedAt'), tenant.updatedAtUtc ? longDate(tenant.updatedAtUtc, code) : '—'],
              [t('staff.occupants'), t('staff.nRegistered', { value: String(uniqueOccupants.length) })],
              [t('staff.status'), tenant.isActive ? t('staff.active') : t('staff.inactive')],
            ]}
          />

          {/* Leases section */}
          <View style={{ gap: space.sm }}>
            <SectionHeader title={t('staff.leaseHistory')} count={sortedLeases.length} />
            {sortedLeases.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              sortedLeases.map((l) => {
                const unit = unitById.get(l.unitId);
                const prop = propertyById.get(l.propertyId);
                const trail = formatUnitTrail(unit, prop, placeCtx);
                const phase = staffLeasePhase(l);
                const endIso = leaseEffectiveEnd(l);
                return (
                  <Card
                    key={l.id}
                    onPress={canSeeLease ? () => router.push(`/staff/lease/${l.id}` as any) : undefined}
                    style={{ gap: space.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText weight="bold">{l.leaseNumber}</AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                        {phase ? (
                          <Pill
                            accent={phase === 'current' ? 'success' : phase === 'upcoming' ? 'teal' : 'primary'}
                            label={t(`staff.leasePhase.${phase}`)}
                          />
                        ) : null}
                        {l.status !== 'Active' && l.status !== 'Draft' ? (
                          <Pill accent={leaseStatusAccent(l.status)} label={translateLeaseStatus(t, l.status)} />
                        ) : null}
                      </View>
                    </View>
                    {trail ? (
                      <AppText variant="caption" tone="secondary">
                        {trail}
                      </AppText>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <AppText variant="small" weight="bold" tone="primary">
                        {omr(l.rentAmount, code)} / {translateRentFrequency(t, l.rentFrequency)}
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                        <AppText variant="caption" tone="muted">
                          {l.startDate ? longDate(l.startDate, code) : '—'} → {endIso ? longDate(endIso, code) : '—'}
                        </AppText>
                        {canSeeLease ? <Onward /> : null}
                      </View>
                    </View>
                    {wasEndedEarly(l) && l.endDate ? (
                      <AppText variant="caption" tone="warning">
                        {t('staff.endedEarly', { date: longDate(l.endDate, code) })}
                      </AppText>
                    ) : null}
                  </Card>
                );
              })
            )}
          </View>

          {/* Invoices and payments section (only for roles that can see Finance) */}
          {canSeeFinance && (
            <>
              <View style={{ gap: space.sm }}>
                <SectionHeader title={t('staff.invoicesTab')} count={invoices.length} />
                {invoices.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                    <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                  </Card>
                ) : (
                  <>
                    {invoices.slice(0, invoiceLimit).map((inv) => {
                      const eff = effectiveInvoiceStatus(inv);
                      return (
                        <Card
                          key={inv.id}
                          onPress={canSeeInvoice ? () => router.push(`/staff/invoice/${inv.id}` as any) : undefined}
                          style={{ gap: space.xs }}>
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
                    })}
                    {invoices.length > invoiceLimit ? (
                      <Button
                        tone="outline"
                        compact
                        label={t('staff.showMore', { count: invoices.length - invoiceLimit })}
                        onPress={() => setInvoiceLimit((n) => n + PAGE_STEP)}
                      />
                    ) : null}
                  </>
                )}
              </View>

              <View style={{ gap: space.sm }}>
                <SectionHeader title={t('staff.receiptsTab')} count={receipts.length} />
                {receipts.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                    <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                  </Card>
                ) : (
                  <>
                    {receipts.slice(0, receiptLimit).map((rcp) => (
                      <Card key={rcp.id} style={{ gap: space.xs }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                          <AppText weight="bold">{rcp.receiptNumber}</AppText>
                          <Pill accent={receiptStatusAccent(rcp.status)} label={translateReceiptStatus(t, rcp.status)} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <AppText variant="small" weight="bold" tone="success">
                            {omr(rcp.amount, code)}
                          </AppText>
                          <AppText variant="caption" tone="muted">
                            {translatePaymentMethod(t, rcp.paymentMethod)} • {rcp.receiptDate ? longDate(rcp.receiptDate, code) : '—'}
                          </AppText>
                        </View>
                      </Card>
                    ))}
                    {receipts.length > receiptLimit ? (
                      <Button
                        tone="outline"
                        compact
                        label={t('staff.showMore', { count: receipts.length - receiptLimit })}
                        onPress={() => setReceiptLimit((n) => n + PAGE_STEP)}
                      />
                    ) : null}
                  </>
                )}
              </View>
            </>
          )}

          {/* Tickets section (shown only to roles that can open tickets) */}
          {canSeeTickets && (
            <View style={{ gap: space.sm }}>
              <SectionHeader title={t('staff.tickets')} count={tickets.length} />
              {tickets.length === 0 ? (
                <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                  <AppText tone="secondary">{t('staff.noTicketsFound')}</AppText>
                </Card>
              ) : (
                tickets.map((tk) => (
                  <Card
                    key={tk.id}
                    onPress={() => router.push(`/staff/ticket/${tk.id}` as any)}
                    style={{ gap: space.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText weight="bold">{tk.ticketNumber}</AppText>
                      <View style={{ flexDirection: 'row', gap: space.xs }}>
                        <Pill
                          accent={tk.priority === 'Emergency' ? 'danger' : tk.priority === 'High' ? 'warning' : 'primary'}
                          label={translatePriority(t, tk.priority)}
                        />
                        <Pill
                          accent={
                            tk.status === 'Resolved' || tk.status === 'Closed'
                              ? 'success'
                              : tk.status === 'InProgress'
                                ? 'teal'
                                : 'warning'
                          }
                          label={translateTicketStatus(t, tk.status)}
                        />
                      </View>
                    </View>
                    <AppText variant="small" tone="secondary" numberOfLines={2}>
                      {tk.description}
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="caption" tone="muted">
                        {formatTicketCategory(tk.category, categories, t, code)}
                        {tk.createdAtUtc ? ` • ${longDate(tk.createdAtUtc, code)}` : ''}
                      </AppText>
                      <Onward />
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* Occupants section */}
          <View style={{ gap: space.sm }}>
            <SectionHeader title={t('staff.occupants')} count={uniqueOccupants.length} />
            {uniqueOccupants.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              uniqueOccupants.map((occ) => (
                <Card key={occ.id} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                    <AppText weight="bold">{byLang(code, occ.fullNameEn, occ.fullNameAr)}</AppText>
                    <Pill accent="primary" label={translateOccupantType(t, occ.occupantType)} />
                  </View>
                  <AppText variant="caption" tone="secondary">
                    {[
                      occ.relationship ? `${t('staff.relationship')}: ${occ.relationship}` : undefined,
                      occ.mobile ? `${t('staff.mobile')}: ${ltr(occ.mobile)}` : undefined,
                    ]
                      .filter(Boolean)
                      .join(' • ') || '—'}
                  </AppText>
                </Card>
              ))
            )}
          </View>

          {/* Vehicles section */}
          {canSeeVehicles && (
            <View style={{ gap: space.sm }}>
              <SectionHeader title={t('staff.vehicles')} count={vehicles.length} />
              {vehicles.length === 0 ? (
                <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                  <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                </Card>
              ) : (
                vehicles.map((veh) => (
                  <Card key={veh.id} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText weight="bold">{ltr(veh.plateNumber)}</AppText>
                      <Pill accent="teal" label={translateVehicleType(t, veh.vehicleType)} />
                    </View>
                    <AppText variant="caption" tone="secondary">
                      {[
                        [veh.make, veh.model, veh.colour].filter(Boolean).join(' '),
                        veh.permitNo ? `${t('staff.permit')}: ${veh.permitNo}` : undefined,
                      ]
                        .filter(Boolean)
                        .join(' • ') || '—'}
                    </AppText>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* Documents section */}
          <View style={{ gap: space.sm }}>
            <SectionHeader title={t('staff.documents')} count={documents.length} />
            {documents.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              documents.map((doc) => {
                const daysToExpiry = doc.expiryDate ? daysUntil(doc.expiryDate) : null;
                const isDocExpired = daysToExpiry !== null && daysToExpiry < 0;
                const isDocExpiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30;
                return (
                  <Card key={doc.id} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText weight="bold" style={{ flex: 1 }}>
                        {translateDocumentType(t, doc.documentType)}
                      </AppText>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                        {isDocExpired ? <Pill accent="danger" label={t('staff.expired')} /> : null}
                        {isDocExpiringSoon ? <Pill accent="warning" label={t('staff.expiring')} /> : null}
                        <Pill
                          accent={verificationStatusAccent(doc.verificationStatus)}
                          label={translateVerificationStatus(t, doc.verificationStatus)}
                        />
                      </View>
                    </View>
                    <AppText variant="caption" tone="secondary">
                      {[
                        doc.documentNumber || doc.fileName,
                        doc.expiryDate ? `${t('staff.expiry')}: ${longDate(doc.expiryDate, code)}` : undefined,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </AppText>
                  </Card>
                );
              })
            )}
          </View>
        </View>
      )}
    </Page>
  );
}
