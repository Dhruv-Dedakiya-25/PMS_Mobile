import { IconCheck, IconPlus, IconSend, IconTrash } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import {
  createStaffMaterialRequisition,
  getStaffInventoryItems,
  getStaffServiceCategories,
  getStaffTickets,
  sendStaffMaterialRequisition,
  updateStaffMaterialRequisition,
  type StaffInventoryItem,
  type StaffTicket,
} from '@/api/staff';
import type { ServiceCategoryOptionDto } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Field, Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { omr } from '@/lib/format';
import { DEFAULT_SERVICE_CATEGORIES, formatTicketCategory } from '@/lib/service-categories';
import { createRequest, useInventory } from '@/mock/inventory';
import { space, usePalette } from '@/theme/tokens';

type Line = { itemId: string; quantity: string };

const formatQty = (v: number) => String(Number(Number(v ?? 0).toFixed(3)));

/** A technician asks for materials, optionally for a ticket; a manager approves on the website or in Approvals. */
export default function NewRequisition() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { isDemo } = useAppSession();
  const demo = useInventory();
  const params = useLocalSearchParams<{ ticketId?: string; ticketNumber?: string; propertyId?: string }>();

  const [apiItems, setApiItems] = useState<StaffInventoryItem[]>([]);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOptionDto[]>(DEFAULT_SERVICE_CATEGORIES);
  const [loading, setLoading] = useState(!isDemo);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ticketId, setTicketId] = useState(params.ticketId ?? '');
  const [lines, setLines] = useState<Line[]>([{ itemId: '', quantity: '1' }]);
  const [notes, setNotes] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'draft' | 'send' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (isDemo) {
      getStaffTickets()
        .then((rows) => {
          if (!cancelled) setTickets(rows.filter((r) => r.status !== 'Closed' && r.status !== 'Resolved'));
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }
    Promise.all([
      getStaffInventoryItems(),
      getStaffTickets().catch(() => [] as StaffTicket[]),
      getStaffServiceCategories().catch(() => DEFAULT_SERVICE_CATEGORIES),
    ])
      .then(([loadedItems, rows, cats]) => {
        if (!cancelled) {
          setApiItems(loadedItems.filter((i) => i.isActive !== false));
          setTickets(rows.filter((r) => r.status !== 'Closed' && r.status !== 'Resolved'));
          if (cats.length > 0) setCategories(cats);
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
  }, [attempt, isDemo, t]);

  const retryLoad = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setAttempt((n) => n + 1);
  }, []);

  const setLine = (i: number, change: Partial<Line>) => {
    setSubmitError(null);
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...change } : l)));
  };

  const chosenIds = lines.map((l) => l.itemId).filter(Boolean);
  const hasDuplicateItem = new Set(chosenIds).size !== chosenIds.length;
  const valid = lines.length > 0 && lines.every((l) => l.itemId && Number(l.quantity) > 0) && !hasDuplicateItem;

  const ticketOptions = [
    { value: '', label: t('inventory.generalUse') },
    ...tickets.map((tk) => ({
      value: tk.id,
      label: `${tk.ticketNumber} — ${formatTicketCategory(tk.category, categories, t, language.code)}`,
    })),
  ];
  // A ticket opened from its own page may already be closed to new work; keep it choosable.
  if (params.ticketId && !tickets.some((tk) => tk.id === params.ticketId)) {
    ticketOptions.push({ value: params.ticketId, label: params.ticketNumber ?? params.ticketId });
  }

  const selectableItems = isDemo ? demo.items : apiItems;
  const itemOptions = selectableItems.map((i) => {
    const unitText = t(`inventory.unit.${i.unit}`, { defaultValue: i.unit });
    return {
      value: i.id,
      label: `${language.code === 'ar' && i.nameAr ? i.nameAr : i.nameEn} (${formatQty(i.onHand)} ${unitText})`,
    };
  });

  const estimatedTotal = useMemo(() => {
    if (isDemo) return 0;
    return lines.reduce((sum, l) => {
      const item = apiItems.find((i) => i.id === l.itemId);
      const qty = Number(l.quantity);
      if (!item || !Number.isFinite(qty) || qty <= 0) return sum;
      return sum + item.unitCost * qty;
    }, 0);
  }, [apiItems, isDemo, lines]);

  const submitDemo = () => {
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

  const submitApi = async (sendAfterSave: boolean) => {
    if (!valid || saving) return;
    setSaving(sendAfterSave ? 'send' : 'draft');
    setSubmitError(null);
    const chosenTicket = tickets.find((tk) => tk.id === ticketId);
    const propertyId = chosenTicket?.propertyId ?? (ticketId === params.ticketId ? params.propertyId || null : null);
    const payload = {
      serviceRequestId: ticketId || null,
      propertyId: propertyId || null,
      notes: notes.trim() || null,
      lines: lines.map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
    };

    try {
      let id = draftId;
      if (!id) {
        const created = await createStaffMaterialRequisition(payload);
        id = created.id;
        setDraftId(created.id);
      } else {
        await updateStaffMaterialRequisition(id, payload);
      }
      if (sendAfterSave) {
        await sendStaffMaterialRequisition(id);
      }
      router.back();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('common.errorLoad'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Page
      title={t('inventory.newRequest')}
      loading={!isDemo && loading}
      error={!isDemo ? loadError : null}
      onRetry={!isDemo ? retryLoad : undefined}
      footer={
        isDemo ? (
          <Button label={t('inventory.submit')} icon={IconCheck} disabled={!valid} onPress={submitDemo} />
        ) : (
          <View style={{ gap: space.sm }}>
            <Button
              label={saving === 'send' ? t('inventory.sending') : t('inventory.saveAndSend')}
              icon={IconSend}
              disabled={!valid || saving !== null}
              onPress={() => void submitApi(true)}
            />
            <Button
              label={t('inventory.saveDraft')}
              icon={IconCheck}
              tone="outline"
              disabled={!valid || saving !== null}
              onPress={() => void submitApi(false)}
            />
          </View>
        )
      }>
      {submitError ? (
        <Card>
          <AppText tone="danger">{submitError}</AppText>
        </Card>
      ) : null}

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
                onChangeText={(quantity) => setLine(i, { quantity: quantity.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
            </View>
            {lines.length > 1 ? (
              <Pressable
                onPress={() => {
                  setSubmitError(null);
                  setLines((ls) => ls.filter((_, j) => j !== i));
                }}
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

      {hasDuplicateItem ? (
        <AppText variant="caption" tone="danger">
          {t('inventory.duplicateItemLine')}
        </AppText>
      ) : null}

      <Button
        label={t('inventory.addItem')}
        icon={IconPlus}
        tone="outline"
        onPress={() => {
          setSubmitError(null);
          setLines((ls) => [...ls, { itemId: '', quantity: '1' }]);
        }}
      />

      <Card style={{ gap: space.sm }}>
        <Field label={t('inventory.notes')} value={notes} onChangeText={setNotes} multiline />
        {!isDemo ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="caption" tone="muted">
              {t('inventory.estimatedTotal')}
            </AppText>
            <AppText weight="bold">{omr(estimatedTotal, language.code)}</AppText>
          </View>
        ) : null}
      </Card>

      <AppText variant="caption" tone="muted">
        {t('inventory.approvalNote')}
      </AppText>
    </Page>
  );
}
