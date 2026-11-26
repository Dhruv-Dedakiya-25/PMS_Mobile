import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import {
  getStaffBuildings,
  getStaffFloorZones,
  getStaffInvoices,
  getStaffLeases,
  getStaffProperties,
  getStaffPropertyTypes,
  getStaffTenants,
  getStaffUnits,
  getStaffUnitTypes,
  type StaffBuilding,
  type StaffFloorZone,
  type StaffInvoice,
  type StaffLease,
  type StaffProperty,
  type StaffPropertyType,
  type StaffTenant,
  type StaffUnit,
  type StaffUnitType,
} from '@/api/staff';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Details, Onward, Pill, SectionHeader } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, omr } from '@/lib/format';
import {
  byLang,
  isCurrentLease,
  leaseEffectiveEnd,
  leaseStatusAccent,
  sortLeasesCurrentFirst,
  staffLeasePhase,
  translateFurnishing,
  translateLeaseStatus,
  translateRentFrequency,
  translateUnitStatus,
  unitStatusAccent,
  wasEndedEarly,
} from '@/lib/staff-helpers';
import { space, usePalette } from '@/theme/tokens';

export default function UnitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const { accessTo } = useAppSession();
  const canSeeFinance = accessTo('/staff/finance') !== null;
  const canSeeLease = accessTo('/staff/lease') !== null;
  const canSeeTenant = accessTo('/staff/tenant') !== null;
  const code = language.code;

  const [unit, setUnit] = useState<StaffUnit | null>(null);
  const [property, setProperty] = useState<StaffProperty | null>(null);
  const [building, setBuilding] = useState<StaffBuilding | null>(null);
  const [floor, setFloor] = useState<StaffFloorZone | null>(null);
  const [parentFloor, setParentFloor] = useState<StaffFloorZone | null>(null);
  const [unitType, setUnitType] = useState<StaffUnitType | null>(null);
  const [propertyType, setPropertyType] = useState<StaffPropertyType | null>(null);
  const [unitLeases, setUnitLeases] = useState<StaffLease[]>([]);
  const [allTenants, setAllTenants] = useState<StaffTenant[]>([]);
  const [currentLease, setCurrentLease] = useState<StaffLease | null>(null);
  const [tenant, setTenant] = useState<StaffTenant | null>(null);
  const [invoices, setInvoices] = useState<StaffInvoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const quiet = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
    const [
      allUnits,
      allProps,
      allBuildings,
      allFloors,
      allUnitTypes,
      allPropertyTypes,
      allLeases,
      allTenants,
      allInvoices,
    ] = await Promise.all([
      getStaffUnits(),
      getStaffProperties(),
      quiet(getStaffBuildings()),
      quiet(getStaffFloorZones()),
      quiet(getStaffUnitTypes()),
      quiet(getStaffPropertyTypes()),
      canSeeLease ? quiet(getStaffLeases()) : Promise.resolve([] as StaffLease[]),
      canSeeLease && canSeeTenant ? quiet(getStaffTenants()) : Promise.resolve([] as StaffTenant[]),
      canSeeLease && canSeeFinance ? quiet(getStaffInvoices()) : Promise.resolve([] as StaffInvoice[]),
    ]);
    return {
      allUnits,
      allProps,
      allBuildings,
      allFloors,
      allUnitTypes,
      allPropertyTypes,
      allLeases,
      allTenants,
      allInvoices,
    };
  }, [canSeeLease, canSeeTenant, canSeeFinance]);

  const applyData = useCallback(
    (res: Awaited<ReturnType<typeof loadAll>>) => {
      const u = res.allUnits.find((item) => item.id === id) ?? null;
      setUnit(u);
      const p = u ? res.allProps.find((item) => item.id === u.propertyId) ?? null : null;
      setProperty(p);
      const b = u?.buildingId ? res.allBuildings.find((item) => item.id === u.buildingId) ?? null : null;
      setBuilding(b);
      const fl = u?.floorZoneId ? res.allFloors.find((item) => item.id === u.floorZoneId) ?? null : null;
      setFloor(fl);
      const pFl = fl?.parentFloorZoneId
        ? res.allFloors.find((item) => item.id === fl.parentFloorZoneId) ?? null
        : null;
      setParentFloor(pFl);
      const ut = u?.unitTypeId ? res.allUnitTypes.find((item) => item.id === u.unitTypeId) ?? null : null;
      setUnitType(ut);
      const ptId = u?.propertyTypeId || p?.propertyTypeId;
      const pt = ptId ? res.allPropertyTypes.find((item) => item.id === ptId) ?? null : null;
      setPropertyType(pt);

      const leasesForUnit = sortLeasesCurrentFirst(res.allLeases.filter((l) => l.unitId === id));
      setUnitLeases(leasesForUnit);
      setAllTenants(res.allTenants);
      const cur = leasesForUnit.find((l) => isCurrentLease(l)) ?? null;
      setCurrentLease(cur);
      const tn = cur ? res.allTenants.find((x) => x.id === cur.tenantId) ?? null : null;
      setTenant(tn);
      setInvoices(
        cur
          ? res.allInvoices.filter(
              (inv) => inv.leaseId === cur.id && inv.status !== 'Cancelled' && inv.status !== 'Draft',
            )
          : [],
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
        .then(applyData)
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
        if (!cancelled) applyData(res);
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

  const unitTitle = unit ? byLang(code, unit.unitNameEn || unit.unitCode, unit.unitNameAr) : t('staff.unitDetails');
  const propName = property ? byLang(code, property.propertyNameEn, property.propertyNameAr) : '—';
  const bldName = building ? byLang(code, building.buildingNameEn, building.buildingNameAr) : '—';
  const topFloor = parentFloor ?? floor;
  const floorLabel = useMemo(() => {
    if (!floor) return '—';
    if (parentFloor) {
      return `${byLang(code, parentFloor.nameEn, parentFloor.nameAr)} › ${byLang(code, floor.nameEn, floor.nameAr)}`;
    }
    return byLang(code, floor.nameEn, floor.nameAr);
  }, [floor, parentFloor, code]);

  const typeLabel = useMemo(() => {
    const utName = unitType ? byLang(code, unitType.nameEn, unitType.nameAr) : '';
    const ptName = propertyType ? byLang(code, propertyType.nameEn, propertyType.nameAr) : '';
    return [ptName, utName].filter(Boolean).join(' · ') || '—';
  }, [unitType, propertyType, code]);

  const tenantById = useMemo(() => new Map(allTenants.map((tn) => [tn.id, tn])), [allTenants]);

  const leaseOutstanding = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0),
    [invoices],
  );

  const breadcrumbs = useMemo(() => {
    const trail: { label: string; onPress?: () => void }[] = [
      { label: t('tabs.properties'), onPress: () => router.push('/staff/properties' as any) },
    ];
    if (property && !(property.structure === 'Individual' && !building)) {
      trail.push({
        label: propName,
        onPress: () => router.push(`/staff/property/${property.id}` as any),
      });
    }
    if (building && property?.structure !== 'Individual') {
      trail.push({
        label: bldName,
        onPress: () => router.push(`/staff/building/${building.id}` as any),
      });
    } else if (building && property?.structure === 'Individual') {
      trail.push({
        label: propName,
        onPress: () => router.push(`/staff/building/${building.id}` as any),
      });
    }
    if (topFloor) {
      trail.push({
        label: byLang(code, topFloor.nameEn, topFloor.nameAr),
        onPress: () => router.push(`/staff/floor/${topFloor.id}` as any),
      });
    }
    trail.push({ label: unit?.unitCode || unitTitle });
    return trail;
  }, [property, building, topFloor, propName, bldName, unit, unitTitle, code, t]);

  return (
    <Page
      title={unit?.unitCode || unitTitle}
      breadcrumbs={breadcrumbs}
      right={
        unit ? (
          <Pill accent={unitStatusAccent(unit.status)} label={translateUnitStatus(t, unit.status)} />
        ) : undefined
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
      error={error}
      onRetry={() => fetchData(false)}>
      {unit && (
        <View style={{ gap: space.md }}>
          <Details
            title={t('staff.unitDetails')}
            rows={[
              [t('staff.code'), unit.unitCode],
              [t('staff.name'), unitTitle],
              [t('staff.type'), typeLabel],
              [
                t('staff.status'),
                <View key="status" style={{ alignSelf: 'flex-end' }}>
                  <Pill accent={unitStatusAccent(unit.status)} label={translateUnitStatus(t, unit.status)} />
                </View>,
              ],
              [t('staff.beds'), String(unit.bedrooms ?? 0)],
              [t('staff.baths'), String(unit.bathrooms ?? 0)],
              [t('staff.area'), `${unit.areaSqm ?? 0} ${t('staff.sqm')}`],
              [t('staff.furnishingLabel'), translateFurnishing(t, unit.furnishingStatus)],
              [t('staff.property'), propName],
              [t('staff.building'), bldName],
              [t('staff.floor'), floorLabel],
            ]}
          />

          {canSeeLease && (
            <>
              {currentLease ? (
                <Card style={{ gap: space.md }}>
                  {/* Current Tenant row (tap opens Tenant screen when permitted) */}
                  <Pressable
                    disabled={!tenant || !canSeeTenant}
                    onPress={tenant && canSeeTenant ? () => router.push(`/staff/tenant/${tenant.id}` as any) : undefined}
                    accessibilityRole={tenant && canSeeTenant ? 'button' : undefined}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: space.sm,
                      paddingBottom: space.sm,
                      borderBottomWidth: 1,
                      borderBottomColor: palette.border,
                      opacity: pressed && tenant && canSeeTenant ? 0.75 : 1,
                    })}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="caption" tone="secondary">
                        {t('staff.currentTenant')}
                      </AppText>
                      <AppText variant="bodyLarge" weight="bold" tone={tenant && canSeeTenant ? 'primary' : 'default'}>
                        {tenant ? byLang(code, tenant.displayNameEn, tenant.displayNameAr) : '—'}
                      </AppText>
                      {tenant ? (
                        <AppText variant="caption" tone="muted">
                          {[tenant.tenantNumber, `${t('staff.mobile')}: ${tenant.primaryMobile}`].filter(Boolean).join(' • ')}
                        </AppText>
                      ) : null}
                    </View>
                    {tenant && canSeeTenant ? <Onward /> : null}
                  </Pressable>

                  {/* Current Lease row (tap opens Lease screen) */}
                  <Pressable
                    onPress={() => router.push(`/staff/lease/${currentLease.id}` as any)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      gap: space.xs,
                      opacity: pressed ? 0.75 : 1,
                    })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText variant="bodyLarge" weight="bold" tone="primary">
                        {t('staff.currentLease')} · {currentLease.leaseNumber}
                      </AppText>
                      <Pill accent={leaseStatusAccent(currentLease.status)} label={translateLeaseStatus(t, currentLease.status)} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.xs }}>
                      <AppText variant="body" weight="bold">
                        {omr(currentLease.rentAmount, code)} / {translateRentFrequency(t, currentLease.rentFrequency)}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {currentLease.startDate ? longDate(currentLease.startDate, code) : '—'} →{' '}
                        {leaseEffectiveEnd(currentLease) ? longDate(leaseEffectiveEnd(currentLease)!, code) : '—'}
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
                      {canSeeFinance ? (
                        <AppText variant="small" tone={leaseOutstanding > 0 ? 'danger' : 'secondary'} weight="semibold">
                          {t('staff.leaseOutstanding')}: {omr(leaseOutstanding, code)}
                        </AppText>
                      ) : (
                        <View />
                      )}
                      <Onward />
                    </View>
                  </Pressable>
                </Card>
              ) : (
                <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                  <AppText tone="secondary">{t('staff.noCurrentLease')}</AppText>
                </Card>
              )}

              {/* Lease History for this unit */}
              <View style={{ gap: space.sm }}>
                <SectionHeader title={t('staff.leaseHistory')} count={unitLeases.length} />
                {unitLeases.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
                    <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                  </Card>
                ) : (
                  unitLeases.map((l) => {
                    const lTenant = tenantById.get(l.tenantId);
                    const phase = staffLeasePhase(l);
                    const endIso = leaseEffectiveEnd(l);
                    const canTapTenant = canSeeTenant && Boolean(l.tenantId);
                    return (
                      <Card key={l.id} style={{ gap: space.xs }}>
                        {/* Lease row (tapping opens the Lease screen) */}
                        <Pressable
                          onPress={() => router.push(`/staff/lease/${l.id}` as any)}
                          accessibilityRole="button"
                          style={({ pressed }) => ({
                            gap: 4,
                            opacity: pressed ? 0.75 : 1,
                          })}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                            <AppText weight="bold" tone="primary">
                              {l.leaseNumber}
                            </AppText>
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.xs }}>
                            <AppText variant="small" weight="bold">
                              {omr(l.rentAmount, code)} / {translateRentFrequency(t, l.rentFrequency)}
                            </AppText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                              <AppText variant="caption" tone="muted">
                                {l.startDate ? longDate(l.startDate, code) : '—'} → {endIso ? longDate(endIso, code) : '—'}
                              </AppText>
                              <Onward />
                            </View>
                          </View>
                          {wasEndedEarly(l) && l.endDate ? (
                            <AppText variant="caption" tone="warning">
                              {t('staff.endedEarly', { date: longDate(l.endDate, code) })}
                            </AppText>
                          ) : null}
                        </Pressable>

                        {/* Tenant row (tapping opens the Tenant screen when permitted) */}
                        <Pressable
                          disabled={!canTapTenant}
                          onPress={canTapTenant ? () => router.push(`/staff/tenant/${l.tenantId}` as any) : undefined}
                          accessibilityRole={canTapTenant ? 'button' : undefined}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: space.xs,
                            borderTopWidth: 1,
                            borderTopColor: palette.border,
                            opacity: pressed && canTapTenant ? 0.75 : 1,
                          })}>
                          <AppText variant="small" weight="semibold" tone={canTapTenant ? 'primary' : 'default'}>
                            {lTenant ? byLang(code, lTenant.displayNameEn, lTenant.displayNameAr) : '—'}
                          </AppText>
                          {canTapTenant ? <Onward size={15} /> : null}
                        </Pressable>
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
