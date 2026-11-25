import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  StaffBuilding,
  StaffFloorZone,
  StaffProperty,
  StaffPropertyType,
  StaffUnit,
} from '@/api/staff';
import type { FilterSelectConfig } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { byLang } from '@/lib/staff-helpers';

export interface UseLocationFilterParams {
  properties: StaffProperty[];
  propertyTypes: StaffPropertyType[];
  buildings: StaffBuilding[];
  floorZones: StaffFloorZone[];
  units: StaffUnit[];
  onChange?: () => void;
}

export interface LocationMatchTarget {
  propertyId?: string | null;
  unitId?: string | null;
}

export interface LocationMatchOptions {
  /** True on the Units list, where the 4th-level Unit dropdown is hidden. */
  ignoreUnitLevel?: boolean;
}

function getFloorTreeIds(rootFloorId: string, allFloors: StaffFloorZone[]): Set<string> {
  const ids = new Set<string>([rootFloorId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of allFloors) {
      if (f.parentFloorZoneId && ids.has(f.parentFloorZoneId) && !ids.has(f.id)) {
        ids.add(f.id);
        added = true;
      }
    }
  }
  return ids;
}

/**
 * Shared cascading location filter (Property -> Building / Villa -> Floor -> Unit) for staff lists.
 * Returns dropdowns in the shape SearchFilterBar's `selects` prop expects and a `matches` predicate.
 */
export function useLocationFilter({
  properties,
  propertyTypes,
  buildings,
  floorZones,
  units,
  onChange,
}: UseLocationFilterParams) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;

  const [propertyId, setPropertyId] = useState('all');
  const [buildingOrVilla, setBuildingOrVilla] = useState('all');
  const [floorId, setFloorId] = useState('all');
  const [unitId, setUnitId] = useState('all');

  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const propertyTypeById = useMemo(() => new Map(propertyTypes.map((pt) => [pt.id, pt])), [propertyTypes]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  const handlePropertyChange = useCallback(
    (v: string) => {
      setPropertyId(v);
      setBuildingOrVilla('all');
      setFloorId('all');
      setUnitId('all');
      onChange?.();
    },
    [onChange],
  );

  const handleBuildingOrVillaChange = useCallback(
    (v: string) => {
      setBuildingOrVilla(v);
      setFloorId('all');
      setUnitId('all');
      onChange?.();
    },
    [onChange],
  );

  const handleFloorChange = useCallback(
    (v: string) => {
      setFloorId(v);
      setUnitId('all');
      onChange?.();
    },
    [onChange],
  );

  const handleUnitChange = useCallback(
    (v: string) => {
      setUnitId(v);
      onChange?.();
    },
    [onChange],
  );

  const reset = useCallback(() => {
    setPropertyId('all');
    setBuildingOrVilla('all');
    setFloorId('all');
    setUnitId('all');
    onChange?.();
  }, [onChange]);

  // Property level: auto-pick and hide if there is only one property
  const validPropertyId = useMemo(() => {
    if (propertyId === 'all') return 'all';
    return properties.some((p) => p.id === propertyId) ? propertyId : 'all';
  }, [properties, propertyId]);

  const effectivePropertyId = useMemo(() => {
    if (properties.length === 1) return properties[0].id;
    return validPropertyId;
  }, [properties, validPropertyId]);

  // Building / villa level: buildings first, then loose units (no buildingId) with code and type
  const level2Choices = useMemo(() => {
    if (effectivePropertyId === 'all') return [];
    const prop = propertyById.get(effectivePropertyId);
    const propBuildings = buildings.filter((b) => b.propertyId === effectivePropertyId);
    const looseUnits = units
      .filter((u) => u.propertyId === effectivePropertyId && !u.buildingId)
      .sort((a, b) => a.unitCode.localeCompare(b.unitCode, undefined, { numeric: true }));

    const bldOptions = propBuildings.map((b) => ({
      value: `bld:${b.id}`,
      label: byLang(code, b.buildingNameEn, b.buildingNameAr),
    }));

    const unitOptions = looseUnits.map((u) => {
      const pt =
        (u.propertyTypeId ? propertyTypeById.get(u.propertyTypeId) : undefined) ??
        (prop?.propertyTypeId ? propertyTypeById.get(prop.propertyTypeId) : undefined);
      const typeName = pt ? byLang(code, pt.nameEn, pt.nameAr) : '';
      return {
        value: `unit:${u.id}`,
        label: typeName ? `${u.unitCode} · ${typeName}` : u.unitCode,
      };
    });

    return [...bldOptions, ...unitOptions];
  }, [effectivePropertyId, propertyById, buildings, units, propertyTypeById, code]);

  const validBuildingOrVilla = useMemo(() => {
    if (buildingOrVilla === 'all') return 'all';
    return level2Choices.some((c) => c.value === buildingOrVilla) ? buildingOrVilla : 'all';
  }, [level2Choices, buildingOrVilla]);

  const effectiveBuildingOrVilla = useMemo(() => {
    if (effectivePropertyId === 'all') return 'all';
    if (level2Choices.length === 1) return level2Choices[0].value;
    return validBuildingOrVilla;
  }, [effectivePropertyId, level2Choices, validBuildingOrVilla]);

  const activeBuildingId = useMemo(
    () => (effectiveBuildingOrVilla.startsWith('bld:') ? effectiveBuildingOrVilla.slice(4) : null),
    [effectiveBuildingOrVilla],
  );

  // Floor level: top-level floor zones of the active building, sorted by floorNumber then sortOrder
  const buildingFloors = useMemo(
    () => (activeBuildingId ? floorZones.filter((f) => f.buildingId === activeBuildingId) : []),
    [activeBuildingId, floorZones],
  );

  const floorChoices = useMemo(() => {
    if (!activeBuildingId) return [];
    return buildingFloors
      .filter((f) => !f.parentFloorZoneId)
      .sort(
        (a, b) =>
          (a.floorNumber ?? a.sortOrder ?? 0) - (b.floorNumber ?? b.sortOrder ?? 0) ||
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      )
      .map((f) => ({
        value: f.id,
        label: byLang(code, f.nameEn, f.nameAr),
      }));
  }, [activeBuildingId, buildingFloors, code]);

  const validFloorId = useMemo(() => {
    if (floorId === 'all') return 'all';
    return floorChoices.some((c) => c.value === floorId) ? floorId : 'all';
  }, [floorChoices, floorId]);

  const floorAutoPicked = activeBuildingId !== null && floorChoices.length === 1;

  const effectiveFloorId = useMemo(() => {
    if (!activeBuildingId) return 'all';
    if (floorChoices.length === 1) return floorChoices[0].value;
    return validFloorId;
  }, [activeBuildingId, floorChoices, validFloorId]);

  const allowedFloorIds = useMemo(() => {
    if (!activeBuildingId || effectiveFloorId === 'all') return null;
    return getFloorTreeIds(effectiveFloorId, buildingFloors);
  }, [activeBuildingId, effectiveFloorId, buildingFloors]);

  // Unit level: units of the active building, narrowed to the floor (and its sub-zones) if picked
  const unitChoices = useMemo(() => {
    if (!activeBuildingId) return [];
    const candidateUnits = units
      .filter((u) => {
        if (u.buildingId !== activeBuildingId) return false;
        if (!allowedFloorIds) return true;
        if (floorAutoPicked && !u.floorZoneId) return true;
        return Boolean(u.floorZoneId && allowedFloorIds.has(u.floorZoneId));
      })
      .sort((a, b) => a.unitCode.localeCompare(b.unitCode, undefined, { numeric: true }));

    return candidateUnits.map((u) => {
      const uName = byLang(code, u.unitNameEn, u.unitNameAr);
      return {
        value: u.id,
        label: uName && uName !== u.unitCode ? `${u.unitCode} · ${uName}` : u.unitCode,
      };
    });
  }, [activeBuildingId, units, allowedFloorIds, floorAutoPicked, code]);

  const validUnitId = useMemo(() => {
    if (unitId === 'all') return 'all';
    return unitChoices.some((c) => c.value === unitId) ? unitId : 'all';
  }, [unitChoices, unitId]);

  const effectiveUnitId = useMemo(() => {
    if (!activeBuildingId) return 'all';
    if (unitChoices.length === 1) return unitChoices[0].value;
    return validUnitId;
  }, [activeBuildingId, unitChoices, validUnitId]);

  // Build dropdown configs for SearchFilterBar
  const selects = useMemo<FilterSelectConfig[]>(() => {
    const list: FilterSelectConfig[] = [];

    if (properties.length > 1) {
      list.push({
        key: 'property',
        label: t('staff.allProperties'),
        value: validPropertyId,
        onChange: handlePropertyChange,
        options: [
          { value: 'all', label: t('staff.allProperties') },
          ...properties.map((p) => ({
            value: p.id,
            label: byLang(code, p.propertyNameEn, p.propertyNameAr),
          })),
        ],
      });
    }

    if (effectivePropertyId !== 'all' && level2Choices.length > 1) {
      list.push({
        key: 'building',
        label: t('staff.allBuildingsAndVillas'),
        value: validBuildingOrVilla,
        onChange: handleBuildingOrVillaChange,
        options: [{ value: 'all', label: t('staff.allBuildingsAndVillas') }, ...level2Choices],
      });
    }

    if (activeBuildingId && floorChoices.length > 1) {
      list.push({
        key: 'floor',
        label: t('staff.allFloors'),
        value: validFloorId,
        onChange: handleFloorChange,
        options: [{ value: 'all', label: t('staff.allFloors') }, ...floorChoices],
      });
    }

    if (activeBuildingId && unitChoices.length > 1) {
      list.push({
        key: 'unit',
        label: t('staff.allUnits'),
        value: validUnitId,
        onChange: handleUnitChange,
        options: [{ value: 'all', label: t('staff.allUnits') }, ...unitChoices],
      });
    }

    return list;
  }, [
    properties,
    validPropertyId,
    handlePropertyChange,
    effectivePropertyId,
    level2Choices,
    validBuildingOrVilla,
    handleBuildingOrVillaChange,
    activeBuildingId,
    floorChoices,
    validFloorId,
    handleFloorChange,
    unitChoices,
    validUnitId,
    handleUnitChange,
    code,
    t,
  ]);

  const selectsWithoutUnit = useMemo(
    () => selects.filter((s) => s.key !== 'unit'),
    [selects],
  );

  // True when the user has explicitly narrowed below the property level (hides property-only AdHoc records)
  const hasSubPropertyChoice =
    validBuildingOrVilla !== 'all' || validFloorId !== 'all' || validUnitId !== 'all';

  const isFiltered = effectivePropertyId !== 'all' || hasSubPropertyChoice;

  const matches = useCallback(
    (target: LocationMatchTarget, options?: LocationMatchOptions): boolean => {
      if (effectivePropertyId === 'all') {
        return true;
      }

      if (target.unitId) {
        const unit = unitById.get(target.unitId);
        if (!unit) {
          return target.propertyId === effectivePropertyId && !hasSubPropertyChoice;
        }
        if (unit.propertyId !== effectivePropertyId) return false;

        if (effectiveBuildingOrVilla !== 'all') {
          if (effectiveBuildingOrVilla.startsWith('bld:')) {
            const bldId = effectiveBuildingOrVilla.slice(4);
            if (unit.buildingId !== bldId) return false;
          } else if (effectiveBuildingOrVilla.startsWith('unit:')) {
            const targetUnitId = effectiveBuildingOrVilla.slice(5);
            if (unit.id !== targetUnitId) return false;
          }
        }

        if (effectiveFloorId !== 'all' && allowedFloorIds) {
          if (floorAutoPicked && !unit.floorZoneId) {
            // Allow unfloored unit when the building's single floor was auto-picked
          } else if (!unit.floorZoneId || !allowedFloorIds.has(unit.floorZoneId)) {
            return false;
          }
        }

        if (!options?.ignoreUnitLevel && effectiveUnitId !== 'all') {
          if (unit.id !== effectiveUnitId) return false;
        }

        return true;
      }

      // Record has no unitId (e.g. a one-off AdHoc invoice or property-level receipt):
      // Show it when only a property is chosen; hide it once a building, floor or unit is chosen.
      if (target.propertyId !== effectivePropertyId) return false;
      if (hasSubPropertyChoice) return false;
      return true;
    },
    [
      effectivePropertyId,
      effectiveBuildingOrVilla,
      effectiveFloorId,
      effectiveUnitId,
      allowedFloorIds,
      floorAutoPicked,
      hasSubPropertyChoice,
      unitById,
    ],
  );

  return {
    selects,
    selectsWithoutUnit,
    matches,
    isFiltered,
    reset,
  };
}
