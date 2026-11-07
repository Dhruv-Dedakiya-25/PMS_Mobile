import { IconAlertTriangle, IconCheck, IconRefresh } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  createStaffReceipt,
  getStaffLeases,
  getStaffTenants,
  type StaffLease,
  type StaffTenant,
} from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Field, Select } from '@/components/ui';
import { getCurrencyCode } from '@/lib/format';
import { space } from '@/theme/tokens';

export default function NewPayment() {
  const { t } = useTranslation();

  const [tenants, setTenants] = useState<StaffTenant[]>([]);
  const [leases, setLeases] = useState<StaffLease[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [leaseId, setLeaseId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStaffTenants(),
      getStaffLeases(),
    ])
      .then(([tn, ls]) => {
        if (!cancelled) {
          setTenants(tn);
          setLeases(ls);
          setLoadError(null);
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

  const handleTenantChange = (newTenantId: string) => {
    setTenantId(newTenantId);
    if (newTenantId && leaseId) {
      const currentLease = leases.find((l) => l.id === leaseId);
      if (currentLease && currentLease.tenantId !== newTenantId) {
        setLeaseId('');
      }
    }
  };

  const handleLeaseChange = (newLeaseId: string) => {
    setLeaseId(newLeaseId);
    if (newLeaseId) {
      const selected = leases.find((l) => l.id === newLeaseId);
      if (selected && selected.tenantId !== tenantId) {
        setTenantId(selected.tenantId);
      }
    }
  };

  const availableLeases = tenantId
    ? leases.filter((l) => l.tenantId === tenantId)
    : leases;

  const translateLeaseStatus = (status: string) => {
    return t(`lease.statuses.${status}`, status);
  };

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    const selectedLease = leases.find((l) => l.id === leaseId);
    if (isNaN(val) || val <= 0 || !tenantId || !selectedLease || submitting) return;
    setSubmitting(true);
    try {
      await createStaffReceipt({
        tenantId,
        leaseId,
        propertyId: selectedLease.propertyId,
        amount: val,
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptDate: new Date().toISOString(),
        currencyCode: getCurrencyCode(),
        status: 'Posted',
      });
      router.back();
    } catch (e) {
      Alert.alert(t('common.errorLoad'), e instanceof Error ? e.message : '');
    } finally {
      setSubmitting(false);
    }
  };

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && !!tenantId && !!leaseId;

  return (
    <Page
      title={t('staff.recordPayment')}
      footer={
        <Button
          label={t('common.submit')}
          icon={IconCheck}
          disabled={!isValid || submitting || loading || !!loadError}
          onPress={() => void handleSubmit()}
        />
      }>
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
        <Card style={{ gap: space.md }}>
          <Select
            label={t('lease.tenant')}
            value={tenantId}
            onChange={handleTenantChange}
            options={[
              { label: t('common.select'), value: '' },
              ...tenants.map((item) => ({
                label: `${item.displayNameEn} (${item.tenantNumber})`,
                value: item.id,
              })),
            ]}
          />

          <Select
            label={t('lease.leaseNo')}
            value={leaseId}
            onChange={handleLeaseChange}
            options={[
              { label: t('common.select'), value: '' },
              ...availableLeases.map((l) => ({
                label: `${l.leaseNumber} (${translateLeaseStatus(l.status)})`,
                value: l.id,
              })),
            ]}
          />

          <Field
            label={t('staff.amount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.000"
          />

          <Select
            label={t('staff.paymentMethod')}
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={[
              { label: 'Card', value: 'Card' },
              { label: 'Bank Transfer', value: 'BankTransfer' },
              { label: 'Cheque', value: 'Cheque' },
              { label: 'Cash', value: 'Cash' },
            ]}
          />

          <Field
            label={t('staff.referenceNo')}
            value={referenceNo}
            onChangeText={setReferenceNo}
            placeholder="e.g. TXN-998822"
          />

          <Field
            label={t('staff.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Optional remarks"
          />
        </Card>
      )}
    </Page>
  );
}
