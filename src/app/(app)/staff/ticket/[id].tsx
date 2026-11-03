import { IconCheck, IconPackage, IconTrash } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import {
  deleteStaffTicket,
  getStaffProperties,
  getStaffTicket,
  getStaffUnits,
  updateStaffTicket,
  type StaffProperty,
  type StaffTicket,
  type StaffUnit,
} from '@/api/staff';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Field, Pill, Select } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { permissionsFor, isMaintenance } = useAppSession();
  const permissions = permissionsFor('staff/tickets');

  const [ticket, setTicket] = useState<StaffTicket | null>(null);
  const [properties, setProperties] = useState<StaffProperty[]>([]);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [status, setStatus] = useState<string>('Open');
  const [assignedTo, setAssignedTo] = useState<string>('');
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
    ])
      .then(([data, allProps, allUnits]) => {
        setTicket(data);
        setProperties(allProps);
        setUnits(allUnits);
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
  }, [id, t]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      getStaffTicket(id),
      getStaffProperties().catch(() => []),
      getStaffUnits().catch(() => []),
    ])
      .then(([data, allProps, allUnits]) => {
        if (!cancelled) {
          setTicket(data);
          setProperties(allProps);
          setUnits(allUnits);
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
  }, [id, t]);

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

  const handleDelete = () => {
    if (!id || deleting) return;
    Alert.alert(
      t('staff.deleteTicket'),
      t('staff.confirmDelete'),
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t('staff.deleteTicket'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteStaffTicket(id);
              router.back();
            } catch (e) {
              Alert.alert(t('common.errorLoad'), e instanceof Error ? e.message : '');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const propMatch = properties.find((p) => p.id === ticket?.propertyId);
  const unitMatch = units.find((u) => u.id === ticket?.unitId);

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
          {isMaintenance && ticket && (
            <Button
              label={t('inventory.requestMaterials')}
              icon={IconPackage}
              tone="outline"
              onPress={() => router.push({ pathname: '/staff/requisition/new', params: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber } })}
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
              {t('staff.category')}: {ticket.category}
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
            <AppText>{ticket.description}</AppText>
            {ticket.preferredVisitTime ? (
              <AppText variant="caption" tone="muted">
                Visit: {ticket.preferredVisitTime}
              </AppText>
            ) : null}
            <AppText variant="caption" tone="muted">
              {ticket.createdAtUtc?.slice(0, 10)}
            </AppText>
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
