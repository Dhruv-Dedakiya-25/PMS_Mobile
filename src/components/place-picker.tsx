import { useTranslation } from 'react-i18next';
import type { StaffBuilding, StaffProperty, StaffUnit } from '@/api/staff';
import { Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import {
  VILLAS,
  buildingOptionsForProperty,
  formatStaffPropertyOptionLabel,
  unitOptionsForPlace,
  type PlaceSelection,
} from '@/lib/place-picker';

export interface PlacePickerProps {
  properties: readonly StaffProperty[];
  buildings: readonly StaffBuilding[];
  units: readonly StaffUnit[];
  value: PlaceSelection;
  onChange: (next: PlaceSelection, changedLevel: 'property' | 'building' | 'unit') => void;
}

/**
 * Shared Property → Building → Unit drill-down picker for staff forms (New Ticket, Record Payment).
 * Includes "Villas & other spaces" (VILLAS = 'none') when the property has units outside any building,
 * and clears levels below a change.
 */
export function PlacePicker({
  properties,
  buildings,
  units,
  value,
  onChange,
}: PlacePickerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const buildingOptions = buildingOptionsForProperty(
    value.propertyId,
    buildings,
    units,
    language.code,
    t('staff.villasOtherSpaces'),
  );
  const availableUnits = unitOptionsForPlace(value.propertyId, value.buildingId, units);

  const handlePropertyChange = (propertyId: string) => {
    onChange({ propertyId, buildingId: '', unitId: '' }, 'property');
  };

  const handleBuildingChange = (buildingId: string) => {
    onChange({ propertyId: value.propertyId, buildingId, unitId: '' }, 'building');
  };

  const handleUnitChange = (unitId: string) => {
    if (!unitId) {
      onChange({ propertyId: value.propertyId, buildingId: value.buildingId, unitId: '' }, 'unit');
      return;
    }
    const unit = units.find((u) => u.id === unitId);
    onChange(
      {
        propertyId: unit?.propertyId ?? value.propertyId,
        buildingId: value.buildingId || (unit ? unit.buildingId || VILLAS : ''),
        unitId,
      },
      'unit',
    );
  };

  return (
    <>
      <Select
        label={t('staff.property')}
        value={value.propertyId}
        onChange={handlePropertyChange}
        options={[
          { label: `— ${t('common.all')} —`, value: '' },
          ...properties.map((p) => ({
            label: formatStaffPropertyOptionLabel(p, language.code),
            value: p.id,
          })),
        ]}
      />

      <Select
        label={t('staff.building')}
        value={value.buildingId}
        onChange={handleBuildingChange}
        options={[
          { label: `— ${t('common.all')} —`, value: '' },
          ...buildingOptions,
        ]}
      />

      <Select
        label={t('staff.unit')}
        value={value.unitId}
        onChange={handleUnitChange}
        options={[
          { label: `— ${t('common.all')} —`, value: '' },
          ...availableUnits.map((u) => ({
            label: u.unitCode,
            value: u.id,
          })),
        ]}
      />
    </>
  );
}
