import { IconPlus } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getStaffInstallments,
  getStaffInvoices,
  getStaffReceipts,
  type StaffInstallment,
  type StaffInvoice,
  type StaffReceipt,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Button, Card, Onward, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { space } from '@/theme/tokens';

type Section = 'invoices' | 'receipts' | 'installments';

export default function StaffFinance() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const [section, setSection] = useState<Section>('invoices');

  const [invoices, setInvoices] = useState<StaffInvoice[]>([]);
  const [receipts, setReceipts] = useState<StaffReceipt[]>([]);
  const [installments, setInstallments] = useState<StaffInstallment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    Promise.all([
      getStaffInvoices(),
      getStaffReceipts(),
      getStaffInstallments(),
    ])
      .then(([inv, rec, inst]) => {
        setInvoices(inv);
        setReceipts(rec);
        setInstallments(inst);
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
      getStaffInvoices(),
      getStaffReceipts(),
      getStaffInstallments(),
    ])
      .then(([inv, rec, inst]) => {
        if (!cancelled) {
          setInvoices(inv);
          setReceipts(rec);
          setInstallments(inst);
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
      title={t('tabs.finance')}
      subtitle={t('staff.finance')}
      action={
        <Button
          label={t('staff.recordPayment')}
          icon={IconPlus}
          compact
          onPress={() => router.push('/staff/payment/new')}
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
          { value: 'invoices', label: t('staff.invoicesTab') },
          { value: 'receipts', label: t('staff.receiptsTab') },
          { value: 'installments', label: t('staff.installmentsTab') },
        ]}
      />

      {section === 'invoices' && (
        <View style={{ gap: space.sm }}>
          {invoices.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            invoices.map((inv) => (
              <Card
                key={inv.id}
                onPress={() => router.push(`/staff/invoice/${inv.id}` as any)}
                style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{inv.invoiceNumber}</AppText>
                  <Pill
                    accent={
                      inv.status === 'Paid'
                        ? 'success'
                        : inv.status === 'Overdue'
                        ? 'danger'
                        : 'warning'
                    }
                    label={inv.status}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="bodyLarge" weight="bold">
                    {omr(inv.totalAmount, code)}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {t('staff.dueDate')}: {inv.dueDate?.slice(0, 10)}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                  <AppText variant="caption" tone="muted">
                    {t('staff.paidAmount')}: {omr(inv.paidAmount, code)}
                  </AppText>
                  <Onward />
                </View>
              </Card>
            ))
          )}
        </View>
      )}

      {section === 'receipts' && (
        <View style={{ gap: space.sm }}>
          {receipts.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            receipts.map((rec) => (
              <Card key={rec.id} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">{rec.receiptNumber}</AppText>
                  <Pill accent="success" label={rec.status || 'Posted'} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="bodyLarge" weight="bold" tone="success">
                    {omr(rec.amount, code)}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {rec.paymentMethod}
                  </AppText>
                </View>
                <AppText variant="caption" tone="muted">
                  {rec.receiptDate?.slice(0, 10)} {rec.referenceNo ? `• Ref: ${rec.referenceNo}` : ''}
                </AppText>
              </Card>
            ))
          )}
        </View>
      )}

      {section === 'installments' && (
        <View style={{ gap: space.sm }}>
          {installments.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
              <AppText tone="secondary">{t('staff.noDataFound')}</AppText>
            </Card>
          ) : (
            installments.map((inst) => (
              <Card key={inst.id} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="bold">#{inst.installmentNo}</AppText>
                  <Pill
                    accent={
                      inst.status === 'Paid'
                        ? 'success'
                        : inst.status === 'Overdue'
                        ? 'danger'
                        : 'primary'
                    }
                    label={inst.status}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="bodyLarge" weight="bold">
                    {omr(inst.totalDue, code)}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {t('staff.dueDate')}: {inst.dueDate?.slice(0, 10)}
                  </AppText>
                </View>
              </Card>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}
