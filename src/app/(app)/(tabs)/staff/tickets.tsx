import { IconPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getStaffTickets, type StaffTicket } from '@/api/staff';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Onward, Pill, Segmented } from '@/components/ui';
import { space } from '@/theme/tokens';

type Filter = 'all' | 'open' | 'inProgress' | 'resolved';

export default function StaffTickets() {
  const { t } = useTranslation();
  const { permissionsFor } = useAppSession();
  const permissions = permissionsFor('staff/tickets');

  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback((isRefresh = false) => {
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
    fetchTickets(true);
  };

  const filteredTickets = tickets.filter((tk) => {
    if (filter === 'open') return tk.status === 'Open';
    if (filter === 'inProgress') return tk.status === 'InProgress' || tk.status === 'OnHold';
    if (filter === 'resolved') return tk.status === 'Resolved' || tk.status === 'Closed';
    return true;
  });

  return (
    <Screen
      title={t('staff.tickets')}
      action={
        permissions.canAdd ? (
          <Button
            label={t('staff.newTicket')}
            icon={IconPlus}
            compact
            onPress={() => router.push('/staff/ticket/new')}
          />
        ) : undefined
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      onRetry={() => {
        fetchTickets(false);
      }}>
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('staff.filterAll') },
          { value: 'open', label: t('staff.filterOpen') },
          { value: 'inProgress', label: t('staff.filterProgress') },
          { value: 'resolved', label: t('staff.filterResolved') },
        ]}
      />

      {filteredTickets.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <AppText tone="secondary">{t('staff.noTicketsFound')}</AppText>
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {filteredTickets.map((tk) => (
            <Card
              key={tk.id}
              onPress={() => router.push(`/staff/ticket/${tk.id}` as any)}
              style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight="bold">{tk.ticketNumber || tk.id.slice(0, 8).toUpperCase()}</AppText>
                <View style={{ flexDirection: 'row', gap: space.xs }}>
                  <Pill
                    accent={
                      tk.priority === 'Emergency'
                        ? 'danger'
                        : tk.priority === 'High'
                        ? 'warning'
                        : 'primary'
                    }
                    label={tk.priority}
                  />
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
              </View>
              <AppText numberOfLines={2} tone="secondary">
                {tk.description}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                <AppText variant="caption" tone="muted">
                  {tk.category} {tk.assignedTo ? `• ${tk.assignedTo}` : ''}
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
