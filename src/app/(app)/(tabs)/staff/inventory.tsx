import { IconPackage, IconPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Empty, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { shortDate } from '@/lib/format';
import { stockLevel, useInventory, type InventoryItem, type MaterialRequest } from '@/mock/inventory';
import { space } from '@/theme/tokens';

const statusAccent = { Pending: 'warning', Approved: 'success', Rejected: 'danger' } as const;
const statusKey = { Pending: 'inventory.pending', Approved: 'inventory.approved', Rejected: 'inventory.rejected' } as const;

/** Maintenance: what is in the store, and the materials they have asked for. */
export default function StaffInventory() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { items, requests } = useInventory();
  const [section, setSection] = useState<'stock' | 'requests'>('stock');
  const name = (item?: InventoryItem) => (item ? (language.code === 'ar' && item.nameAr ? item.nameAr : item.nameEn) : '');
  const byId = (id: string) => items.find((i) => i.id === id);

  return (
    <Screen title={t('tabs.inventory')} subtitle={t('inventory.subtitle')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <Pill accent="primary" label={t('staff.sampleDataBadge')} />
        <AppText variant="caption" tone="muted">
          {t('staff.sampleDataNote')}
        </AppText>
      </View>

      <Button label={t('inventory.newRequest')} icon={IconPlus} onPress={() => router.push('/staff/requisition/new')} />

      <Segmented
        value={section}
        onChange={setSection}
        options={[
          { value: 'stock', label: t('inventory.stock') },
          { value: 'requests', label: t('inventory.requests') },
        ]}
      />

      {section === 'stock' ? (
        <View style={{ gap: space.sm }}>
          {items.map((item) => {
            const level = stockLevel(item);
            return (
              <Card key={item.id} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                  <AppText weight="bold" style={{ flex: 1 }}>
                    {name(item)}
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
      ) : requests.length === 0 ? (
        <Empty icon={IconPackage} title={t('inventory.noRequests')} detail={t('inventory.noRequestsDetail')} />
      ) : (
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" tone="muted">
            {t('inventory.approvalNote')}
          </AppText>
          {requests.map((r: MaterialRequest) => (
            <Card key={r.id} style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight="bold">{r.number}</AppText>
                <Pill accent={statusAccent[r.status]} label={t(statusKey[r.status])} />
              </View>
              <AppText tone="secondary">
                {r.lines.map((l) => `${name(byId(l.itemId))} × ${l.quantity}`).join(', ')}
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
      )}
    </Screen>
  );
}
