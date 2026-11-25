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
import { Card, Onward, Pill, SearchFilterBar, SectionHeader, SummaryStrip } from '@/components/ui';
import { useLanguage } from '@/i18n';
import {
  byLang,
  isCurrentLease,
  summarizeUnits,
  translateUnitStatus,
  unitSpecsText,
  unitStatusAccent,
} from '@/lib/staff-helpers';
import { space } from '@/theme/tokens';

const BASE_UNIT_STATUSES = ['Occupied', 'Vacant', 'NoticePeriod'];

export default function FloorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;

  const [floor, setFloor] = useState<StaffFloorZone | null>(null);
  const [childZones, setChildZones] = useState<StaffFloorZone[]>([]);
  const [building, setBuilding] = useState<StaffBuilding | null>(null);
  const [property, setProperty] = useState<StaffProperty | null>(null);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [leases, setLeases] = useState<StaffLease[]>([]);
  const [tenants, setTenants] = useState<StaffTenant[]>([]);

  const [search, setSearch] = useState('');
  const [statusChip, setStatusChip] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const quiet = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
    const [allProps, allBuildings, allFloors, allUnits, allLeases, allTenants] = await Promise.all([
      getStaffProperties(),
      getStaffBuildings(),
      getStaffFloorZones(),
      getStaffUnits(),
      quiet(getStaffLeases()),
      quiet(getStaffTenants()),
    ]);
    return { allProps, allBuildings, allFloors, allUnits, allLeases, allTenants };
  }, []);

  const applyData = useCallback(
    (res: Awaited<ReturnType<typeof loadAll>>) => {
      const fl = res.allFloors.find((item) => item.id === id) ?? null;
      setFloor(fl);
      const zones = res.allFloors
        .filter((z) => z.parentFloorZoneId === id)
        .sort((a, b) => (a.sortOrder ?? a.floorNumber ?? 0) - (b.sortOrder ?? b.floorNumber ?? 0));
      setChildZones(zones);
      const b = fl ? res.allBuildings.find((item) => item.id === fl.buildingId) ?? null : null;
      setBuilding(b);
      const p = b ? res.allProps.find((item) => item.id === b.propertyId) ?? null : null;
      setProperty(p);
      const zoneIds = new Set([id, ...zones.map((z) => z.id)]);
      setUnits(res.allUnits.filter((u) => u.floorZoneId && zoneIds.has(u.floorZoneId)));
      setLeases(p ? res.allLeases.filter((l) => l.propertyId === p.id) : []);
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
  const currentLeaseByUnit = useMemo(() => {
    const map = new Map<string, StaffLease>();
    leases.forEach((l) => {
      if (isCurrentLease(l) && !map.has(l.unitId)) map.set(l.unitId, l);
    });
    return map;
  }, [leases]);

  const stats = useMemo(() => summarizeUnits(units, leases), [units, leases]);
  const floorName = floor ? byLang(code, floor.nameEn, floor.nameAr) : t('staff.floorDetails');
  const bldName = building ? byLang(code, building.buildingNameEn, building.buildingNameAr) : '';
  const propName = property ? byLang(code, property.propertyNameEn, property.propertyNameAr) : '';

  const searchedUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => {
      const curLease = currentLeaseByUnit.get(u.id);
      const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
      return [
        u.unitCode,
        u.unitNameEn,
        u.unitNameAr,
        tenant?.displayNameEn,
        tenant?.displayNameAr,
      ].some((v) => v?.toLowerCase().includes(q));
    });
  }, [units, search, currentLeaseByUnit, tenantById]);

  const statusChips = useMemo(() => {
    const extra = Array.from(new Set(searchedUnits.map((u) => u.status).filter((s) => s && !BASE_UNIT_STATUSES.includes(s))));
    const allStatuses = [...BASE_UNIT_STATUSES, ...extra];
    return [
      { value: 'all', label: t('staff.filterAll'), count: searchedUnits.length },
      ...allStatuses.map((st) => ({
        value: st,
        label: translateUnitStatus(t, st),
        count: searchedUnits.filter((u) => u.status === st).length,
      })),
    ];
  }, [searchedUnits, t]);

  const visibleUnits = useMemo(
    () => (statusChip === 'all' ? searchedUnits : searchedUnits.filter((u) => u.status === statusChip)),
    [searchedUnits, statusChip],
  );

  const directUnits = useMemo(() => visibleUnits.filter((u) => u.floorZoneId === id), [visibleUnits, id]);

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
    if (building) {
      trail.push({
        label: bldName,
        onPress: () => router.push(`/staff/building/${building.id}` as any),
      });
    }
    trail.push({ label: floorName });
    return trail;
  }, [property, building, propName, bldName, floorName, t]);

  const renderUnitCard = (u: StaffUnit) => {
    const curLease = currentLeaseByUnit.get(u.id);
    const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
    const uTitle = byLang(code, u.unitNameEn || u.unitCode, u.unitNameAr);
    return (
      <Card
        key={u.id}
        onPress={() => router.push(`/staff/unit/${u.id}` as any)}
        style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
          <AppText weight="bold" style={{ flex: 1 }}>
            {u.unitCode}
            {uTitle && uTitle !== u.unitCode ? ` · ${uTitle}` : ''}
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
  };

  return (
    <Page
      title={floorName}
      breadcrumbs={breadcrumbs}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
      error={error}
      onRetry={() => fetchData(false)}>
      {floor && (
        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <AppText variant="bodyLarge" weight="bold" style={{ flex: 1 }}>
                {floorName}
              </AppText>
              {floor.code ? <Pill accent="primary" label={floor.code} /> : null}
            </View>
            <AppText variant="caption" tone="secondary">
              {[propName, bldName].filter(Boolean).join(' • ')}
            </AppText>
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
            placeholder={t('staff.searchUnits')}
            chips={statusChips}
            chipValue={statusChip}
            onChipChange={setStatusChip}
          />

          {visibleUnits.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            <View style={{ gap: space.md }}>
              {directUnits.length > 0 ? (
                <View style={{ gap: space.sm }}>{directUnits.map(renderUnitCard)}</View>
              ) : null}

              {childZones.map((zone) => {
                const zoneUnits = visibleUnits.filter((u) => u.floorZoneId === zone.id);
                if (zoneUnits.length === 0) return null;
                return (
                  <View key={zone.id} style={{ gap: space.sm }}>
                    <SectionHeader
                      title={byLang(code, zone.nameEn, zone.nameAr)}
                      count={zoneUnits.length}
                    />
                    {zoneUnits.map(renderUnitCard)}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </Page>
  );
}
