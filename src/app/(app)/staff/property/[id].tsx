import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffBuildings,
  getStaffFloorZones,
  getStaffLeases,
  getStaffProperties,
  getStaffPropertyTypes,
  getStaffTenants,
  getStaffUnits,
  type StaffBuilding,
  type StaffFloorZone,
  type StaffLease,
  type StaffProperty,
  type StaffPropertyType,
  type StaffTenant,
  type StaffUnit,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Onward, Pill, ProgressBar, SearchFilterBar, SectionHeader, SummaryStrip } from '@/components/ui';
import { useLanguage } from '@/i18n';
import {
  byLang,
  formatUnitsSummary,
  isCurrentLease,
  summarizeUnits,
  translateStructure,
  translateUnitStatus,
  unitSpecsText,
  unitStatusAccent,
} from '@/lib/staff-helpers';
import { space, usePalette } from '@/theme/tokens';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const code = language.code;

  const [property, setProperty] = useState<StaffProperty | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<StaffPropertyType[]>([]);
  const [buildings, setBuildings] = useState<StaffBuilding[]>([]);
  const [floors, setFloors] = useState<StaffFloorZone[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [leases, setLeases] = useState<StaffLease[]>([]);
  const [tenants, setTenants] = useState<StaffTenant[]>([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const quiet = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
    const [allProps, allTypes, allBuildings, allFloors, allUnits, allLeases, allTenants] = await Promise.all([
      getStaffProperties(),
      quiet(getStaffPropertyTypes()),
      quiet(getStaffBuildings()),
      quiet(getStaffFloorZones()),
      getStaffUnits(),
      quiet(getStaffLeases()),
      quiet(getStaffTenants()),
    ]);
    return { allProps, allTypes, allBuildings, allFloors, allUnits, allLeases, allTenants };
  }, []);

  const applyData = useCallback(
    (res: Awaited<ReturnType<typeof loadAll>>) => {
      const p = res.allProps.find((item) => item.id === id) ?? null;
      setProperty(p);
      setPropertyTypes(res.allTypes);
      const pBuildings = res.allBuildings.filter((b) => b.propertyId === id);
      const bIds = new Set(pBuildings.map((b) => b.id));
      setBuildings(pBuildings);
      setFloors(res.allFloors.filter((f) => bIds.has(f.buildingId)));
      setUnits(res.allUnits.filter((u) => u.propertyId === id));
      setLeases(res.allLeases.filter((l) => l.propertyId === id));
      setTenants(res.allTenants);
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

  const propertyTypeById = useMemo(() => new Map(propertyTypes.map((pt) => [pt.id, pt])), [propertyTypes]);
  const tenantById = useMemo(() => new Map(tenants.map((tn) => [tn.id, tn])), [tenants]);
  const currentLeaseByUnit = useMemo(() => {
    const map = new Map<string, StaffLease>();
    leases.forEach((l) => {
      if (isCurrentLease(l) && !map.has(l.unitId)) map.set(l.unitId, l);
    });
    return map;
  }, [leases]);

  // Individual Villa/Shop with 1 unit: open that unit's details directly
  useEffect(() => {
    if (!loading && property && property.structure === 'Individual' && buildings.length === 0 && units.length === 1) {
      const pType = property.propertyTypeId ? propertyTypeById.get(property.propertyTypeId) : undefined;
      if (!pType || !pType.holdsUnits) {
        router.replace(`/staff/unit/${units[0].id}` as any);
      }
    }
  }, [loading, property, buildings, units, propertyTypeById]);

  const stats = useMemo(() => summarizeUnits(units, leases), [units, leases]);
  const propName = property ? byLang(code, property.propertyNameEn, property.propertyNameAr) : t('staff.propertyDetails');
  const propType = property?.propertyTypeId ? propertyTypeById.get(property.propertyTypeId) : undefined;
  const propTypeName = propType ? byLang(code, propType.nameEn, propType.nameAr) : undefined;
  const structureLabel = translateStructure(t, property?.structure);

  // Individual Building: skip the building step and show its floors directly
  const singleBuilding = property?.structure === 'Individual' && buildings.length === 1 ? buildings[0] : null;

  const q = search.trim().toLowerCase();

  // Group property: Buildings grouped by type
  const buildingGroups = useMemo(() => {
    const filtered = buildings.filter(
      (b) =>
        !q ||
        [b.buildingNameEn, b.buildingNameAr, b.buildingCode].some((v) => v?.toLowerCase().includes(q)) ||
        units
          .filter((u) => u.buildingId === b.id)
          .some((u) => [u.unitCode, u.unitNameEn, u.unitNameAr].some((v) => v?.toLowerCase().includes(q))),
    );
    const groups = new Map<string, { typeLabel: string; items: StaffBuilding[] }>();
    filtered.forEach((b) => {
      const pt = b.propertyTypeId ? propertyTypeById.get(b.propertyTypeId) : undefined;
      const typeLabel = pt ? byLang(code, pt.nameEn, pt.nameAr) : t('staff.buildingsSection');
      const key = b.propertyTypeId || 'default';
      const entry = groups.get(key) ?? { typeLabel, items: [] };
      entry.items.push(b);
      groups.set(key, entry);
    });
    return Array.from(groups.values());
  }, [buildings, units, q, propertyTypeById, code, t]);

  // Group property: Villas & other spaces (units with no buildingId), grouped by type
  const looseUnitGroups = useMemo(() => {
    const loose = units
      .filter((u) => !u.buildingId)
      .filter((u) => {
        if (!q) return true;
        const curLease = currentLeaseByUnit.get(u.id);
        const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
        return [u.unitCode, u.unitNameEn, u.unitNameAr, tenant?.displayNameEn, tenant?.displayNameAr].some((v) =>
          v?.toLowerCase().includes(q),
        );
      });
    const groups = new Map<string, { typeLabel: string; items: StaffUnit[] }>();
    loose.forEach((u) => {
      const pt = u.propertyTypeId ? propertyTypeById.get(u.propertyTypeId) : undefined;
      const typeLabel = pt ? byLang(code, pt.nameEn, pt.nameAr) : t('staff.villasOtherSpaces');
      const key = u.propertyTypeId || 'other';
      const entry = groups.get(key) ?? { typeLabel, items: [] };
      entry.items.push(u);
      groups.set(key, entry);
    });
    return Array.from(groups.values());
  }, [units, q, currentLeaseByUnit, tenantById, propertyTypeById, code, t]);

  // Individual Building floors + other units
  const singleBuildingFloors = useMemo(() => {
    if (!singleBuilding) return [];
    return floors
      .filter((f) => f.buildingId === singleBuilding.id && !f.parentFloorZoneId)
      .sort((a, b) => (a.floorNumber ?? a.sortOrder ?? 0) - (b.floorNumber ?? b.sortOrder ?? 0));
  }, [singleBuilding, floors]);

  const singleBuildingOtherUnits = useMemo(() => {
    if (!singleBuilding) return [];
    const floorIds = new Set(floors.filter((f) => f.buildingId === singleBuilding.id).map((f) => f.id));
    return units.filter((u) => u.buildingId === singleBuilding.id && (!u.floorZoneId || !floorIds.has(u.floorZoneId)));
  }, [singleBuilding, floors, units]);

  return (
    <Page
      title={propName}
      breadcrumbs={[
        { label: t('tabs.properties'), onPress: () => router.push('/staff/properties' as any) },
        { label: propName },
      ]}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
      error={error}
      onRetry={() => fetchData(false)}>
      {property && (
        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <AppText variant="bodyLarge" weight="bold" style={{ flex: 1 }}>
                {propName}
              </AppText>
              <Pill accent="teal" label={property.propertyCode} />
            </View>
            <AppText variant="caption" tone="secondary">
              {[propTypeName, structureLabel, property.city].filter(Boolean).join(' • ')}
            </AppText>
            {property.addressLine1 ? (
              <AppText variant="caption" tone="muted">
                {property.addressLine1}
              </AppText>
            ) : null}
          </Card>

          <SummaryStrip
            items={[
              { label: t('staff.totalUnits'), value: stats.total },
              { label: t('staff.occupiedUnits'), value: stats.occupied, tone: 'success' },
              { label: t('staff.vacantUnits'), value: stats.vacant, tone: stats.vacant > 0 ? 'warning' : 'default' },
              { label: t('staff.noticePeriodCount'), value: stats.noticePeriod, tone: stats.noticePeriod > 0 ? 'warning' : 'default' },
              { label: t('staff.occupancyRate'), value: `${stats.occupancyPct}%`, tone: 'primary' },
              { label: t('staff.activeLeases'), value: stats.activeLeases },
            ]}
          />

          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder={singleBuilding ? t('staff.searchUnitsInBuilding') : t('staff.searchBuildingsAndUnits')}
          />

          {singleBuilding ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title={t('staff.floorsSection')} count={singleBuildingFloors.length} />
              {singleBuildingFloors.map((fl) => {
                const childZoneIds = new Set(
                  floors.filter((z) => z.parentFloorZoneId === fl.id).map((z) => z.id),
                );
                const floorUnits = units.filter(
                  (u) => u.floorZoneId === fl.id || (u.floorZoneId && childZoneIds.has(u.floorZoneId)),
                );
                const flStats = summarizeUnits(floorUnits, leases);
                return (
                  <Card
                    key={fl.id}
                    onPress={() => router.push(`/staff/floor/${fl.id}` as any)}
                    style={{ gap: space.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText weight="bold">{byLang(code, fl.nameEn, fl.nameAr)}</AppText>
                      {fl.code ? <Pill accent="primary" label={fl.code} /> : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }}>
                      <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                        {formatUnitsSummary(flStats, t)}
                      </AppText>
                      <Onward />
                    </View>
                  </Card>
                );
              })}

              {singleBuildingOtherUnits.length > 0 ? (
                <View style={{ gap: space.sm }}>
                  <SectionHeader title={t('staff.otherUnits')} count={singleBuildingOtherUnits.length} />
                  {singleBuildingOtherUnits.map((u) => (
                    <Card
                      key={u.id}
                      onPress={() => router.push(`/staff/unit/${u.id}` as any)}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <AppText weight="bold">{u.unitCode}</AppText>
                        <Pill accent={unitStatusAccent(u.status)} label={translateUnitStatus(t, u.status)} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <AppText variant="caption" tone="secondary">
                          {unitSpecsText(u, t)}
                        </AppText>
                        <Onward />
                      </View>
                    </Card>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: space.lg }}>
              {buildingGroups.length > 0 ? (
                <View style={{ gap: space.sm }}>
                  <SectionHeader title={t('staff.buildingsSection')} count={buildings.length} />
                  {buildingGroups.map((group) => (
                    <View key={group.typeLabel} style={{ gap: space.sm }}>
                      {buildingGroups.length > 1 ? (
                        <AppText variant="small" weight="semibold" tone="secondary">
                          {group.typeLabel} ({group.items.length})
                        </AppText>
                      ) : null}
                      {group.items.map((b) => {
                        const bUnits = units.filter((u) => u.buildingId === b.id);
                        const bStats = summarizeUnits(bUnits, leases);
                        const bName = byLang(code, b.buildingNameEn, b.buildingNameAr);
                        return (
                          <Card
                            key={b.id}
                            onPress={() => router.push(`/staff/building/${b.id}` as any)}
                            style={{ gap: space.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                              <AppText weight="bold" style={{ flex: 1 }}>
                                {bName}
                              </AppText>
                              <Pill accent="teal" label={b.buildingCode} />
                            </View>
                            <View style={{ gap: 6, marginTop: 2 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }}>
                                <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                                  {formatUnitsSummary(bStats, t)}
                                </AppText>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <AppText variant="caption" weight="semibold" tone="primary">
                                    {bStats.occupancyPct}%
                                  </AppText>
                                  <Onward />
                                </View>
                              </View>
                              <ProgressBar percent={bStats.occupancyPct} color={palette.success} />
                            </View>
                          </Card>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : null}

              {looseUnitGroups.length > 0 ? (
                <View style={{ gap: space.sm }}>
                  <SectionHeader
                    title={t('staff.villasOtherSpaces')}
                    count={units.filter((u) => !u.buildingId).length}
                  />
                  {looseUnitGroups.map((group) => (
                    <View key={group.typeLabel} style={{ gap: space.sm }}>
                      <AppText variant="small" weight="semibold" tone="secondary">
                        {group.typeLabel} ({group.items.length})
                      </AppText>
                      {group.items.map((u) => {
                        const curLease = currentLeaseByUnit.get(u.id);
                        const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
                        const uName = byLang(code, u.unitNameEn || u.unitCode, u.unitNameAr);
                        return (
                          <Card
                            key={u.id}
                            onPress={() => router.push(`/staff/unit/${u.id}` as any)}
                            style={{ gap: space.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                              <AppText weight="bold" style={{ flex: 1 }}>
                                {u.unitCode}
                                {uName && uName !== u.unitCode ? ` · ${uName}` : ''}
                              </AppText>
                              <Pill accent={unitStatusAccent(u.status)} label={translateUnitStatus(t, u.status)} />
                            </View>
                            {tenant ? (
                              <AppText variant="caption" tone="secondary">
                                {byLang(code, tenant.displayNameEn, tenant.displayNameAr)}
                              </AppText>
                            ) : null}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <AppText variant="caption" tone="muted">
                                {unitSpecsText(u, t)}
                              </AppText>
                              <Onward />
                            </View>
                          </Card>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : null}

              {buildingGroups.length === 0 && looseUnitGroups.length === 0 ? (
                <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                  <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                </Card>
              ) : null}
            </View>
          )}
        </View>
      )}
    </Page>
  );
}
