import { IconCheck, IconPlus, IconTrash } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { getStaffTickets, type StaffTicket } from '@/api/staff';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Field, Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { createRequest, useInventory } from '@/mock/inventory';
import { space, usePalette } from '@/theme/tokens';

type Line = { itemId: string; quantity: string };

/** A technician asks for materials, optionally for a ticket; a manager approves on the website. */
export default function NewRequisition() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { items } = useInventory();
  const params = useLocalSearchParams<{ ticketId?: string; ticketNumber?: string }>();
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [ticketId, setTicketId] = useState(params.ticketId ?? '');
  const [lines, setLines] = useState<Line[]>([{ itemId: '', quantity: '1' }]);
  const [notes, setNotes] = useState('');

  // The tickets are the live service requests; the stock itself is still sample data.
  useEffect(() => {
    let cancelled = false;
    getStaffTickets()
      .then((rows) => { if (!cancelled) setTickets(rows.filter((r) => r.status !== 'Closed' && r.status !== 'Resolved')); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const setLine = (i: number, change: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...change } : l)));
  const valid = lines.every((l) => l.itemId && Number(l.quantity) > 0);

  const ticketOptions = [
    { value: '', label: t('inventory.generalUse') },
    ...tickets.map((tk) => ({ value: tk.id, label: `${tk.ticketNumber} — ${tk.category}` })),
  ];
  // A ticket opened from its own page may already be closed to new work; keep it choosable.
  if (params.ticketId && !tickets.some((tk) => tk.id === params.ticketId)) {
    ticketOptions.push({ value: params.ticketId, label: params.ticketNumber ?? params.ticketId });
  }
  const itemOptions = items.map((i) => ({
    value: i.id,
    label: `${language.code === 'ar' && i.nameAr ? i.nameAr : i.nameEn} (${i.onHand} ${t(`inventory.unit.${i.unit}`)})`,
  }));

  const submit = () => {
    if (!valid) return;
    const ticket = ticketOptions.find((o) => o.value === ticketId && o.value);
    createRequest({
      ticketId: ticket?.value,
      ticketNumber: ticket ? (tickets.find((tk) => tk.id === ticket.value)?.ticketNumber ?? params.ticketNumber) : undefined,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
    });
    router.back();
  };

  return (
    <Page
      title={t('inventory.newRequest')}
      footer={<Button label={t('inventory.submit')} icon={IconCheck} disabled={!valid} onPress={submit} />}>
      <Card style={{ gap: space.md }}>
        <Select label={t('inventory.ticket')} value={ticketId} onChange={setTicketId} options={ticketOptions} />
      </Card>

      {lines.map((line, i) => (
        <Card key={i} style={{ gap: space.sm }}>
          <Select
            label={t('inventory.item')}
            value={line.itemId}
            onChange={(itemId) => setLine(i, { itemId })}
            placeholder={t('inventory.item')}
            options={itemOptions}
          />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t('inventory.quantity')}
                value={line.quantity}
                onChangeText={(quantity) => setLine(i, { quantity: quantity.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />
            </View>
            {lines.length > 1 ? (
              <Pressable
                onPress={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel={t('inventory.remove')}
                hitSlop={8}
                style={{ padding: space.md }}>
                <IconTrash size={20} color={palette.danger} />
              </Pressable>
            ) : null}
          </View>
        </Card>
      ))}

      <Button label={t('inventory.addItem')} icon={IconPlus} tone="outline" onPress={() => setLines((ls) => [...ls, { itemId: '', quantity: '1' }])} />

      <Card>
        <Field label={t('inventory.notes')} value={notes} onChangeText={setNotes} multiline />
      </Card>

      <AppText variant="caption" tone="muted">
        {t('inventory.approvalNote')}
      </AppText>
    </Page>
  );
}
