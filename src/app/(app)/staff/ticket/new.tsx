import { IconCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  createStaffTicket,
  getStaffProperties,
  getStaffUnits,
  type StaffProperty,
  type StaffUnit,
} from '@/api/staff';
import { Page } from '@/components/page';
import { Button, Card, Field, Select } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function NewTicket() {
  const { t } = useTranslation();

  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState('Air Conditioning');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
  const [description, setDescription] = useState('');
  const [preferredVisitTime, setPreferredVisitTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStaffProperties().catch(() => []),
      getStaffUnits().catch(() => []),
    ]).then(([p, u]) => {
      if (!cancelled) {
        setProperties(p);
        setUnits(u);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePropertyChange = (val: string) => {
    setPropertyId(val);
    // Reset unit if the selected unit does not belong to the newly selected property
    if (val && unitId) {
      const u = units.find((item) => item.id === unitId);
      if (u && u.propertyId !== val) {
        setUnitId('');
      }
    }
  };

  const availableUnits = propertyId
    ? units.filter((u) => u.propertyId === propertyId)
    : units;

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
        preferredVisitTime: preferredVisitTime.trim() || undefined,
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
          options={[
            { label: 'Air Conditioning', value: 'Air Conditioning' },
            { label: 'Plumbing', value: 'Plumbing' },
            { label: 'Electrical', value: 'Electrical' },
            { label: 'Appliances', value: 'Appliances' },
            { label: 'Doors & Carpentry', value: 'Doors & Carpentry' },
            { label: 'Pest Control', value: 'Pest Control' },
            { label: 'Cleaning', value: 'Cleaning' },
            { label: 'Other', value: 'Other' },
          ]}
        />

        <Select
          label={t('staff.priority')}
          value={priority}
          onChange={(v) => setPriority(v as any)}
          options={[
            { label: 'Low', value: 'Low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'High' },
            { label: 'Emergency', value: 'Emergency' },
          ]}
        />

        <Field
          label={t('staff.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="Describe the issue in detail"
        />

        <Field
          label="Preferred Visit Time"
          value={preferredVisitTime}
          onChangeText={setPreferredVisitTime}
          placeholder="e.g. Morning 9:00 - 12:00"
        />
      </Card>
    </Page>
  );
}
