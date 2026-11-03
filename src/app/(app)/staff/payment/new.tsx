import { IconCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { createStaffReceipt } from '@/api/staff';
import { Page } from '@/components/page';
import { Button, Card, Field, Select } from '@/components/ui';
import { space } from '@/theme/tokens';

export default function NewPayment() {
  const { t } = useTranslation();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || submitting) return;
    setSubmitting(true);
    try {
      await createStaffReceipt({
        amount: val,
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptDate: new Date().toISOString(),
        currencyCode: 'OMR',
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
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;

  return (
    <Page
      title={t('staff.recordPayment')}
      footer={
        <Button
          label={t('common.submit')}
          icon={IconCheck}
          disabled={!isValid || submitting}
          onPress={() => void handleSubmit()}
        />
      }>
      <Card style={{ gap: space.md }}>
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
    </Page>
  );
}
