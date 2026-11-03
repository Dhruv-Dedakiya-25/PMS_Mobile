import { IconPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffTickets,
  SAMPLE_APPROVALS,
  SAMPLE_STAFF_NOTICES,
  SAMPLE_WORK_ORDERS,
  type SampleApproval,
  type SampleStaffNotice,
  type SampleWorkOrder,
  type StaffTicket,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Onward, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { space } from '@/theme/tokens';

type Section = 'tickets' | 'workOrders' | 'approvals' | 'notices';

export default function StaffOperations() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const [section, setSection] = useState<Section>('tickets');

  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [workOrders] = useState<SampleWorkOrder[]>(SAMPLE_WORK_ORDERS);
  const [approvals] = useState<SampleApproval[]>(SAMPLE_APPROVALS);
  const [notices] = useState<SampleStaffNotice[]>(SAMPLE_STAFF_NOTICES);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    getStaffTickets()
      .then((data) => {
        setTickets(data);
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
    getStaffTickets()
      .then((data) => {
        if (!cancelled) {
          setTickets(data);
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
      title={t('tabs.operations')}
      subtitle={t('staff.operations')}
      action={
        <Button
          label={t('staff.newTicket')}
          icon={IconPlus}
          compact
          onPress={() => router.push('/staff/ticket/new')}
        />
      }
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
          { value: 'tickets', label: t('tabs.tickets') },
          { value: 'workOrders', label: t('staff.workOrders') },
          { value: 'approvals', label: t('staff.approvals') },
          { value: 'notices', label: t('staff.noticesTab') },
        ]}
      />

      {section === 'tickets' && (
        <View style={{ gap: space.sm }}>
          {tickets.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noTicketsFound')}</AppText>
            </Card>
          ) : (
            tickets.map((tk) => (
              <Card
                key={tk.id}
                onPress={() => router.push(`/staff/ticket/${tk.id}` as any)}
                style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{tk.ticketNumber || tk.id.slice(0, 8).toUpperCase()}</AppText>
                  <Pill
                    accent={
                      tk.status === 'Resolved' || tk.status === 'Closed'
                        ? 'success'
                        : tk.status === 'InProgress'
                        ? 'teal'
                        : 'warning'
                    }
                    label={tk.status}
                  />
                </View>
                <AppText numberOfLines={2} tone="secondary">
                  {tk.description}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                  <AppText variant="caption" tone="muted">
                    {tk.category} • {tk.priority}
                  </AppText>
                  <Onward />
                </View>
              </Card>
            ))
          )}
        </View>
      )}

      {section === 'workOrders' && (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Pill accent="primary" label={t('staff.sampleDataBadge')} />
            <AppText variant="caption" tone="muted">
              {t('staff.sampleDataNote')}
            </AppText>
          </View>
          {workOrders.map((wo) => (
            <Card key={wo.id} style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight="bold">{wo.ticketNumber} • {wo.assetName}</AppText>
                <Pill
                  accent={wo.status === 'Completed' ? 'success' : 'warning'}
                  label={wo.status}
                />
              </View>
              <AppText variant="caption" tone="secondary">
                {t('staff.assignedTo')}: {wo.technicianName} • {omr(wo.cost, code)}
              </AppText>
            </Card>
          ))}
        </View>
      )}

      {section === 'approvals' && (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Pill accent="primary" label={t('staff.sampleDataBadge')} />
            <AppText variant="caption" tone="muted">
              {t('staff.sampleDataNote')}
            </AppText>
          </View>
          {approvals.map((ap) => (
            <Card key={ap.id} style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight="bold">{ap.type}</AppText>
                <Pill
                  accent={ap.status === 'Approved' ? 'success' : 'warning'}
                  label={ap.status}
                />
              </View>
              <AppText tone="secondary">{ap.title}</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                <AppText variant="caption" tone="muted">
                  {ap.requester} • {ap.requestedDate}
                </AppText>
                {ap.amount ? (
                  <AppText variant="bodyLarge" weight="bold">
                    {omr(ap.amount, code)}
                  </AppText>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      )}

      {section === 'notices' && (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Pill accent="primary" label={t('staff.sampleDataBadge')} />
            <AppText variant="caption" tone="muted">
              {t('staff.sampleDataNote')}
            </AppText>
          </View>
          {notices.map((n) => (
            <Card
              key={n.id}
              onPress={() => router.push(`/staff/announcement/${n.id}` as any)}
              style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight="bold">{n.title}</AppText>
                <Pill accent="teal" label={n.category} />
              </View>
              <AppText numberOfLines={2} tone="secondary">
                {n.body}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                <AppText variant="caption" tone="muted">
                  {n.date} • {n.target}
                </AppText>
                <Onward />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
