import { IconCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  createStaffTicket,
  getStaffBuildings,
  getStaffLeases,
  getStaffProperties,
  getStaffServiceCategories,
  getStaffTenants,
  getStaffUnits,
  type StaffBuilding,
  type StaffLease,
  type StaffProperty,
  type StaffTenant,
  type StaffUnit,
} from '@/api/staff';
import type { ServiceCategoryOptionDto } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { Page } from '@/components/page';
import { PlacePicker } from '@/components/place-picker';
import { Button, Card, Field, Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, weekday } from '@/lib/format';
import {
  currentTenantForUnit,
  formatStaffTenantOptionLabel,
  tenantsForPlace,
  type PlaceSelection,
} from '@/lib/place-picker';
import { DEFAULT_SERVICE_CATEGORIES, formatServiceCategoryLabel } from '@/lib/service-categories';
import { dateDaysAgo } from '@/mock/clock';
import { space } from '@/theme/tokens';

const PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'] as const;

/** Half-hour steps from 07:00 to 20:00 for the visit time. */
const VISIT_TIMES = Array.from({ length: 27 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});

export default function NewTicket() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { isDemo, accessTo } = useAppSession();
  const canSeeLeases = accessTo('/staff/lease') !== null;

  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [buildings, setBuildings] = useState<StaffBuilding[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [tenants, setTenants] = useState<StaffTenant[]>([]);
  const [leases, setLeases] = useState<StaffLease[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOptionDto[]>(DEFAULT_SERVICE_CATEGORIES);
  const [place, setPlace] = useState<PlaceSelection>({
    propertyId: '',
    buildingId: '',
    unitId: '',
  });
  const [tenantId, setTenantId] = useState('');
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
      getStaffTenants().catch(() => []),
      canSeeLeases ? getStaffLeases().catch(() => []) : Promise.resolve([] as StaffLease[]),
      isDemo ? Promise.resolve(DEFAULT_SERVICE_CATEGORIES) : getStaffServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
    ]).then(([p, b, u, tn, ls, cats]) => {
      if (!cancelled) {
        setProperties(p);
        setBuildings(b);
        setUnits(u);
        setTenants(tn);
        setLeases(ls);
        const list = cats.length > 0 ? cats : DEFAULT_SERVICE_CATEGORIES;
        setCategories(list);
        setCategory((prev) => (list.some((c) => c.nameEn === prev) ? prev : list[0].nameEn));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isDemo, canSeeLeases]);

  const handlePlaceChange = (
    nextPlace: PlaceSelection,
    changedLevel: 'property' | 'building' | 'unit',
  ) => {
    setPlace(nextPlace);
    if (changedLevel === 'unit') {
      setTenantId(currentTenantForUnit(nextPlace.unitId || undefined, leases) ?? '');
    } else {
      setTenantId('');
    }
  };

  const availableTenants = useMemo(
    () => tenantsForPlace(tenants, leases, units, place, tenantId || undefined),
    [tenants, leases, units, place, tenantId],
  );

  const handleSubmit = async () => {
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createStaffTicket({
        propertyId: place.propertyId || undefined,
        unitId: place.unitId || undefined,
        tenantId: tenantId || undefined,
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
        <PlacePicker
          properties={properties}
          buildings={buildings}
          units={units}
          value={place}
          onChange={handlePlaceChange}
        />

        <Select
          label={t('staff.tenant')}
          value={tenantId}
          onChange={setTenantId}
          options={[
            { label: `— ${t('staff.none')} —`, value: '' },
            ...availableTenants.map((item) => ({
              label: formatStaffTenantOptionLabel(item, language.code),
              value: item.id,
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
