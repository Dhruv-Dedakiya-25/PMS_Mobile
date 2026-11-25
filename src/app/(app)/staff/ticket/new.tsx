import { IconCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  createStaffTicket,
  getStaffBuildings,
  getStaffProperties,
  getStaffServiceCategories,
  getStaffUnits,
  type StaffBuilding,
  type StaffProperty,
  type StaffUnit,
} from '@/api/staff';
import type { ServiceCategoryOptionDto } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { Page } from '@/components/page';
import { Button, Card, Field, Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, weekday } from '@/lib/format';
import { DEFAULT_SERVICE_CATEGORIES, formatServiceCategoryLabel } from '@/lib/service-categories';
import { byLang } from '@/lib/staff-helpers';
import { dateDaysAgo } from '@/mock/clock';
import { space } from '@/theme/tokens';

/** The Building choice for units that sit under no building, such as villas. */
const VILLAS = 'none';

const PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'] as const;

/** Half-hour steps from 07:00 to 20:00 for the visit time. */
const VISIT_TIMES = Array.from({ length: 27 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});

export default function NewTicket() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { isDemo } = useAppSession();

  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [buildings, setBuildings] = useState<StaffBuilding[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOptionDto[]>(DEFAULT_SERVICE_CATEGORIES);
  const [propertyId, setPropertyId] = useState('');
  // Narrows the unit list only; a ticket stores its unit, not its building.
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState(DEFAULT_SERVICE_CATEGORIES[0].nameEn);
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('Medium');
  const [description, setDescription] = useState('');
  // Saved as local "YYYY-MM-DD HH:mm", as the website saves it.
  const [visitDay, setVisitDay] = useState('');
  const [visitTime, setVisitTime] = useState('09:00');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStaffProperties().catch(() => []),
      getStaffBuildings().catch(() => []),
      getStaffUnits().catch(() => []),
      isDemo ? Promise.resolve(DEFAULT_SERVICE_CATEGORIES) : getStaffServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
    ]).then(([p, b, u, cats]) => {
      if (!cancelled) {
        setProperties(p);
        setBuildings(b);
        setUnits(u);
        const list = cats.length > 0 ? cats : DEFAULT_SERVICE_CATEGORIES;
        setCategories(list);
        setCategory((prev) => (list.some((c) => c.nameEn === prev) ? prev : list[0].nameEn));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  // A change higher up clears the choices below it, so a unit from elsewhere can't be sent.
  const handlePropertyChange = (val: string) => {
    setPropertyId(val);
    setBuildingId('');
    setUnitId('');
  };
  const handleBuildingChange = (val: string) => {
    setBuildingId(val);
    setUnitId('');
  };

  const propertyUnits = propertyId ? units.filter((u) => u.propertyId === propertyId) : units;
  const availableBuildings = propertyId ? buildings.filter((b) => b.propertyId === propertyId) : buildings;
  const availableUnits = propertyUnits.filter(
    (u) => !buildingId || (buildingId === VILLAS ? !u.buildingId : u.buildingId === buildingId),
  );

  const handleSubmit = async () => {
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createStaffTicket({
        propertyId: propertyId || undefined,
        unitId: unitId || undefined,
        category,
        priority,
        description: description.trim(),
        preferredVisitTime: visitDay ? `${visitDay} ${visitTime}` : undefined,
        status: 'Open',
        isActive: true,
      });
      router.back();
    } catch (e) {
      Alert.alert(t('common.errorLoad'), e instanceof Error ? e.message : '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page
      title={t('staff.newTicket')}
      footer={
        <Button
          label={t('common.submit')}
          icon={IconCheck}
          disabled={!description.trim() || submitting}
          onPress={() => void handleSubmit()}
        />
      }>
      <Card style={{ gap: space.md }}>
        <Select
          label={t('staff.property')}
          value={propertyId}
          onChange={handlePropertyChange}
          options={[
            { label: `— ${t('common.all')} —`, value: '' },
            ...properties.map((p) => ({
              label: `${p.propertyNameEn} (${p.propertyCode})`,
              value: p.id,
            })),
          ]}
        />

        <Select
          label={t('staff.building')}
          value={buildingId}
          onChange={handleBuildingChange}
          options={[
            { label: `— ${t('common.all')} —`, value: '' },
            ...availableBuildings.map((b) => ({
              label: byLang(language.code, b.buildingNameEn, b.buildingNameAr),
              value: b.id,
            })),
            ...(propertyUnits.some((u) => !u.buildingId) ? [{ label: t('staff.villasOtherSpaces'), value: VILLAS }] : []),
          ]}
        />

        <Select
          label={t('staff.unit')}
          value={unitId}
          onChange={setUnitId}
          options={[
            { label: `— ${t('common.all')} —`, value: '' },
            ...availableUnits.map((u) => ({
              label: u.unitCode,
              value: u.id,
            })),
          ]}
        />

        <Select
          label={t('staff.category')}
          value={category}
          onChange={setCategory}
          options={categories.map((c) => ({
            label: formatServiceCategoryLabel(c, t, language.code),
            value: c.nameEn,
          }))}
        />

        <Select
          label={t('staff.priority')}
          value={priority}
          onChange={setPriority}
          options={PRIORITIES.map((p) => ({ label: t(`staff.priorityLevel.${p}`), value: p }))}
        />

        <Field
          label={t('staff.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder={t('maint.describePlaceholder')}
        />

        <Select
          label={t('staff.preferredVisitTime')}
          value={visitDay}
          onChange={setVisitDay}
          options={[
            { label: '—', value: '' },
            ...Array.from({ length: 14 }, (_, d) => dateDaysAgo(-d)).map((day) => ({
              label: `${weekday(day, language.code)}, ${longDate(day, language.code)}`,
              value: day,
            })),
          ]}
        />
        {visitDay ? (
          <Select
            label={t('fac.time')}
            value={visitTime}
            onChange={setVisitTime}
            options={VISIT_TIMES.map((time) => ({ label: time, value: time }))}
          />
        ) : null}
      </Card>
    </Page>
  );
}
