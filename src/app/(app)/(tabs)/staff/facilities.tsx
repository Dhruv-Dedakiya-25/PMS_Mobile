import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffAssets,
  getStaffFacilities,
  getStaffInspections,
  getStaffProperties,
  getStaffUnits,
  SAMPLE_INSPECTIONS,
  type SampleInspection,
  type StaffAsset,
  type StaffFacility,
  type StaffProperty,
  type StaffUnit,
} from '@/api/staff';
import type { InspectionDto, InspectionStatus } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Onward, Pill, SearchFilterBar, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { shortDate } from '@/lib/format';
import { STATUS_ACCENT, STATUS_LABEL, TYPE_LABEL } from '@/lib/inspections';
import {
  byLang,
  PAGE_STEP,
  translateUnitStatus,
  unitSpecsText,
  unitStatusAccent,
} from '@/lib/staff-helpers';
import { space, type Accent } from '@/theme/tokens';

const assetAccent: Record<StaffAsset['status'], Accent> = {
  Operational: 'success', UnderMaintenance: 'warning', Faulty: 'danger', Retired: 'primary',
};

const ASSET_STATUSES: StaffAsset['status'][] = ['Operational', 'UnderMaintenance', 'Faulty', 'Retired'];
const INSPECTION_STATUSES: InspectionStatus[] = ['Scheduled', 'InProgress', 'Completed', 'Cancelled'];
const BASE_UNIT_STATUSES = ['Occupied', 'Vacant', 'NoticePeriod'];

type Section = 'facilities' | 'units' | 'assets' | 'inspections';
type FacChip = 'all' | 'bookable' | 'nonBookable';

export default function StaffFacilities() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('facilities');

  const [facilities, setFacilities] = useState<StaffFacility[]>([]);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [assets, setAssets] = useState<StaffAsset[]>([]);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [inspections] = useState<SampleInspection[]>(SAMPLE_INSPECTIONS);
  const [realInspections, setRealInspections] = useState<InspectionDto[]>([]);
  const [inspectionsError, setInspectionsError] = useState<string | null>(null);

  const { isDemo } = useAppSession();
  const { language } = useLanguage();
  const code = language.code;

  const [propertyId, setPropertyId] = useState('all');

  const [facSearch, setFacSearch] = useState('');
  const [facChip, setFacChip] = useState<FacChip>('all');

  const [unitSearch, setUnitSearch] = useState('');
  const [unitChip, setUnitChip] = useState('all');
  const [unitLimit, setUnitLimit] = useState(PAGE_STEP);

  const [assetSearch, setAssetSearch] = useState('');
  const [assetChip, setAssetChip] = useState<'all' | StaffAsset['status']>('all');

  const [inspSearch, setInspSearch] = useState('');
  const [inspChip, setInspChip] = useState<'all' | InspectionStatus>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInspections = useCallback(() => {
    if (isDemo) return;
    getStaffInspections()
      .then((list) => {
        setRealInspections([...list].sort((a, b) => Number(a.isLocked) - Number(b.isLocked)));
        setInspectionsError(null);
      })
      .catch((e) => setInspectionsError(e instanceof Error ? e.message : t('common.errorLoad')));
  }, [isDemo, t]);

  const fetchData = useCallback(
    (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      Promise.all([
        getStaffFacilities(),
        getStaffUnits(),
        getStaffProperties().catch(() => [] as StaffProperty[]),
      ])
        .then(([facData, unitData, propData]) => {
          setFacilities(facData);
          setUnits(unitData);
          setProperties(propData);
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
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStaffFacilities(),
      getStaffUnits(),
      getStaffProperties().catch(() => [] as StaffProperty[]),
    ])
      .then(([facData, unitData, propData]) => {
        if (!cancelled) {
          setFacilities(facData);
          setUnits(unitData);
          setProperties(propData);
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
  }, [t]);

  const loadAssets = useCallback(() => {
    getStaffAssets()
      .then((list) => {
        setAssets(list);
        setAssetsError(null);
      })
      .catch((e) => setAssetsError(e instanceof Error ? e.message : t('common.errorLoad')));
  }, [t]);

  useEffect(() => {
    loadAssets();
    loadInspections();
  }, [loadAssets, loadInspections]);

  useEffect(() => {
    if (section === 'assets') loadAssets();
    if (section === 'inspections') loadInspections();
  }, [section, loadAssets, loadInspections]);

  const onRefresh = () => {
    fetchData(true);
    loadAssets();
    loadInspections();
  };

  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const propertyOptions = useMemo(
    () => [
      { value: 'all', label: t('staff.allProperties') },
      ...properties.map((p) => ({
        value: p.id,
        label: byLang(code, p.propertyNameEn, p.propertyNameAr),
      })),
    ],
    [properties, code, t],
  );

  // 1) Facilities
  const searchedFacilities = useMemo(() => {
    const q = facSearch.trim().toLowerCase();
    return facilities
      .filter((f) => propertyId === 'all' || f.propertyId === propertyId)
      .filter((f) => !q || [f.nameEn, f.nameAr, f.facilityCode].some((v) => v?.toLowerCase().includes(q)));
  }, [facilities, facSearch, propertyId]);

  const visibleFacilities = useMemo(() => {
    if (facChip === 'bookable') return searchedFacilities.filter((f) => f.bookable);
    if (facChip === 'nonBookable') return searchedFacilities.filter((f) => !f.bookable);
    return searchedFacilities;
  }, [searchedFacilities, facChip]);

  // 2) Units
  const searchedUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    return units
      .filter((u) => propertyId === 'all' || u.propertyId === propertyId)
      .filter((u) => !q || [u.unitCode, u.unitNameEn, u.unitNameAr].some((v) => v?.toLowerCase().includes(q)));
  }, [units, unitSearch, propertyId]);

  const unitStatusChips = useMemo(() => {
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
    () => (unitChip === 'all' ? searchedUnits : searchedUnits.filter((u) => u.status === unitChip)),
    [searchedUnits, unitChip],
  );

  // 3) Assets
  const searchedAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    const chosenProp = propertyId !== 'all' ? propertyById.get(propertyId) : undefined;
    return assets
      .filter((a) => {
        if (propertyId === 'all') return true;
        return a.propertyId === propertyId || (chosenProp && a.propertyName === chosenProp.propertyNameEn);
      })
      .filter((a) => !q || [a.name, a.assetTag, a.category, a.propertyName, a.location].some((v) => v?.toLowerCase().includes(q)));
  }, [assets, assetSearch, propertyId, propertyById]);

  const visibleAssets = useMemo(
    () => (assetChip === 'all' ? searchedAssets : searchedAssets.filter((a) => a.status === assetChip)),
    [searchedAssets, assetChip],
  );

  // 4) Inspections
  const searchedInspections = useMemo(() => {
    const q = inspSearch.trim().toLowerCase();
    return realInspections
      .filter((i) => propertyId === 'all' || i.propertyId === propertyId)
      .filter(
        (i) =>
          !q ||
          [i.number, i.title, i.propertyNameEn, i.unitCode, i.inspectorName].some((v) =>
            v?.toLowerCase().includes(q),
          ),
      );
  }, [realInspections, inspSearch, propertyId]);

  const visibleInspections = useMemo(
    () => (inspChip === 'all' ? searchedInspections : searchedInspections.filter((i) => i.status === inspChip)),
    [searchedInspections, inspChip],
  );

  const propertySelect =
    properties.length > 1
      ? [
          {
            key: 'property',
            label: t('staff.property'),
            value: propertyId,
            onChange: setPropertyId,
            options: propertyOptions,
          },
        ]
      : undefined;

  return (
    <Screen
      title={t('staff.facilities')}
      subtitle={t('staff.viewOnly')}
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
          { value: 'facilities', label: t('tabs.facilities') },
          { value: 'units', label: t('staff.unitsTab') },
          { value: 'assets', label: t('staff.assets') },
          { value: 'inspections', label: t('staff.inspections') },
        ]}
      />

      {section === 'facilities' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar<FacChip>
            search={facSearch}
            onSearchChange={setFacSearch}
            placeholder={t('staff.searchFacilities')}
            selects={propertySelect}
            chips={[
              { value: 'all', label: t('staff.filterAll'), count: searchedFacilities.length },
              { value: 'bookable', label: t('staff.bookable'), count: searchedFacilities.filter((f) => f.bookable).length },
              { value: 'nonBookable', label: t('staff.nonBookable'), count: searchedFacilities.filter((f) => !f.bookable).length },
            ]}
            chipValue={facChip}
            onChipChange={setFacChip}
          />

          <View style={{ gap: space.sm }}>
            {visibleFacilities.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              visibleFacilities.map((fac) => {
                const prop = propertyById.get(fac.propertyId);
                return (
                  <Card key={fac.id} style={{ gap: space.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText weight="bold" style={{ flex: 1 }}>
                        {byLang(code, fac.nameEn, fac.nameAr)}
                      </AppText>
                      <Pill accent={fac.bookable ? 'teal' : 'primary'} label={fac.facilityCode} />
                    </View>
                    {prop ? (
                      <AppText variant="caption" tone="secondary">
                        {byLang(code, prop.propertyNameEn, prop.propertyNameAr)}
                      </AppText>
                    ) : null}
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
            selects={propertySelect}
            chips={unitStatusChips}
            chipValue={unitChip}
            onChipChange={(v) => {
              setUnitChip(v);
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
                {visibleUnits.slice(0, unitLimit).map((unit) => (
                  <Card
                    key={unit.id}
                    onPress={() => router.push(`/staff/unit/${unit.id}` as any)}
                    style={{ gap: space.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText weight="bold">{unit.unitCode}</AppText>
                      <Pill accent={unitStatusAccent(unit.status)} label={translateUnitStatus(t, unit.status)} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="caption" tone="secondary">
                        {unitSpecsText(unit, t)}
                      </AppText>
                      <Onward />
                    </View>
                  </Card>
                ))}
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

      {section === 'assets' && (
        <View style={{ gap: space.md }}>
          <SearchFilterBar
            search={assetSearch}
            onSearchChange={setAssetSearch}
            placeholder={t('staff.searchAssets')}
            selects={propertySelect}
            chips={[
              { value: 'all' as const, label: t('staff.filterAll'), count: searchedAssets.length },
              ...ASSET_STATUSES.map((st) => ({
                value: st,
                label: t(`staff.assetStatus.${st}`),
                count: searchedAssets.filter((a) => a.status === st).length,
              })),
            ]}
            chipValue={assetChip}
            onChipChange={setAssetChip}
          />

          <View style={{ gap: space.sm }}>
            {assetsError || visibleAssets.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <AppText tone={assetsError ? 'danger' : 'secondary'}>{assetsError ?? t('staff.noAssets')}</AppText>
              </Card>
            ) : (
              visibleAssets.map((ast) => (
                <Card key={ast.id} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                    <AppText weight="bold" style={{ flexShrink: 1 }}>{ast.name}</AppText>
                    <Pill accent={assetAccent[ast.status] ?? 'primary'} label={t(`staff.assetStatus.${ast.status}`)} />
                  </View>
                  <AppText variant="caption" tone="secondary">
                    {[ast.assetTag, ast.category, ast.propertyName, ast.location].filter(Boolean).join(' • ')}
                  </AppText>
                </Card>
              ))
            )}
          </View>
        </View>
      )}

      {section === 'inspections' && (
        <View style={{ gap: space.md }}>
          {isDemo ? (
            <View style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Pill accent="primary" label={t('staff.sampleDataBadge')} />
                <AppText variant="caption" tone="muted">
                  {t('staff.sampleDataNote')}
                </AppText>
              </View>
              {inspections.map((ins) => (
                <Card key={ins.id} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText weight="bold">{ins.title}</AppText>
                    <Pill
                      accent={ins.status === 'Passed' ? 'success' : ins.status === 'Scheduled' ? 'teal' : 'warning'}
                      label={ins.status}
                    />
                  </View>
                  <AppText variant="caption" tone="secondary">
                    {ins.scheduledDate} • {ins.inspector}
                  </AppText>
                </Card>
              ))}
            </View>
          ) : (
            <>
              <SearchFilterBar
                search={inspSearch}
                onSearchChange={setInspSearch}
                placeholder={t('staff.searchInspections')}
                selects={propertySelect}
                chips={[
                  { value: 'all' as const, label: t('staff.filterAll'), count: searchedInspections.length },
                  ...INSPECTION_STATUSES.map((st) => ({
                    value: st,
                    label: t(STATUS_LABEL[st]),
                    count: searchedInspections.filter((i) => i.status === st).length,
                  })),
                ]}
                chipValue={inspChip}
                onChipChange={setInspChip}
              />

              <View style={{ gap: space.sm }}>
                {inspectionsError || visibleInspections.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                    <AppText tone={inspectionsError ? 'danger' : 'secondary'}>
                      {inspectionsError ?? t('inspection.noInspections')}
                    </AppText>
                  </Card>
                ) : (
                  visibleInspections.map((ins) => (
                    <Card
                      key={ins.id}
                      onPress={() => router.push(`/staff/inspection/${ins.id}` as any)}
                      style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <AppText weight="bold" style={{ flexShrink: 1 }}>
                          {ins.number} • {ins.title || t(TYPE_LABEL[ins.type])}
                        </AppText>
                        <Pill
                          accent={STATUS_ACCENT[ins.status]}
                          label={t(STATUS_LABEL[ins.status])}
                        />
                      </View>
                      <AppText variant="caption" tone="secondary">
                        {[
                          shortDate(ins.scheduledAtUtc, code),
                          ins.propertyNameEn,
                          ins.unitCode,
                          ins.inspectorName || t('staff.unassigned'),
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </AppText>
                    </Card>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
