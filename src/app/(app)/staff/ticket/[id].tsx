import { IconCheck, IconPackage, IconTrash } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Platform, View } from 'react-native';

import {
  deleteStaffTicket,
  getStaffProperties,
  getStaffServiceCategories,
  getStaffTenants,
  getStaffTicket,
  getStaffTicketPhotoUris,
  getStaffUnits,
  updateStaffTicket,
  type StaffProperty,
  type StaffTenant,
  type StaffTicket,
  type StaffUnit,
} from '@/api/staff';
import type { ServiceCategoryOptionDto } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Field, Pill, Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { dateTime, longDate } from '@/lib/format';
import { formatStaffTenantOptionLabel } from '@/lib/place-picker';
import { DEFAULT_SERVICE_CATEGORIES, formatTicketCategory } from '@/lib/service-categories';
import { radius, space } from '@/theme/tokens';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { permissionsFor, isMaintenance, isDemo } = useAppSession();
  const permissions = permissionsFor('staff/tickets');
  const canRequestMaterials = isDemo ? isMaintenance : permissionsFor('staff/requisition').canAdd;

  const [ticket, setTicket] = useState<StaffTicket | null>(null);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [tenants, setTenants] = useState<StaffTenant[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOptionDto[]>(DEFAULT_SERVICE_CATEGORIES);
  const [status, setStatus] = useState<string>('Open');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      getStaffTicket(id),
      getStaffProperties().catch(() => []),
      getStaffUnits().catch(() => []),
      getStaffTenants().catch(() => []),
      getStaffTicketPhotoUris(id).catch(() => [] as string[]),
      isDemo ? Promise.resolve(DEFAULT_SERVICE_CATEGORIES) : getStaffServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
    ])
      .then(([data, allProps, allUnits, allTenants, ticketPhotos, cats]) => {
        setTicket(data);
        setProperties(allProps);
        setUnits(allUnits);
        setTenants(allTenants);
        setPhotos(ticketPhotos);
        if (cats.length > 0) setCategories(cats);
        setStatus(data.status || 'Open');
        setAssignedTo(data.assignedTo || '');
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t('common.errorLoad'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isDemo, t]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      getStaffTicket(id),
      getStaffProperties().catch(() => []),
      getStaffUnits().catch(() => []),
      getStaffTenants().catch(() => []),
      getStaffTicketPhotoUris(id).catch(() => [] as string[]),
      isDemo ? Promise.resolve(DEFAULT_SERVICE_CATEGORIES) : getStaffServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
    ])
      .then(([data, allProps, allUnits, allTenants, ticketPhotos, cats]) => {
        if (!cancelled) {
          setTicket(data);
          setProperties(allProps);
          setUnits(allUnits);
          setTenants(allTenants);
          setPhotos(ticketPhotos);
          if (cats.length > 0) setCategories(cats);
          setStatus(data.status || 'Open');
          setAssignedTo(data.assignedTo || '');
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
  }, [id, isDemo, t]);

  const handleSave = async () => {
    if (!id || !ticket || saving) return;
    setSaving(true);
    try {
      await updateStaffTicket(id, {
        ...ticket,
        status: status as any,
        assignedTo: assignedTo.trim() || undefined,
      });
      router.back();
    } catch (e) {
      Alert.alert(t('common.errorLoad'), e instanceof Error ? e.message : '');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      await deleteStaffTicket(id);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/staff/operations');
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert(e instanceof Error ? e.message : t('common.errorLoad'));
      } else {
        Alert.alert(t('common.errorLoad'), e instanceof Error ? e.message : '');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!id || deleting) return;
    if (Platform.OS === 'web') {
      if (window.confirm(t('staff.confirmDelete'))) {
        void doDelete();
      }
      return;
    }
    Alert.alert(
      t('staff.deleteTicket'),
      t('staff.confirmDelete'),
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t('staff.deleteTicket'),
          style: 'destructive',
          onPress: () => void doDelete(),
        },
      ],
    );
  };

  const propMatch = properties.find((p) => p.id === ticket?.propertyId);
  const unitMatch = units.find((u) => u.id === ticket?.unitId);
  const tenantMatch = tenants.find((tn) => tn.id === ticket?.tenantId);

  return (
    <Page
      title={ticket?.ticketNumber || t('staff.ticketDetails')}
      loading={loading}
      error={error}
      onRetry={() => {
        fetchTicket();
      }}
      footer={
        <View style={{ gap: space.sm }}>
          {permissions.canEdit && (
            <Button
              label={t('staff.saveChanges')}
              icon={IconCheck}
              disabled={saving || deleting}
              onPress={() => void handleSave()}
            />
          )}
          {canRequestMaterials && ticket && (
            <Button
              label={t('inventory.requestMaterials')}
              icon={IconPackage}
              tone="outline"
              onPress={() =>
                router.push({
                  pathname: '/staff/requisition/new',
                  params: {
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    propertyId: ticket.propertyId ?? '',
                  },
                })
              }
            />
          )}
          {permissions.canDelete && (
            <Button
              label={t('staff.deleteTicket')}
              icon={IconTrash}
              tone="danger"
              disabled={saving || deleting}
              onPress={handleDelete}
            />
          )}
        </View>
      }>
      {ticket && (
        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="bodyLarge" weight="bold">
                {ticket.ticketNumber}
              </AppText>
              <Pill
                accent={
                  ticket.priority === 'Emergency'
                    ? 'danger'
                    : ticket.priority === 'High'
                    ? 'warning'
                    : 'primary'
                }
                label={ticket.priority}
              />
            </View>
            <AppText variant="caption" tone="secondary">
              {t('staff.category')}: {formatTicketCategory(ticket.category, categories, t, language.code)}
            </AppText>
            {propMatch ? (
              <AppText variant="caption" tone="secondary">
                {t('staff.property')}: {propMatch.propertyNameEn} ({propMatch.propertyCode})
              </AppText>
            ) : null}
            {unitMatch ? (
              <AppText variant="caption" tone="secondary">
                {t('staff.unit')}: {unitMatch.unitCode}
              </AppText>
            ) : null}
            {tenantMatch ? (
              <AppText variant="caption" tone="secondary">
                {t('staff.tenant')}: {formatStaffTenantOptionLabel(tenantMatch, language.code)}
              </AppText>
            ) : null}
            <AppText>{ticket.description}</AppText>
            {photos.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} accessibilityLabel={t('maint.photos')} style={{ width: 72, height: 72, borderRadius: radius.md }} />
                ))}
              </View>
            ) : null}
            {ticket.preferredVisitTime ? (
              <AppText variant="caption" tone="muted">
                {/^\d{4}-\d{2}-\d{2}/.test(ticket.preferredVisitTime)
                  ? t('maint.visitOn', { date: `${longDate(ticket.preferredVisitTime, language.code)}, ${ticket.preferredVisitTime.slice(11, 16)}` })
                  : ticket.preferredVisitTime}
              </AppText>
            ) : null}
            <AppText variant="caption" tone="muted">
              {ticket.createdAtUtc?.slice(0, 10)}
            </AppText>
            {ticket.resolutionDueUtc ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm }}>
                <AppText variant="caption" tone={ticket.isOverdue ? 'danger' : 'secondary'}>
                  {ticket.status === 'Open' && !ticket.firstResponseAtUtc && ticket.responseDueUtc
                    ? t('staff.respondBy', { time: dateTime(ticket.responseDueUtc, language.code) })
                    : t('staff.resolveBy', { time: dateTime(ticket.resolutionDueUtc, language.code) })}
                </AppText>
                {ticket.isOverdue ? <Pill accent="danger" label={t('staff.ticketOverdue')} /> : null}
              </View>
            ) : null}
          </Card>

          {permissions.canEdit ? (
            <Card style={{ gap: space.md }}>
              <AppText variant="bodyLarge" weight="bold">
                {t('staff.editTicket')}
              </AppText>
              <Select
                label={t('staff.status')}
                value={status}
                onChange={setStatus}
                options={[
                  { label: 'Open', value: 'Open' },
                  { label: 'In Progress', value: 'InProgress' },
                  { label: 'On Hold', value: 'OnHold' },
                  { label: 'Resolved', value: 'Resolved' },
                  { label: 'Closed', value: 'Closed' },
                ]}
              />
              <Field
                label={t('staff.assignedTo')}
                value={assignedTo}
                onChangeText={setAssignedTo}
                placeholder="Technician name"
              />
            </Card>
          ) : null}
        </View>
      )}
    </Page>
  );
}
