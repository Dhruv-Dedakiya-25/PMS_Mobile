import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffLeases,
  getStaffProperties,
  getStaffTenants,
  getStaffUnits,
  type StaffLease,
  type StaffProperty,
  type StaffTenant,
  type StaffUnit,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Card, Onward, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { space } from '@/theme/tokens';

type Section = 'properties' | 'units' | 'leases' | 'tenants';

export default function StaffProperties() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const [section, setSection] = useState<Section>('properties');

  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [leases, setLeases] = useState<StaffLease[]>([]);
  const [tenants, setTenants] = useState<StaffTenant[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    Promise.all([
      getStaffProperties(),
      getStaffUnits(),
      getStaffLeases(),
      getStaffTenants(),
    ])
      .then(([p, u, l, tn]) => {
        setProperties(p);
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
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStaffProperties(),
      getStaffUnits(),
      getStaffLeases(),
      getStaffTenants(),
    ])
      .then(([p, u, l, tn]) => {
        if (!cancelled) {
          setProperties(p);
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
  }, [t]);

  const onRefresh = () => {
    fetchData(true);
  };

  return (
    <Screen
      title={t('tabs.properties')}
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
        <View style={{ gap: space.sm }}>
          {properties.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            properties.map((p) => (
              <Card
                key={p.id}
                onPress={() => router.push(`/staff/property/${p.id}` as any)}
                style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{p.propertyNameEn}</AppText>
                  <Pill accent="teal" label={p.propertyCode} />
                </View>
                <AppText numberOfLines={1} tone="secondary">
                  {p.addressLine1} {p.city ? `• ${p.city}` : ''}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                  <AppText variant="caption" tone="muted">
                    {p.countryCode}
                  </AppText>
                  <Onward />
                </View>
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
      )}

      {section === 'leases' && (
        <View style={{ gap: space.sm }}>
          {leases.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            leases.map((l) => (
              <Card
                key={l.id}
                onPress={() => router.push(`/staff/lease/${l.id}` as any)}
                style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{l.leaseNumber}</AppText>
                  <Pill
                    accent={
                      l.status === 'Active'
                        ? 'success'
                        : l.status === 'Draft'
                        ? 'primary'
                        : 'warning'
                    }
                    label={l.status}
                  />
                </View>
                <AppText variant="bodyLarge" weight="bold" tone="primary">
                  {omr(l.rentAmount, code)} / {l.rentFrequency}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                  <AppText variant="caption" tone="muted">
                    {l.startDate?.slice(0, 10) ?? '—'} → {l.endDate?.slice(0, 10) ?? '—'}
                  </AppText>
                  <Onward />
                </View>
              </Card>
            ))
          )}
        </View>
      )}

      {section === 'tenants' && (
        <View style={{ gap: space.sm }}>
          {tenants.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            tenants.map((tn) => (
              <Card key={tn.id} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{tn.displayNameEn}</AppText>
                  <Pill accent="primary" label={tn.tenantNumber} />
                </View>
                <AppText variant="caption" tone="secondary">
                  {tn.primaryMobile} {tn.primaryEmail ? `• ${tn.primaryEmail}` : ''}
                </AppText>
              </Card>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}
