import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

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
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Avatar, Button, Card, Onward, Pill, ProgressBar, SearchFilterBar, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import {
  byLang,
  formatCardPlace,
  formatUnitsSummary,
  isCurrentLease,
  leaseStatusAccent,
  PAGE_STEP,
  summarizeUnits,
  translateLeaseStatus,
  translateRentFrequency,
  translateStructure,
  translateUnitStatus,
  unitSpecsText,
  unitStatusAccent,
} from '@/lib/staff-helpers';
import { useLocationFilter } from '@/lib/use-location-filter';
import { space, usePalette } from '@/theme/tokens';

type Section = 'properties' | 'units' | 'leases' | 'tenants';
type PropOccupancyChip = 'all' | 'vacant' | 'occupied';
type TenantLeaseChip = 'all' | 'current' | 'none';

const BASE_UNIT_STATUSES = ['Occupied', 'Vacant', 'NoticePeriod'];
const BASE_LEASE_STATUSES = ['Active', 'Draft', 'PendingApproval', 'Expired', 'Terminated'];

export default function StaffProperties() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const { isPropertyConsultant, user } = useAppSession();
  const code = language.code;
  const staffName = user?.displayName || user?.username || 'Property Consultant';
  const [section, setSection] = useState<Section>('properties');

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

  // Properties segment filters
  const [propSearch, setPropSearch] = useState('');
  const [propChip, setPropChip] = useState<PropOccupancyChip>('all');
  const [propStructure, setPropStructure] = useState('all');
  const [propTypeId, setPropTypeId] = useState('all');

  // Units segment filters
  const [unitSearch, setUnitSearch] = useState('');
  const [unitStatusChip, setUnitStatusChip] = useState('all');
  const [unitLimit, setUnitLimit] = useState(PAGE_STEP);

  // Leases segment filters
  const [leaseSearch, setLeaseSearch] = useState('');
  const [leaseStatusChip, setLeaseStatusChip] = useState('all');
  const [leaseLimit, setLeaseLimit] = useState(PAGE_STEP);

  // Tenants segment filters
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantChip, setTenantChip] = useState<TenantLeaseChip>('all');
  const [tenantLimit, setTenantLimit] = useState(PAGE_STEP);

  const resetListLimits = useCallback(() => {
    setUnitLimit(PAGE_STEP);
    setLeaseLimit(PAGE_STEP);
    setTenantLimit(PAGE_STEP);
  }, []);

  // Shared location filter across Units, Leases and Tenants
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
    const [p, pt, b, fz, u, l, tn] = await Promise.all([
      getStaffProperties(),
      quiet(getStaffPropertyTypes()),
      quiet(getStaffBuildings()),
      quiet(getStaffFloorZones()),
      getStaffUnits(),
      getStaffLeases(),
      getStaffTenants(),
    ]);
    return { p, pt, b, fz, u, l, tn };
  }, []);

  const fetchData = useCallback(
    (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      loadAll()
        .then(({ p, pt, b, fz, u, l, tn }) => {
          setProperties(p);
          setPropertyTypes(pt);
          setBuildings(b);
          setFloorZones(fz);
          setUnits(u);
          setLeases(l);
          setTenants(tn);
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
      .then(({ p, pt, b, fz, u, l, tn }) => {
        if (!cancelled) {
          setProperties(p);
          setPropertyTypes(pt);
          setBuildings(b);
          setFloorZones(fz);
          setUnits(u);
          setLeases(l);
          setTenants(tn);
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
  const tenantById = useMemo(() => new Map(tenants.map((tn) => [tn.id, tn])), [tenants]);

  const placeCtx = useMemo(
    () => ({ code, propertyById, propertyTypeById, buildingById, floorById }),
    [code, propertyById, propertyTypeById, buildingById, floorById],
  );

  // Current lease by unitId and by tenantId
  const currentLeaseByUnit = useMemo(() => {
    const map = new Map<string, StaffLease>();
    leases.forEach((l) => {
      if (isCurrentLease(l) && !map.has(l.unitId)) {
        map.set(l.unitId, l);
      }
    });
    return map;
  }, [leases]);

  const currentLeaseByTenant = useMemo(() => {
    const map = new Map<string, StaffLease>();
    leases.forEach((l) => {
      if (isCurrentLease(l) && !map.has(l.tenantId)) {
        map.set(l.tenantId, l);
      }
    });
    return map;
  }, [leases]);

  const getTenantCurrentLease = useCallback(
    (tenantId: string) => {
      if (locationFilter.isFiltered) {
        const inPlace = leases.find(
          (l) =>
            l.tenantId === tenantId &&
            isCurrentLease(l) &&
            locationFilter.matches({ propertyId: l.propertyId, unitId: l.unitId }),
        );
        if (inPlace) return inPlace;
      }
      return currentLeaseByTenant.get(tenantId);
    },
    [locationFilter, leases, currentLeaseByTenant],
  );

  // ── Properties segment ──────────────────────────────────────────────────────
  const propertyCards = useMemo(() => {
    return properties.map((p) => {
      const pUnits = units.filter((u) => u.propertyId === p.id);
      const pBuildings = buildings.filter((b) => b.propertyId === p.id);
      const stats = summarizeUnits(pUnits, leases);
      const pType = p.propertyTypeId ? propertyTypeById.get(p.propertyTypeId) : undefined;
      return {
        property: p,
        pUnits,
        pBuildings,
        stats,
        pType,
      };
    });
  }, [properties, units, buildings, leases, propertyTypeById]);

  const searchedProperties = useMemo(() => {
    const q = propSearch.trim().toLowerCase();
    return propertyCards
      .filter((item) => propStructure === 'all' || item.property.structure === propStructure)
      .filter((item) => {
        if (propTypeId === 'all') return true;
        if (item.property.propertyTypeId === propTypeId) return true;
        return (
          item.pBuildings.some((b) => b.propertyTypeId === propTypeId) ||
          item.pUnits.some((u) => u.propertyTypeId === propTypeId)
        );
      })
      .filter(
        (item) =>
          !q ||
          [
            item.property.propertyNameEn,
            item.property.propertyNameAr,
            item.property.propertyCode,
            item.property.city,
            item.property.addressLine1,
          ].some((v) => v?.toLowerCase().includes(q)),
      );
  }, [propertyCards, propSearch, propStructure, propTypeId]);

  const hasVacantProperties = useMemo(
    () => searchedProperties.filter((item) => item.stats.vacant > 0),
    [searchedProperties],
  );
  const fullyOccupiedProperties = useMemo(
    () => searchedProperties.filter((item) => item.stats.total > 0 && item.stats.vacant === 0 && item.stats.taken === item.stats.total),
    [searchedProperties],
  );

  const visibleProperties = useMemo(() => {
    if (propChip === 'vacant') return hasVacantProperties;
    if (propChip === 'occupied') return fullyOccupiedProperties;
    return searchedProperties;
  }, [searchedProperties, hasVacantProperties, fullyOccupiedProperties, propChip]);

  const openPropertyCard = (item: (typeof propertyCards)[number]) => {
    const { property: p, pBuildings, pUnits, pType } = item;
    if (p.structure === 'Individual') {
      // Individual Villa, Shop etc.: is one unit. Tapping the property opens that unit's details directly.
      if ((!pType || !pType.holdsUnits) && pBuildings.length === 0 && pUnits.length === 1) {
        router.push(`/staff/unit/${pUnits[0].id}` as any);
        return;
      }
      // Individual Building: has exactly one building. Skip the building step and open straight to its floors.
      if (pBuildings.length === 1) {
        router.push(`/staff/building/${pBuildings[0].id}` as any);
        return;
      }
    }
    router.push(`/staff/property/${p.id}` as any);
  };

  // ── Units segment ───────────────────────────────────────────────────────────
  const searchedUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    return units
      .filter((u) => locationFilter.matches({ propertyId: u.propertyId, unitId: u.id }, { ignoreUnitLevel: true }))
      .filter((u) => {
        if (!q) return true;
        const prop = propertyById.get(u.propertyId);
        const bld = u.buildingId ? buildingById.get(u.buildingId) : undefined;
        const fl = u.floorZoneId ? floorById.get(u.floorZoneId) : undefined;
        const curLease = currentLeaseByUnit.get(u.id);
        const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
        return [
          u.unitCode,
          u.unitNameEn,
          u.unitNameAr,
          prop?.propertyNameEn,
          prop?.propertyNameAr,
          bld?.buildingNameEn,
          bld?.buildingNameAr,
          fl?.nameEn,
          fl?.nameAr,
          tenant?.displayNameEn,
          tenant?.displayNameAr,
        ].some((v) => v?.toLowerCase().includes(q));
      });
  }, [units, unitSearch, locationFilter, propertyById, buildingById, floorById, currentLeaseByUnit, tenantById]);

  const unitStatusOptions = useMemo(() => {
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
    () => (unitStatusChip === 'all' ? searchedUnits : searchedUnits.filter((u) => u.status === unitStatusChip)),
    [searchedUnits, unitStatusChip],
  );

  // ── Leases segment ──────────────────────────────────────────────────────────
  const searchedLeases = useMemo(() => {
    const q = leaseSearch.trim().toLowerCase();
    return leases
      .filter((l) => locationFilter.matches({ propertyId: l.propertyId, unitId: l.unitId }))
      .filter((l) => {
        if (!q) return true;
        const tenant = tenantById.get(l.tenantId);
        const unit = unitById.get(l.unitId);
        const bld = unit?.buildingId ? buildingById.get(unit.buildingId) : undefined;
        const prop = propertyById.get(l.propertyId);
        return [
          l.leaseNumber,
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
  }, [leases, leaseSearch, locationFilter, tenantById, unitById, buildingById, propertyById]);

  const leaseStatusOptions = useMemo(() => {
    const extra = Array.from(new Set(searchedLeases.map((l) => l.status).filter((s) => s && !BASE_LEASE_STATUSES.includes(s))));
    const allStatuses = [...BASE_LEASE_STATUSES, ...extra];
    return [
      { value: 'all', label: t('staff.filterAll'), count: searchedLeases.length },
      ...allStatuses
        .map((st) => ({
          value: st,
          label: translateLeaseStatus(t, st),
          count: searchedLeases.filter((l) => l.status === st).length,
        }))
        .filter((opt) => opt.count > 0 || opt.value === 'Active' || opt.value === 'Draft' || opt.value === leaseStatusChip),
    ];
  }, [searchedLeases, leaseStatusChip, t]);

  const visibleLeases = useMemo(
    () => (leaseStatusChip === 'all' ? searchedLeases : searchedLeases.filter((l) => l.status === leaseStatusChip)),
    [searchedLeases, leaseStatusChip],
  );

  // ── Tenants segment ─────────────────────────────────────────────────────────
  const searchedTenants = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    return tenants
      .filter((tn) => {
        if (!locationFilter.isFiltered) return true;
        return leases.some(
          (l) =>
            l.tenantId === tn.id &&
            l.status !== 'Cancelled' &&
            locationFilter.matches({ propertyId: l.propertyId, unitId: l.unitId }),
        );
      })
      .filter((tn) => {
        if (!q) return true;
        const curLease = getTenantCurrentLease(tn.id);
        const unit = curLease ? unitById.get(curLease.unitId) : undefined;
        const bld = unit?.buildingId ? buildingById.get(unit.buildingId) : undefined;
        const prop = curLease ? propertyById.get(curLease.propertyId) : undefined;
        return [
          tn.displayNameEn,
          tn.displayNameAr,
          tn.tenantNumber,
          tn.primaryMobile,
          tn.primaryEmail,
          curLease?.leaseNumber,
          unit?.unitCode,
          bld?.buildingNameEn,
          bld?.buildingNameAr,
          prop?.propertyNameEn,
          prop?.propertyNameAr,
        ].some((v) => v?.toLowerCase().includes(q));
      });
  }, [tenants, tenantSearch, locationFilter, leases, getTenantCurrentLease, unitById, buildingById, propertyById]);

  const tenantsWithCurrentLease = useMemo(
    () => searchedTenants.filter((tn) => Boolean(getTenantCurrentLease(tn.id))),
    [searchedTenants, getTenantCurrentLease],
  );
  const tenantsWithoutCurrentLease = useMemo(
    () => searchedTenants.filter((tn) => !getTenantCurrentLease(tn.id)),
    [searchedTenants, getTenantCurrentLease],
  );

  const tenantStatusOptions = useMemo(
    () => [
      { value: 'all' as const, label: t('staff.filterAll'), count: searchedTenants.length },
      { value: 'current' as const, label: t('staff.currentLease'), count: tenantsWithCurrentLease.length },
      { value: 'none' as const, label: t('staff.tenantNoCurrentLease'), count: tenantsWithoutCurrentLease.length },
    ],
    [searchedTenants.length, tenantsWithCurrentLease.length, tenantsWithoutCurrentLease.length, t],
  );

  const visibleTenants = useMemo(() => {
    if (tenantChip === 'current') return tenantsWithCurrentLease;
    if (tenantChip === 'none') return tenantsWithoutCurrentLease;
    return searchedTenants;
  }, [searchedTenants, tenantsWithCurrentLease, tenantsWithoutCurrentLease, tenantChip]);

  return (
    <Screen
      title={t('tabs.properties')}
      action={
        isPropertyConsultant ? (
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('profile.title')}>
            <Avatar name={staffName} size={36} />
          </Pressable>
        ) : undefined
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      onRetry={() => {
        fetchData(false);
      }}>
      <Segmented<Section>
        value={section}
        onChange={setSection}
        options={[
          { value: 'properties', label: t('tabs.properties') },
          { value: 'units', label: t('staff.unitsTab') },
          { value: 'leases', label: t('staff.leasesTab') },
          { value: 'tenants', label: t('staff.tenantsTab') },
        ]}
      />

      {section === 'properties' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar<PropOccupancyChip>
            search={propSearch}
            onSearchChange={setPropSearch}
            placeholder={t('staff.searchProperties')}
            selects={[
              {
                key: 'structure',
                label: t('staff.allStructures'),
                value: propStructure,
                onChange: setPropStructure,
                options: [
                  { value: 'all', label: t('staff.allStructures') },
                  { value: 'Individual', label: translateStructure(t, 'Individual') },
                  { value: 'Group', label: translateStructure(t, 'Group') },
                ],
              },
              ...(propertyTypes.length > 0
                ? [
                    {
                      key: 'propertyType',
                      label: t('staff.allTypes'),
                      value: propTypeId,
                      onChange: setPropTypeId,
                      options: [
                        { value: 'all', label: t('staff.allTypes') },
                        ...propertyTypes.map((pt) => ({
                          value: pt.id,
                          label: byLang(code, pt.nameEn, pt.nameAr),
                        })),
                      ],
                    },
                  ]
                : []),
            ]}
            chips={[
              { value: 'all', label: t('staff.filterAll'), count: searchedProperties.length },
              { value: 'vacant', label: t('staff.hasVacantUnits'), count: hasVacantProperties.length },
              { value: 'occupied', label: t('staff.fullyOccupied'), count: fullyOccupiedProperties.length },
            ]}
            chipValue={propChip}
            onChipChange={setPropChip}
          />

          <View style={{ gap: space.sm }}>
            {visibleProperties.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              visibleProperties.map((item) => {
                const { property: p, stats, pType } = item;
                const propName = byLang(code, p.propertyNameEn, p.propertyNameAr);
                const typeName = pType ? byLang(code, pType.nameEn, pType.nameAr) : undefined;
                const structureLabel = translateStructure(t, p.structure);
                const metaParts = [p.city, typeName, structureLabel].filter(Boolean).join(' • ');
                return (
                  <Card
                    key={p.id}
                    onPress={() => openPropertyCard(item)}
                    style={{ gap: space.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText weight="bold" style={{ flex: 1 }}>
                        {propName}
                      </AppText>
                      <Pill accent="teal" label={p.propertyCode} />
                    </View>
                    {metaParts ? (
                      <AppText variant="caption" tone="secondary" numberOfLines={1}>
                        {metaParts}
                      </AppText>
                    ) : null}
                    <View style={{ gap: 6, marginTop: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }}>
                        <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                          {formatUnitsSummary(stats, t)}
                        </AppText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <AppText variant="caption" weight="semibold" tone="primary">
                            {stats.occupancyPct}%
                          </AppText>
                          <Onward />
                        </View>
                      </View>
                      <ProgressBar percent={stats.occupancyPct} color={palette.success} />
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        </View>
      )}

      {section === 'units' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar
            search={unitSearch}
            onSearchChange={(v) => {
              setUnitSearch(v);
              setUnitLimit(PAGE_STEP);
            }}
            placeholder={t('staff.searchUnits')}
            selects={locationFilter.selectsWithoutUnit}
            chips={unitStatusOptions}
            chipValue={unitStatusChip}
            onChipChange={(v) => {
              setUnitStatusChip(v);
              setUnitLimit(PAGE_STEP);
            }}
          />

          <View style={{ gap: space.sm }}>
            {visibleUnits.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              <>
                {visibleUnits.slice(0, unitLimit).map((u) => {
                  const curLease = currentLeaseByUnit.get(u.id);
                  const tenant = curLease ? tenantById.get(curLease.tenantId) : undefined;
                  const unitTitle = byLang(code, u.unitNameEn || u.unitCode, u.unitNameAr);
                  const placeText = formatCardPlace({ kind: 'unit', unit: u, tenant }, placeCtx);
                  return (
                    <Card
                      key={u.id}
                      onPress={() => router.push(`/staff/unit/${u.id}` as any)}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold" style={{ flex: 1 }}>
                          {u.unitCode}
                          {unitTitle && unitTitle !== u.unitCode ? ` · ${unitTitle}` : ''}
                        </AppText>
                        <Pill accent={unitStatusAccent(u.status)} label={translateUnitStatus(t, u.status)} />
                      </View>
                      {placeText ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                          {placeText}
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
                {visibleUnits.length > unitLimit ? (
                  <Button
                    tone="outline"
                    compact
                    label={t('staff.showMore', { count: visibleUnits.length - unitLimit })}
                    onPress={() => setUnitLimit((n) => n + PAGE_STEP)}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {section === 'leases' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar
            search={leaseSearch}
            onSearchChange={(v) => {
              setLeaseSearch(v);
              setLeaseLimit(PAGE_STEP);
            }}
            placeholder={t('staff.searchLeases')}
            selects={locationFilter.selects}
            chips={leaseStatusOptions}
            chipValue={leaseStatusChip}
            onChipChange={(v) => {
              setLeaseStatusChip(v);
              setLeaseLimit(PAGE_STEP);
            }}
          />

          <View style={{ gap: space.sm }}>
            {visibleLeases.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              <>
                {visibleLeases.slice(0, leaseLimit).map((l) => {
                  const tenant = tenantById.get(l.tenantId);
                  const unit = unitById.get(l.unitId);
                  const prop = propertyById.get(l.propertyId);
                  const subLine = formatCardPlace(
                    { kind: 'record', tenant, unit, property: prop },
                    placeCtx,
                  );
                  return (
                    <Card
                      key={l.id}
                      onPress={() => router.push(`/staff/lease/${l.id}` as any)}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold">{l.leaseNumber}</AppText>
                        <Pill accent={leaseStatusAccent(l.status)} label={translateLeaseStatus(t, l.status)} />
                      </View>
                      {subLine ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                          {subLine}
                        </AppText>
                      ) : null}
                      <AppText variant="bodyLarge" weight="bold" tone="primary">
                        {omr(l.rentAmount, code)} / {translateRentFrequency(t, l.rentFrequency)}
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                        <AppText variant="caption" tone="muted">
                          {l.startDate?.slice(0, 10) ?? '—'} → {l.endDate?.slice(0, 10) ?? '—'}
                        </AppText>
                        <Onward />
                      </View>
                    </Card>
                  );
                })}
                {visibleLeases.length > leaseLimit ? (
                  <Button
                    tone="outline"
                    compact
                    label={t('staff.showMore', { count: visibleLeases.length - leaseLimit })}
                    onPress={() => setLeaseLimit((n) => n + PAGE_STEP)}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {section === 'tenants' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar<TenantLeaseChip>
            search={tenantSearch}
            onSearchChange={(v) => {
              setTenantSearch(v);
              setTenantLimit(PAGE_STEP);
            }}
            placeholder={t('staff.searchTenants')}
            selects={locationFilter.selects}
            chips={tenantStatusOptions}
            chipValue={tenantChip}
            onChipChange={(v) => {
              setTenantChip(v);
              setTenantLimit(PAGE_STEP);
            }}
          />

          <View style={{ gap: space.sm }}>
            {visibleTenants.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              <>
                {visibleTenants.slice(0, tenantLimit).map((tn) => {
                  const curLease = getTenantCurrentLease(tn.id);
                  const unit = curLease ? unitById.get(curLease.unitId) : undefined;
                  const prop = curLease ? propertyById.get(curLease.propertyId) : undefined;
                  const placeLine = curLease
                    ? formatCardPlace(
                        {
                          kind: 'record',
                          lead: curLease.leaseNumber,
                          unit,
                          property: prop,
                        },
                        placeCtx,
                      )
                    : '';
                  return (
                    <Card
                      key={tn.id}
                      onPress={curLease ? () => router.push(`/staff/lease/${curLease.id}` as any) : undefined}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold" style={{ flex: 1 }}>
                          {byLang(code, tn.displayNameEn, tn.displayNameAr)}
                        </AppText>
                        <Pill accent="primary" label={tn.tenantNumber} />
                      </View>
                      {placeLine ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                          {placeLine}
                        </AppText>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }}>
                        <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                          {tn.primaryMobile}{tn.primaryEmail ? ` • ${tn.primaryEmail}` : ''}
                        </AppText>
                        {curLease ? <Onward /> : null}
                      </View>
                    </Card>
                  );
                })}
                {visibleTenants.length > tenantLimit ? (
                  <Button
                    tone="outline"
                    compact
                    label={t('staff.showMore', { count: visibleTenants.length - tenantLimit })}
                    onPress={() => setTenantLimit((n) => n + PAGE_STEP)}
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
