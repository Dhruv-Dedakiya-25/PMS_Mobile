import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffBuildings,
  getStaffFloorZones,
  getStaffLeases,
  getStaffProperties,
  getStaffTenants,
  getStaffUnits,
  type StaffBuilding,
  type StaffFloorZone,
  type StaffLease,
  type StaffProperty,
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
  translateUnitStatus,
  unitSpecsText,
  unitStatusAccent,
} from '@/lib/staff-helpers';
import { space, usePalette } from '@/theme/tokens';

export default function BuildingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const code = language.code;

  const [building, setBuilding] = useState<StaffBuilding | null>(null);
  const [property, setProperty] = useState<StaffProperty | null>(null);
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
    const [allProps, allBuildings, allFloors, allUnits, allLeases, allTenants] = await Promise.all([
      getStaffProperties(),
      getStaffBuildings(),
      quiet(getStaffFloorZones()),
      getStaffUnits(),
      quiet(getStaffLeases()),
      quiet(getStaffTenants()),
    ]);
    return { allProps, allBuildings, allFloors, allUnits, allLeases, allTenants };
  }, []);

  const applyData = useCallback(
    (res: Awaited<ReturnType<typeof loadAll>>) => {
      const b = res.allBuildings.find((item) => item.id === id) ?? null;
      setBuilding(b);
      const p = b ? res.allProps.find((item) => item.id === b.propertyId) ?? null : null;
      setProperty(p);
      setFloors(res.allFloors.filter((f) => f.buildingId === id));
      setUnits(res.allUnits.filter((u) => u.buildingId === id));
      setLeases(b ? res.allLeases.filter((l) => l.propertyId === b.propertyId) : []);
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

  const tenantById = useMemo(() => new Map(tenants.map((tn) => [tn.id, tn])), [tenants]);
  const floorById = useMemo(() => new Map(floors.map((f) => [f.id, f])), [floors]);
  const currentLeaseByUnit = useMemo(() => {
    const map = new Map<string, StaffLease>();
    leases.forEach((l) => {
      if (isCurrentLease(l) && !map.has(l.unitId)) map.set(l.unitId, l);
    });
    return map;
  }, [leases]);

  const stats = useMemo(() => summarizeUnits(units, leases), [units, leases]);
  const bldName = building ? byLang(code, building.buildingNameEn, building.buildingNameAr) : t('staff.buildingDetails');
  const propName = property ? byLang(code, property.propertyNameEn, property.propertyNameAr) : '';

  const topFloors = useMemo(
    () =>
      floors
        .filter((f) => !f.parentFloorZoneId)
        .sort((a, b) => (a.floorNumber ?? a.sortOrder ?? 0) - (b.floorNumber ?? b.sortOrder ?? 0)),
    [floors],
  );

  const otherUnits = useMemo(() => {
    const floorIds = new Set(floors.map((f) => f.id));
    return units.filter((u) => !u.floorZoneId || !floorIds.has(u.floorZoneId));
  }, [floors, units]);

  const q = search.trim().toLowerCase();

  const searchedUnits = useMemo(() => {
    if (!q) return [];
    return units.filter((u) => {
      const curLease = currentLeaseByUnit.get(u.id);
      const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
      const fl = u.floorZoneId ? floorById.get(u.floorZoneId) : undefined;
      return [
        u.unitCode,
        u.unitNameEn,
        u.unitNameAr,
        tenant?.displayNameEn,
        tenant?.displayNameAr,
        fl?.nameEn,
        fl?.nameAr,
      ].some((v) => v?.toLowerCase().includes(q));
    });
  }, [units, q, currentLeaseByUnit, tenantById, floorById]);

  const breadcrumbs = useMemo(() => {
    const trail: { label: string; onPress?: () => void }[] = [
      { label: t('tabs.properties'), onPress: () => router.push('/staff/properties' as any) },
    ];
    if (property && property.structure !== 'Individual') {
      trail.push({
        label: propName,
        onPress: () => router.push(`/staff/property/${property.id}` as any),
      });
    }
    trail.push({ label: bldName });
    return trail;
  }, [property, propName, bldName, t]);

  return (
    <Page
      title={bldName}
      breadcrumbs={breadcrumbs}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
      error={error}
      onRetry={() => fetchData(false)}>
      {building && (
        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <AppText variant="bodyLarge" weight="bold" style={{ flex: 1 }}>
                {bldName}
              </AppText>
              <Pill accent="teal" label={building.buildingCode} />
            </View>
            {propName ? (
              <AppText variant="caption" tone="secondary">
                {propName}
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
            placeholder={t('staff.searchUnitsInBuilding')}
          />

          {q ? (
            <View style={{ gap: space.sm }}>
              <SectionHeader title={t('staff.unitsTab')} count={searchedUnits.length} />
              {searchedUnits.length === 0 ? (
                <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                  <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
                </Card>
              ) : (
                searchedUnits.map((u) => {
                  const curLease = currentLeaseByUnit.get(u.id);
                  const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
                  const fl = u.floorZoneId ? floorById.get(u.floorZoneId) : undefined;
                  return (
                    <Card
                      key={u.id}
                      onPress={() => router.push(`/staff/unit/${u.id}` as any)}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold" style={{ flex: 1 }}>
                          {u.unitCode}
                          {fl ? ` · ${byLang(code, fl.nameEn, fl.nameAr)}` : ''}
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
                })
              )}
            </View>
          ) : (
            <View style={{ gap: space.lg }}>
              {topFloors.length > 0 ? (
                <View style={{ gap: space.sm }}>
                  <SectionHeader title={t('staff.floorsSection')} count={topFloors.length} />
                  {topFloors.map((fl) => {
                    const childZoneIds = new Set(
                      floors.filter((z) => z.parentFloorZoneId === fl.id).map((z) => z.id),
                    );
                    const flUnits = units.filter(
                      (u) => u.floorZoneId === fl.id || (u.floorZoneId && childZoneIds.has(u.floorZoneId)),
                    );
                    const flStats = summarizeUnits(flUnits, leases);
                    return (
                      <Card
                        key={fl.id}
                        onPress={() => router.push(`/staff/floor/${fl.id}` as any)}
                        style={{ gap: space.xs }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                          <AppText weight="bold" style={{ flex: 1 }}>
                            {byLang(code, fl.nameEn, fl.nameAr)}
                          </AppText>
                          {fl.code ? <Pill accent="primary" label={fl.code} /> : null}
                        </View>
                        <View style={{ gap: 6, marginTop: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }}>
                            <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                              {formatUnitsSummary(flStats, t)}
                            </AppText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <AppText variant="caption" weight="semibold" tone="primary">
                                {flStats.occupancyPct}%
                              </AppText>
                              <Onward />
                            </View>
                          </View>
                          <ProgressBar percent={flStats.occupancyPct} color={palette.success} />
                        </View>
                      </Card>
                    );
                  })}
                </View>
              ) : null}

              {otherUnits.length > 0 ? (
                <View style={{ gap: space.sm }}>
                  <SectionHeader title={t('staff.otherUnits')} count={otherUnits.length} />
                  {otherUnits.map((u) => {
                    const curLease = currentLeaseByUnit.get(u.id);
                    const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
                    return (
                      <Card
                        key={u.id}
                        onPress={() => router.push(`/staff/unit/${u.id}` as any)}
                        style={{ gap: space.xs }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                          <AppText weight="bold" style={{ flex: 1 }}>
                            {u.unitCode}
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
              ) : null}

              {topFloors.length === 0 && otherUnits.length === 0 ? (
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
