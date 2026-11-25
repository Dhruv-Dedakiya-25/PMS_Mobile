import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

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
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Details, Onward, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import {
  byLang,
  isCurrentLease,
  leaseStatusAccent,
  translateFurnishing,
  translateLeaseStatus,
  translateRentFrequency,
  translateUnitStatus,
  unitStatusAccent,
} from '@/lib/staff-helpers';
import { space } from '@/theme/tokens';

export default function UnitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;

  const [unit, setUnit] = useState<StaffUnit | null>(null);
  const [property, setProperty] = useState<StaffProperty | null>(null);
  const [building, setBuilding] = useState<StaffBuilding | null>(null);
  const [floor, setFloor] = useState<StaffFloorZone | null>(null);
  const [parentFloor, setParentFloor] = useState<StaffFloorZone | null>(null);
  const [unitType, setUnitType] = useState<StaffUnitType | null>(null);
  const [propertyType, setPropertyType] = useState<StaffPropertyType | null>(null);
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
      quiet(getStaffLeases()),
      quiet(getStaffTenants()),
      quiet(getStaffInvoices()),
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
  }, []);

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

      const unitLeases = res.allLeases.filter((l) => l.unitId === id);
      const cur = unitLeases.find((l) => isCurrentLease(l)) ?? null;
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

          {currentLease ? (
            <Card
              onPress={() => router.push(`/staff/lease/${currentLease.id}` as any)}
              style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                <AppText variant="bodyLarge" weight="bold">
                  {t('staff.currentLease')} · {currentLease.leaseNumber}
                </AppText>
                <Pill accent={leaseStatusAccent(currentLease.status)} label={translateLeaseStatus(t, currentLease.status)} />
              </View>
              {tenant ? (
                <View style={{ gap: 2 }}>
                  <AppText weight="semibold">
                    {byLang(code, tenant.displayNameEn, tenant.displayNameAr)}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {t('staff.mobile')}: {tenant.primaryMobile}
                  </AppText>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="bodyLarge" weight="bold" tone="primary">
                  {omr(currentLease.rentAmount, code)} / {translateRentFrequency(t, currentLease.rentFrequency)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {currentLease.startDate?.slice(0, 10) ?? '—'} → {currentLease.endDate?.slice(0, 10) ?? '—'}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.xs }}>
                <AppText variant="small" tone={leaseOutstanding > 0 ? 'danger' : 'secondary'} weight="semibold">
                  {t('staff.leaseOutstanding')}: {omr(leaseOutstanding, code)}
                </AppText>
                <Onward />
              </View>
            </Card>
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: space.lg }}>
              <AppText tone="secondary">{t('staff.noCurrentLease')}</AppText>
            </Card>
          )}
        </View>
      )}
    </Page>
  );
}
