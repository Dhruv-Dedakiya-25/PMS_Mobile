import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getStaffInvoices, type StaffInvoice } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { space } from '@/theme/tokens';

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;

  const [invoice, setInvoice] = useState<StaffInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!id) return;
    setLoading(true);

    getStaffInvoices()
      .then((invoices) => {
        const found = invoices.find((inv) => inv.id === id);
        setInvoice(found ?? null);
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
    getStaffInvoices()
      .then((invoices) => {
        if (!cancelled) {
          const found = invoices.find((inv) => inv.id === id);
          setInvoice(found ?? null);
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
      title={invoice?.invoiceNumber || t('staff.invoiceDetails')}
      loading={loading}
      error={error}
      onRetry={() => {
        fetchData();
      }}>
      {invoice && (
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="bodyLarge" weight="bold">
              {invoice.invoiceNumber}
            </AppText>
            <Pill
              accent={
                invoice.status === 'Paid'
                  ? 'success'
                  : invoice.status === 'Overdue'
                  ? 'danger'
                  : 'warning'
              }
              label={invoice.status}
            />
          </View>

          <View style={{ gap: space.xs }}>
            <AppText variant="caption" tone="secondary">
              {t('staff.totalAmount')}
            </AppText>
            <AppText variant="heading" weight="bold" tone="primary">
              {omr(invoice.totalAmount, code)}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: space.xs }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.paidAmount')}
              </AppText>
              <AppText weight="semibold" tone="success">
                {omr(invoice.paidAmount, code)}
              </AppText>
            </View>
            <View style={{ gap: space.xs }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.outstanding')}
              </AppText>
              <AppText weight="semibold" tone={invoice.outstandingAmount > 0 ? 'danger' : 'secondary'}>
                {omr(invoice.outstandingAmount, code)}
              </AppText>
            </View>
          </View>

          <View style={{ gap: space.xs }}>
            <AppText variant="caption" tone="secondary">
              {t('staff.dueDate')}
            </AppText>
            <AppText>{invoice.dueDate?.slice(0, 10)}</AppText>
          </View>

          {invoice.notes ? (
            <View style={{ gap: space.xs }}>
              <AppText variant="caption" tone="secondary">
                {t('staff.notes')}
              </AppText>
              <AppText tone="secondary">{invoice.notes}</AppText>
            </View>
          ) : null}
        </Card>
      )}
    </Page>
  );
}
