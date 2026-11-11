import { IconPackage, IconPlus, IconSend } from '@tabler/icons-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffInventoryItems,
  getStaffMaterialRequisitions,
  sendStaffMaterialRequisition,
  type StaffInventoryItem,
  type StaffMaterialRequisition,
  type StaffRequisitionStatus,
} from '@/api/staff';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Empty, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr, shortDate } from '@/lib/format';
import { stockLevel, useInventory, type InventoryItem, type MaterialRequest } from '@/mock/inventory';
import { space } from '@/theme/tokens';

const demoStatusAccent = { Pending: 'warning', Approved: 'success', Rejected: 'danger' } as const;
const demoStatusKey = { Pending: 'inventory.pending', Approved: 'inventory.approved', Rejected: 'inventory.rejected' } as const;

const apiStatusAccent: Record<StaffRequisitionStatus, 'primary' | 'success' | 'warning' | 'danger'> = {
  Draft: 'primary',
  InApproval: 'warning',
  Issued: 'success',
  Returned: 'warning',
  Rejected: 'danger',
};

const apiStatusKey: Record<StaffRequisitionStatus, string> = {
  Draft: 'inventory.draft',
  InApproval: 'inventory.inApproval',
  Issued: 'inventory.issued',
  Returned: 'inventory.returned',
  Rejected: 'inventory.rejected',
};

/** Up to 3 decimals for Meter/Kg/Liter, without trailing .000 on whole pieces. */
const formatQty = (v: number) => String(Number(Number(v ?? 0).toFixed(3)));

/** Maintenance: what is in the store, and the materials they have asked for. */
export default function StaffInventory() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { isDemo, permissionsFor } = useAppSession();
  const permissions = permissionsFor('staff/inventory');
  const demo = useInventory();

  const [section, setSection] = useState<'stock' | 'requests'>('stock');
  const [apiItems, setApiItems] = useState<StaffInventoryItem[]>([]);
  const [apiRequisitions, setApiRequisitions] = useState<StaffMaterialRequisition[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadApiData = useCallback(
    async (isRefresh = false) => {
      if (isDemo) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [loadedItems, loadedReqs] = await Promise.all([
          getStaffInventoryItems(),
          getStaffMaterialRequisitions(),
        ]);
        setApiItems(loadedItems);
        setApiRequisitions(loadedReqs);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.errorLoad'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isDemo, t],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isDemo) {
        void loadApiData();
      }
    }, [isDemo, loadApiData]),
  );

  const reloadRequisitionsQuietly = useCallback(() => {
    if (isDemo) return;
    getStaffMaterialRequisitions()
      .then(setApiRequisitions)
      .catch(() => {});
  }, [isDemo]);

  const handleSendForApproval = async (req: StaffMaterialRequisition) => {
    if (sendingId) return;
    setSendingId(req.id);
    setSendError(null);
    try {
      const updated = await sendStaffMaterialRequisition(req.id);
      setApiRequisitions((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
    } catch (e) {
      setSendError(e instanceof Error ? e.message : t('common.errorLoad'));
      reloadRequisitionsQuietly();
    } finally {
      setSendingId(null);
    }
  };

  const itemName = (item?: { nameEn: string; nameAr?: string | null }) =>
    item ? (language.code === 'ar' && item.nameAr ? item.nameAr : item.nameEn) : '';

  const demoById = (id: string) => demo.items.find((i) => i.id === id);
  const apiById = (id: string) => apiItems.find((i) => i.id === id);
  const activeApiItems = apiItems.filter((i) => i.isActive !== false);

  const lineLabel = (l: StaffMaterialRequisition['lines'][number]) => {
    const matched = apiById(l.itemId);
    const label =
      language.code === 'ar'
        ? l.itemNameAr || matched?.nameAr || l.itemNameEn || matched?.nameEn || l.itemCode || ''
        : l.itemNameEn || matched?.nameEn || l.itemCode || '';
    return `${label} × ${formatQty(l.quantity)}`;
  };

  return (
    <Screen
      title={t('tabs.inventory')}
      subtitle={t('inventory.subtitle')}
      loading={!isDemo && loading}
      refreshing={!isDemo && refreshing}
      onRefresh={!isDemo ? () => void loadApiData(true) : undefined}
      error={!isDemo ? error : null}
      onRetry={!isDemo ? () => void loadApiData() : undefined}>
      {isDemo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Pill accent="primary" label={t('staff.sampleDataBadge')} />
          <AppText variant="caption" tone="muted">
            {t('staff.sampleDataNote')}
          </AppText>
        </View>
      ) : null}

      {isDemo || permissions.canAdd ? (
        <Button label={t('inventory.newRequest')} icon={IconPlus} onPress={() => router.push('/staff/requisition/new')} />
      ) : null}

      <Segmented
        value={section}
        onChange={(next) => {
          setSection(next);
          setSendError(null);
        }}
        options={[
          { value: 'stock', label: t('inventory.stock') },
          { value: 'requests', label: t('inventory.requests') },
        ]}
      />

      {section === 'stock' ? (
        isDemo ? (
          <View style={{ gap: space.sm }}>
            {demo.items.map((item: InventoryItem) => {
              const level = stockLevel(item);
              return (
                <Card key={item.id} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                    <AppText weight="bold" style={{ flex: 1 }}>
                      {itemName(item)}
                    </AppText>
                    {level !== 'OK' ? (
                      <Pill accent={level === 'Out' ? 'danger' : 'warning'} label={t(level === 'Out' ? 'inventory.out' : 'inventory.low')} />
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="caption" tone="muted">
                      {item.itemCode}
                    </AppText>
                    <AppText variant="small" weight="semibold" tone={level === 'OK' ? 'secondary' : level === 'Out' ? 'danger' : 'warning'}>
                      {t('inventory.available', { value: `${item.onHand} ${t(`inventory.unit.${item.unit}`)}` })}
                    </AppText>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : activeApiItems.length === 0 ? (
          <Empty icon={IconPackage} title={t('inventory.emptyInventory')} />
        ) : (
          <View style={{ gap: space.sm }}>
            {activeApiItems.map((item) => {
              const level = stockLevel(item);
              const unitText = t(`inventory.unit.${item.unit}`, { defaultValue: item.unit });
              return (
                <Card key={item.id} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                    <AppText weight="bold" style={{ flex: 1 }}>
                      {itemName(item)}
                    </AppText>
                    {level !== 'OK' ? (
                      <Pill accent={level === 'Out' ? 'danger' : 'warning'} label={t(level === 'Out' ? 'inventory.out' : 'inventory.low')} />
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                    <AppText variant="caption" tone="muted">
                      {item.location ? `${item.itemCode} • ${item.location}` : item.itemCode}
                    </AppText>
                    <AppText variant="small" weight="semibold" tone={level === 'OK' ? 'secondary' : level === 'Out' ? 'danger' : 'warning'}>
                      {t('inventory.available', { value: `${formatQty(item.onHand)} ${unitText}` })}
                    </AppText>
                  </View>
                </Card>
              );
            })}
          </View>
        )
      ) : isDemo ? (
        demo.requests.length === 0 ? (
          <Empty icon={IconPackage} title={t('inventory.noRequests')} detail={t('inventory.noRequestsDetail')} />
        ) : (
          <View style={{ gap: space.sm }}>
            <AppText variant="caption" tone="muted">
              {t('inventory.approvalNote')}
            </AppText>
            {demo.requests.map((r: MaterialRequest) => (
              <Card key={r.id} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{r.number}</AppText>
                  <Pill accent={demoStatusAccent[r.status]} label={t(demoStatusKey[r.status])} />
                </View>
                <AppText tone="secondary">
                  {r.lines.map((l) => `${itemName(demoById(l.itemId))} × ${l.quantity}`).join(', ')}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {(r.ticketNumber ?? t('inventory.generalUse'))} • {shortDate(r.requestedAt, language.code)}
                </AppText>
                {r.rejectReason ? (
                  <AppText variant="caption" tone="danger">
                    {t('inventory.reason')}: {r.rejectReason}
                  </AppText>
                ) : null}
              </Card>
            ))}
          </View>
        )
      ) : (
        <View style={{ gap: space.sm }}>
          {sendError ? (
            <Card>
              <AppText tone="danger">{sendError}</AppText>
            </Card>
          ) : null}
          {apiRequisitions.length === 0 ? (
            <Empty icon={IconPackage} title={t('inventory.emptyRequisitions')} detail={t('inventory.noRequestsDetail')} />
          ) : (
            <>
              <AppText variant="caption" tone="muted">
                {t('inventory.approvalNote')}
              </AppText>
              {apiRequisitions.map((r) => (
                <Card key={r.id} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                    <AppText weight="bold">
                      {r.number}
                      {r.approvalReference ? ` · ${r.approvalReference}` : ''}
                    </AppText>
                    <Pill accent={apiStatusAccent[r.status]} label={t(apiStatusKey[r.status])} />
                  </View>
                  <AppText tone="secondary">
                    {r.lines.map(lineLabel).join(', ')}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                    <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                      {(r.ticketNumber ?? t('inventory.generalUse'))}
                      {r.workOrderNumber ? ` • ${r.workOrderNumber}` : ''}
                      {` • ${shortDate(r.createdAtUtc, language.code)}`}
                    </AppText>
                    <AppText variant="small" weight="semibold">
                      {omr(r.totalAmount, language.code)}
                    </AppText>
                  </View>
                  {r.decisionComment ? (
                    <AppText variant="caption" tone={r.status === 'Rejected' ? 'danger' : 'warning'}>
                      {t('inventory.reason')}: {r.decisionComment}
                    </AppText>
                  ) : null}
                  {(r.status === 'Draft' || r.status === 'Returned') && permissions.canEdit ? (
                    <View style={{ marginTop: space.xs }}>
                      <Button
                        compact
                        tone="outline"
                        icon={IconSend}
                        disabled={sendingId === r.id}
                        label={sendingId === r.id ? t('inventory.sending') : t('inventory.sendForApproval')}
                        onPress={() => void handleSendForApproval(r)}
                      />
                    </View>
                  ) : null}
                </Card>
              ))}
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
