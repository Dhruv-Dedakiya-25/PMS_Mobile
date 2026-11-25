import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffAnnouncements,
  getStaffProperties,
  type StaffAnnouncementItem,
  type StaffProperty,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { StaffNoticeCard } from '@/components/staff-notice-card';
import { Button, Card, Pill, SearchFilterBar } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { byLang } from '@/lib/staff-helpers';
import { space } from '@/theme/tokens';

export default function StaffAnnouncements() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const [notices, setNotices] = useState<StaffAnnouncementItem[]>([]);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('all');
  const [categoryChip, setCategoryChip] = useState('all');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStaffAnnouncements(),
      getStaffProperties().catch(() => [] as StaffProperty[]),
    ])
      .then(([items, props]) => {
        if (!cancelled) {
          setNotices(items);
          setProperties(props);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t('common.errorLoad'));
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
  }, [t, retryCount]);

  const handleRetry = () => {
    setLoading(true);
    setLoadError(null);
    setRetryCount((c) => c + 1);
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

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    const chosenProp = propertyId !== 'all' ? propertyById.get(propertyId) : undefined;
    return notices
      .filter((n) => {
        if (propertyId === 'all') return true;
        return n.propertyId === propertyId || (chosenProp && n.target === chosenProp.propertyNameEn);
      })
      .filter(
        (n) =>
          !q ||
          [n.titleEn, n.titleAr, n.bodyEn, n.bodyAr, n.category, n.target].some((v) =>
            v?.toLowerCase().includes(q),
          ),
      );
  }, [notices, search, propertyId, propertyById]);

  const categories = useMemo(
    () => Array.from(new Set(searched.map((n) => n.category || t('staff.general')))),
    [searched, t],
  );

  const visible = useMemo(
    () =>
      categoryChip === 'all'
        ? searched
        : searched.filter((n) => (n.category || t('staff.general')) === categoryChip),
    [searched, categoryChip, t],
  );

  const hasSample = notices.some((n) => n.isSample);

  return (
    <Screen
      title={t('tabs.announcements')}
      subtitle={t('staff.announcements')}
      loading={loading}>
      {loadError ? (
        <Card style={{ gap: space.md, alignItems: 'center', paddingVertical: space.xl }}>
          <IconAlertTriangle size={36} color="#E0413F" />
          <AppText weight="medium" tone="danger" style={{ textAlign: 'center' }}>
            {loadError}
          </AppText>
          <Button
            label={t('common.retry')}
            icon={IconRefresh}
            tone="outline"
            onPress={handleRetry}
          />
        </Card>
      ) : (
        <>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder={t('staff.searchAnnouncements')}
            selects={
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
                : undefined
            }
            chips={[
              { value: 'all', label: t('staff.filterAll'), count: searched.length },
              ...categories.map((cat) => ({
                value: cat,
                label: cat,
                count: searched.filter((n) => (n.category || t('staff.general')) === cat).length,
              })),
            ]}
            chipValue={categoryChip}
            onChipChange={setCategoryChip}
          />

          {hasSample ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Pill accent="primary" label={t('staff.sampleDataBadge')} />
              <AppText variant="caption" tone="muted">
                {t('staff.sampleDataNote')}
              </AppText>
            </View>
          ) : null}

          {visible.length === 0 ? (
            <Card style={{ gap: space.sm, alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noAnnouncements')}</AppText>
            </Card>
          ) : (
            <View style={{ gap: space.sm }}>
              {visible.map((n) => (
                <StaffNoticeCard key={n.id} notice={n} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
