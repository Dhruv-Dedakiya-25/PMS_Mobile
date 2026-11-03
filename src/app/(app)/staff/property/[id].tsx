import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getStaffProperties, getStaffUnits, type StaffProperty, type StaffUnit } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Pill } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const [property, setProperty] = useState<StaffProperty | null>(null);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      getStaffProperties(),
      getStaffUnits(),
    ])
      .then(([allProps, allUnits]) => {
        const p = allProps.find((item) => item.id === id);
        setProperty(p ?? null);
        setUnits(allUnits.filter((u) => u.propertyId === id));
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t('common.errorLoad'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, t]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      getStaffProperties(),
      getStaffUnits(),
    ])
      .then(([allProps, allUnits]) => {
        if (!cancelled) {
          const p = allProps.find((item) => item.id === id);
          setProperty(p ?? null);
          setUnits(allUnits.filter((u) => u.propertyId === id));
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
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  return (
    <Page
      title={property?.propertyNameEn || t('staff.propertyDetails')}
      loading={loading}
      error={error}
      onRetry={() => {
        fetchData();
      }}>
      {property && (
        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="bodyLarge" weight="bold">
                {property.propertyNameEn}
              </AppText>
              <Pill accent="teal" label={property.propertyCode} />
            </View>
            {property.propertyNameAr ? (
              <AppText variant="caption" tone="secondary">
                {property.propertyNameAr}
              </AppText>
            ) : null}
            <AppText tone="secondary">{property.addressLine1}</AppText>
            <AppText variant="caption" tone="muted">
              {property.city ? `${property.city}, ` : ''}{property.countryCode}
            </AppText>
          </Card>

          <View style={{ gap: space.sm }}>
            <AppText variant="bodyLarge" weight="bold">
              {t('staff.unitsTab')} ({units.length})
            </AppText>
            {units.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: space.md }}>
                <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
              </Card>
            ) : (
              units.map((u) => (
                <Card key={u.id} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText weight="bold">{u.unitCode}</AppText>
                    <Pill
                      accent={
                        u.status === 'Occupied'
                          ? 'success'
                          : u.status === 'Vacant'
                          ? 'warning'
                          : 'primary'
                      }
                      label={u.status}
                    />
                  </View>
                  <AppText variant="caption" tone="secondary">
                    {u.bedrooms ?? 0} Beds • {u.bathrooms ?? 0} Baths • {u.areaSqm ?? 0} sqm
                  </AppText>
                </Card>
              ))
            )}
          </View>
        </View>
      )}
    </Page>
  );
}
