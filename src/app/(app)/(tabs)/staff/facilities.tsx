import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffFacilities,
  getStaffUnits,
  SAMPLE_ASSETS,
  SAMPLE_INSPECTIONS,
  type SampleAsset,
  type SampleInspection,
  type StaffFacility,
  type StaffUnit,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Card, Pill, Segmented } from '@/components/ui';
import { space } from '@/theme/tokens';

type Section = 'facilities' | 'units' | 'assets' | 'inspections';

export default function StaffFacilities() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('facilities');

  const [facilities, setFacilities] = useState<StaffFacility[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [assets] = useState<SampleAsset[]>(SAMPLE_ASSETS);
  const [inspections] = useState<SampleInspection[]>(SAMPLE_INSPECTIONS);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    Promise.all([
      getStaffFacilities(),
      getStaffUnits(),
    ])
      .then(([facData, unitData]) => {
        setFacilities(facData);
        setUnits(unitData);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t('common.errorLoad'));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStaffFacilities(),
      getStaffUnits(),
    ])
      .then(([facData, unitData]) => {
        if (!cancelled) {
          setFacilities(facData);
          setUnits(unitData);
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

  const onRefresh = () => {
    fetchData(true);
  };

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
        <View style={{ gap: space.sm }}>
          {facilities.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            facilities.map((fac) => (
              <Card key={fac.id} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{fac.nameEn}</AppText>
                  <Pill accent={fac.bookable ? 'teal' : 'primary'} label={fac.facilityCode} />
                </View>
                {fac.nameAr ? (
                  <AppText variant="caption" tone="secondary">
                    {fac.nameAr}
                  </AppText>
                ) : null}
              </Card>
            ))
          )}
        </View>
      )}

      {section === 'units' && (
        <View style={{ gap: space.sm }}>
          {units.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            units.map((unit) => (
              <Card key={unit.id} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{unit.unitCode}</AppText>
                  <Pill
                    accent={
                      unit.status === 'Occupied'
                        ? 'success'
                        : unit.status === 'Vacant'
                        ? 'warning'
                        : 'primary'
                    }
                    label={unit.status}
                  />
                </View>
                <AppText variant="caption" tone="secondary">
                  {unit.bedrooms ?? 0} Beds • {unit.bathrooms ?? 0} Baths • {unit.areaSqm ?? 0} sqm
                </AppText>
              </Card>
            ))
          )}
        </View>
      )}

      {section === 'assets' && (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Pill accent="primary" label={t('staff.sampleDataBadge')} />
            <AppText variant="caption" tone="muted">
              {t('staff.sampleDataNote')}
            </AppText>
          </View>
          {assets.map((ast) => (
            <Card key={ast.id} style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight="bold">{ast.name}</AppText>
                <Pill
                  accent={ast.status === 'Operational' ? 'success' : 'danger'}
                  label={ast.status}
                />
              </View>
              <AppText variant="caption" tone="secondary">
                {ast.code} • {ast.category} • {ast.location}
              </AppText>
            </Card>
          ))}
        </View>
      )}

      {section === 'inspections' && (
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
      )}
    </Screen>
  );
}
