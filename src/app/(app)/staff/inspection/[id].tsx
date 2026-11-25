import {
  IconAlertCircle,
  IconCamera,
  IconCircleCheck,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';

import {
  addStaffInspectionItem,
  cancelStaffInspection,
  completeStaffInspection,
  getStaffInspection,
  getStaffInspectionPhotoUri,
  getStaffServiceCategories,
  raiseStaffInspectionTicket,
  removeStaffInspectionItem,
  removeStaffInspectionPhoto,
  updateStaffInspection,
  updateStaffInspectionItem,
  uploadStaffInspectionPhoto,
} from '@/api/staff';
import type {
  InspectionCondition,
  InspectionDto,
  InspectionItemDto,
  ServiceCategoryOptionDto,
  UpdateInspectionDto,
} from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, Field, Pill, Select } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, shortDate } from '@/lib/format';
import {
  byArea,
  CONDITION_ACCENT,
  CONDITION_LABEL,
  CONDITIONS,
  itemName,
  STATUS_ACCENT,
  STATUS_LABEL,
  TYPE_LABEL,
  usePhotoUris,
} from '@/lib/inspections';
import {
  DEFAULT_SERVICE_CATEGORIES,
  formatServiceCategoryLabel,
  normalizeCategoryName,
} from '@/lib/service-categories';
import { shrinkPhoto } from '@/lib/shrink-photo';
import { radius, space, usePalette } from '@/theme/tokens';

const CATEGORY_FOR_TEMPLATE: Record<string, string> = {
  'systems.airConditioning': 'airConditioning',
  'systems.electrical': 'electrical',
  'bathrooms.sanitary': 'plumbing',
  'kitchen.cabinets': 'plumbing',
  'kitchen.appliances': 'appliance',
  'bedrooms.wardrobes': 'carpentry',
  'livingRoom.windows': 'carpentry',
};

const PRIORITIES = [
  { value: 'Low', labelKey: 'maint.priorities.low' },
  { value: 'Medium', labelKey: 'maint.priorities.normal' },
  { value: 'High', labelKey: 'maint.priorities.high' },
  { value: 'Emergency', labelKey: 'maint.priorities.urgent' },
];

export default function StaffInspectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { isDemo } = useAppSession();
  const code = language.code;

  const [inspection, setInspection] = useState<InspectionDto | null>(null);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryOptionDto[]>(DEFAULT_SERVICE_CATEGORIES);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemCharges, setItemCharges] = useState<Record<string, string>>({});

  // Handover & readings form state
  const [readings, setReadings] = useState<UpdateInspectionDto>({});

  // New item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [newName, setNewName] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  // Ticket modal state
  const [ticketItem, setTicketItem] = useState<InspectionItemDto | null>(null);
  const [ticketCategory, setTicketCategory] = useState('Other');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [raisingTicket, setRaisingTicket] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingReadings, setSavingReadings] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInspection = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await getStaffInspection(id);
        setInspection(data);

        // Initialize notes and charges map
        if (isRefresh) {
          setItemNotes((prev) => {
            const next = { ...prev };
            data.items?.forEach((it) => {
              if (it.note != null && next[it.id] === undefined) next[it.id] = it.note;
            });
            return next;
          });
          setItemCharges((prev) => {
            const next = { ...prev };
            data.items?.forEach((it) => {
              if (it.chargeAmount != null && next[it.id] === undefined) next[it.id] = String(it.chargeAmount);
            });
            return next;
          });
        } else {
          const nMap: Record<string, string> = {};
          const cMap: Record<string, string> = {};
          data.items?.forEach((it) => {
            if (it.note != null) nMap[it.id] = it.note;
            if (it.chargeAmount != null) cMap[it.id] = String(it.chargeAmount);
          });
          setItemNotes(nMap);
          setItemCharges(cMap);
        }

        // Initialize readings
        setReadings({
          keysCount: data.keysCount,
          accessCardsCount: data.accessCardsCount,
          parkingRemotesCount: data.parkingRemotesCount,
          mailboxKeysCount: data.mailboxKeysCount,
          electricityReading: data.electricityReading,
          waterReading: data.waterReading,
          chillerReading: data.chillerReading,
          summary: data.summary,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.errorLoad'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, t],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getStaffInspection(id)
      .then((data) => {
        if (!cancelled) {
          setInspection(data);
          const nMap: Record<string, string> = {};
          const cMap: Record<string, string> = {};
          data.items?.forEach((it) => {
            if (it.note != null) nMap[it.id] = it.note;
            if (it.chargeAmount != null) cMap[it.id] = String(it.chargeAmount);
          });
          setItemNotes(nMap);
          setItemCharges(cMap);
          setReadings({
            keysCount: data.keysCount,
            accessCardsCount: data.accessCardsCount,
            parkingRemotesCount: data.parkingRemotesCount,
            mailboxKeysCount: data.mailboxKeysCount,
            electricityReading: data.electricityReading,
            waterReading: data.waterReading,
            chillerReading: data.chillerReading,
            summary: data.summary,
          });
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.errorLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    getStaffServiceCategories()
      .then((cats) => {
        if (!cancelled && cats.length > 0) {
          setServiceCategories(cats);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  const photoUris = usePhotoUris(inspection?.items, getStaffInspectionPhotoUri);

  /** The server takes a charge only on a damaged item of a move-out; anything else sends none. */
  const chargeFor = (item: InspectionItemDto, condition: InspectionCondition) => {
    if (inspection?.type !== 'MoveOut' || condition !== 'Damaged') return null;
    const typed = itemCharges[item.id];
    if (typed === undefined) return item.chargeAmount ?? null;
    return typed.trim() ? parseFloat(typed) : null;
  };

  // Change item condition
  const handleConditionChange = async (item: InspectionItemDto, condition: InspectionCondition) => {
    if (!inspection || inspection.isLocked) return;
    try {
      const updated = await updateStaffInspectionItem(item.id, {
        area: item.area,
        name: item.name,
        condition,
        note: itemNotes[item.id] ?? item.note ?? undefined,
        chargeAmount: chargeFor(item, condition),
      });
      setInspection((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === item.id ? { ...i, ...updated, condition } : i)),
            }
          : prev,
      );
    } catch (e) {
      Alert.alert(t('inspection.title'), e instanceof Error ? e.message : t('common.errorLoad'));
    }
  };

  // Save note or charge on blur
  const handleSaveItemField = async (item: InspectionItemDto) => {
    if (!inspection || inspection.isLocked) return;
    const note = itemNotes[item.id] ?? item.note ?? '';
    const chargeAmount = chargeFor(item, item.condition);
    if (note === (item.note ?? '') && chargeAmount === (item.chargeAmount ?? null)) return;

    try {
      const updated = await updateStaffInspectionItem(item.id, {
        area: item.area,
        name: item.name,
        condition: item.condition,
        note: note || undefined,
        chargeAmount,
      });
      setInspection((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === item.id ? { ...i, ...updated } : i)),
            }
          : prev,
      );
    } catch (e) {
      Alert.alert(t('inspection.title'), e instanceof Error ? e.message : t('common.errorLoad'));
    }
  };

  // Photo upload
  const handleAddPhoto = async (item: InspectionItemDto, camera: boolean) => {
    if (!inspection || inspection.isLocked) return;
    if (camera && Platform.OS !== 'web') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const result =
      camera && Platform.OS !== 'web'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;

    try {
      const shrunkenUri = await shrinkPhoto(result.assets[0]).catch(() => result.assets[0].uri);
      await uploadStaffInspectionPhoto(item.id, shrunkenUri);
      await fetchInspection(true);
    } catch (e) {
      Alert.alert(t('inspection.addPhoto'), e instanceof Error ? e.message : t('common.errorLoad'));
    }
  };

  // Photo remove
  const handleRemovePhoto = (photoId: string) => {
    if (!inspection || inspection.isLocked) return;
    const doRemove = async () => {
      try {
        await removeStaffInspectionPhoto(photoId);
        await fetchInspection(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('common.errorLoad');
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert(t('inspection.removePhoto'), msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('inspection.removePhoto'))) void doRemove();
      return;
    }
    Alert.alert(t('inspection.removePhoto'), t('inspection.removePhoto'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('inspection.removePhoto'),
        style: 'destructive',
        onPress: () => void doRemove(),
      },
    ]);
  };

  // Raise Ticket
  const openTicketModal = (item: InspectionItemDto) => {
    const preferredCode = (item.templateKey && CATEGORY_FOR_TEMPLATE[item.templateKey]) || 'other';
    const matched =
      serviceCategories.find((c) => c.code === preferredCode) ??
      serviceCategories.find((c) => c.code === 'other' || normalizeCategoryName(c.nameEn) === 'other') ??
      serviceCategories[0];
    setTicketCategory(matched?.nameEn ?? 'Other');
    setTicketPriority('Medium');
    setTicketItem(item);
  };

  const handleRaiseTicket = async () => {
    if (!ticketItem) return;
    setRaisingTicket(true);
    try {
      const updated = await raiseStaffInspectionTicket(ticketItem.id, {
        category: ticketCategory,
        priority: ticketPriority,
      });
      setInspection((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === ticketItem.id ? { ...i, ...updated } : i)),
            }
          : prev,
      );
      setTicketItem(null);
      if (Platform.OS === 'web') {
        window.alert(t('inspection.ticketRaised'));
      } else {
        Alert.alert(t('inspection.raiseTicket'), t('inspection.ticketRaised'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.errorLoad');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('inspection.raiseTicket'), msg);
    } finally {
      setRaisingTicket(false);
    }
  };

  // Remove Item
  const handleRemoveItem = (item: InspectionItemDto) => {
    if (!inspection || inspection.isLocked) return;
    const doRemove = async () => {
      try {
        await removeStaffInspectionItem(item.id);
        await fetchInspection(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('common.errorLoad');
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert(t('inspection.removeItem'), msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('inspection.removeItemTitle', { name: itemName(t, item) }))) void doRemove();
      return;
    }
    Alert.alert(
      t('inspection.removeItem'),
      t('inspection.removeItemTitle', { name: itemName(t, item) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('inspection.removeItem'),
          style: 'destructive',
          onPress: () => void doRemove(),
        },
      ],
    );
  };

  // Add Item
  const handleAddItem = async () => {
    if (!inspection || !newArea.trim() || !newName.trim()) return;
    setAddingItem(true);
    try {
      await addStaffInspectionItem(inspection.id, {
        area: newArea.trim(),
        name: newName.trim(),
        condition: 'Unchecked',
      });
      setNewName('');
      setShowAddItem(false);
      await fetchInspection(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.errorLoad');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('inspection.addItem'), msg);
    } finally {
      setAddingItem(false);
    }
  };

  // Save Readings & Handover
  const handleSaveReadings = async () => {
    if (!inspection || inspection.isLocked) return;
    setSavingReadings(true);
    try {
      const updated = await updateStaffInspection(inspection.id, {
        ...readings,
        summary: readings.summary?.trim() || undefined,
        scheduledAtUtc: inspection.scheduledAtUtc,
        inspectorUserId: inspection.inspectorUserId ?? undefined,
        title: inspection.title ?? undefined,
      });
      setInspection(updated);
      if (Platform.OS === 'web') {
        window.alert(t('inspection.updated'));
      } else {
        Alert.alert(t('inspection.readingsHandover'), t('inspection.updated'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.errorLoad');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('inspection.readingsHandover'), msg);
    } finally {
      setSavingReadings(false);
    }
  };

  // Complete Inspection
  const handleComplete = () => {
    if (!inspection) return;
    const doComplete = async () => {
      setCompleting(true);
      try {
        // Saves notes and charges still being typed (a field that never lost focus).
        for (const item of inspection.items) {
          const note = itemNotes[item.id] ?? item.note ?? '';
          const chargeAmount = chargeFor(item, item.condition);
          if (note !== (item.note ?? '') || chargeAmount !== (item.chargeAmount ?? null)) {
            await updateStaffInspectionItem(item.id, {
              area: item.area,
              name: item.name,
              condition: item.condition,
              note: note || undefined,
              chargeAmount,
            });
          }
        }
        const updated = await completeStaffInspection(inspection.id);
        setInspection(updated);
        if (Platform.OS === 'web') {
          window.alert(t('inspection.completed', { number: inspection.number }));
        } else {
          Alert.alert(t('inspection.complete'), t('inspection.completed', { number: inspection.number }));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('common.errorLoad');
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert(t('inspection.complete'), msg);
      } finally {
        setCompleting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${t('inspection.completeTitle', { number: inspection.number })}\n${t('inspection.completeHint')}`)) {
        void doComplete();
      }
      return;
    }
    Alert.alert(
      t('inspection.completeTitle', { number: inspection.number }),
      t('inspection.completeHint'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('inspection.complete'),
          onPress: () => void doComplete(),
        },
      ],
    );
  };

  // Cancel Inspection
  const handleCancelInspection = async () => {
    if (!inspection || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      const updated = await cancelStaffInspection(inspection.id, cancelReason.trim());
      setInspection(updated);
      setShowCancelModal(false);
      setCancelReason('');
      if (Platform.OS === 'web') {
        window.alert(t('inspection.cancelled'));
      } else {
        Alert.alert(t('inspection.cancel'), t('inspection.cancelled'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.errorLoad');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('inspection.cancel'), msg);
    } finally {
      setCancelling(false);
    }
  };

  const grouped = inspection?.items ? byArea(t, inspection.items) : [];
  const moveOut = inspection?.type === 'MoveOut';

  return (
    <Page
      title={inspection?.number ?? t('inspection.title')}
      loading={loading}
      error={error}
      onRetry={() => void fetchInspection()}
      refreshing={refreshing}
      onRefresh={() => void fetchInspection(true)}>
      {inspection && (
        <View style={{ gap: space.md, paddingBottom: space.xl }}>
          {/* Header Card */}
          <Card style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyLarge" weight="bold">
                  {inspection.title || t(TYPE_LABEL[inspection.type])}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {[
                    shortDate(inspection.scheduledAtUtc, code),
                    inspection.propertyNameEn,
                    inspection.unitCode,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </AppText>
              </View>
              <Pill label={t(STATUS_LABEL[inspection.status])} accent={STATUS_ACCENT[inspection.status]} />
            </View>

            {inspection.tenantName ? (
              <AppText variant="caption" tone="muted">
                {t('lease.tenant')}: {inspection.tenantName}{inspection.leaseNumber ? ` (${inspection.leaseNumber})` : ''}
              </AppText>
            ) : null}

            {inspection.inspectorName ? (
              <AppText variant="caption" tone="muted">
                {t('inspection.inspector')}: {inspection.inspectorName}
              </AppText>
            ) : null}

            {/* Lock Notice */}
            {inspection.status === 'Completed' ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.xs,
                  padding: space.sm,
                  borderRadius: radius.md,
                  backgroundColor: palette.surfaceStrong,
                  marginTop: space.xs,
                }}>
                <IconCircleCheck size={18} color={palette.success} />
                <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                  {t('inspection.lockedCompleted', {
                    date: longDate(inspection.completedAtUtc || inspection.scheduledAtUtc, code),
                    name: inspection.completedByName || inspection.inspectorName || '',
                  })}
                </AppText>
              </View>
            ) : inspection.status === 'Cancelled' ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.xs,
                  padding: space.sm,
                  borderRadius: radius.md,
                  backgroundColor: palette.dangerSoft,
                  marginTop: space.xs,
                }}>
                <IconAlertCircle size={18} color={palette.danger} />
                <AppText variant="caption" tone="danger" style={{ flex: 1 }}>
                  {t('inspection.lockedCancelled', { reason: inspection.cancelReason || '' })}
                </AppText>
              </View>
            ) : null}
          </Card>

          {/* Checklist Items Section */}
          <Card style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText weight="bold">{t('move.checklist')}</AppText>
              {!inspection.isLocked && (
                <Pressable
                  onPress={() => setShowAddItem(!showAddItem)}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <IconPlus size={16} color={palette.primary} />
                  <AppText variant="small" tone="primary" weight="medium">
                    {t('inspection.addItem')}
                  </AppText>
                </Pressable>
              )}
            </View>

            {/* Add item mini-form */}
            {showAddItem && !inspection.isLocked && (
              <View
                style={{
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: palette.surface,
                  gap: space.sm,
                  marginBottom: space.sm,
                }}>
                <Field
                  label={t('inspection.area')}
                  placeholder={t('inspection.area')}
                  value={newArea}
                  onChangeText={setNewArea}
                />
                <Field
                  label={t('inspection.name')}
                  placeholder={t('inspection.name')}
                  value={newName}
                  onChangeText={setNewName}
                />
                <Button
                  label={addingItem ? t('common.loading') : t('inspection.addItem')}
                  disabled={addingItem || !newArea.trim() || !newName.trim()}
                  onPress={() => void handleAddItem()}
                />
              </View>
            )}

            {grouped.map(([areaName, items]) => (
              <View key={areaName} style={{ marginBottom: space.sm }}>
                <AppText variant="small" weight="bold" tone="primary" style={{ marginVertical: space.xs }}>
                  {areaName}
                </AppText>
                {items.map((item) => {
                  const condition = item.condition;
                  const isDamaged = condition === 'Damaged';
                  const isFair = condition === 'Fair';

                  return (
                    <View
                      key={item.id}
                      style={{
                        paddingVertical: space.sm,
                        borderTopWidth: 1,
                        borderTopColor: palette.border,
                        gap: space.xs,
                      }}>
                      {/* Item Header */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }}>
                        <AppText variant="small" weight="medium" style={{ flex: 1 }}>
                          {itemName(t, item)}
                        </AppText>
                        {!inspection.isLocked && !item.ticketNumber && (
                          <Pressable
                            onPress={() => handleRemoveItem(item)}
                            accessibilityRole="button"
                            accessibilityLabel={t('inspection.removeItem')}
                            hitSlop={8}>
                            <IconTrash size={16} color={palette.textMuted} />
                          </Pressable>
                        )}
                      </View>

                      {/* Condition Buttons */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                        {CONDITIONS.map((c) => {
                          const active = condition === c;
                          const accent = CONDITION_ACCENT[c];
                          const activeBg =
                            accent === 'success'
                              ? palette.success
                              : accent === 'warning'
                                ? palette.warning
                                : accent === 'danger'
                                  ? palette.danger
                                  : palette.surfaceStrong;

                          return (
                            <Pressable
                              key={c}
                              disabled={inspection.isLocked}
                              onPress={() => void handleConditionChange(item, c)}
                              accessibilityRole="button"
                              style={{
                                paddingHorizontal: space.sm,
                                paddingVertical: 4,
                                borderRadius: radius.sm,
                                borderWidth: 1,
                                borderColor: active ? activeBg : palette.border,
                                backgroundColor: active ? activeBg : palette.surface,
                              }}>
                              <AppText
                                variant="caption"
                                weight={active ? 'bold' : 'medium'}
                                style={{
                                  color: active ? '#FFFFFF' : palette.textSecondary,
                                }}>
                                {t(CONDITION_LABEL[c])}
                              </AppText>
                            </Pressable>
                          );
                        })}
                      </View>

                      {/* Notes for Damaged or Fair */}
                      {(isDamaged || isFair || item.note) && (
                        <Field
                          label={t('inspection.notePlaceholder')}
                          placeholder={t('inspection.notePlaceholder')}
                          value={itemNotes[item.id] ?? ''}
                          editable={!inspection.isLocked}
                          onChangeText={(v) => setItemNotes((prev) => ({ ...prev, [item.id]: v }))}
                          onBlur={() => void handleSaveItemField(item)}
                          multiline
                        />
                      )}

                      {/* Charges (on Damaged items of MoveOut) */}
                      {moveOut && isDamaged && (
                        <Field
                          label={t('inspection.charge')}
                          placeholder="0.000"
                          value={itemCharges[item.id] ?? ''}
                          editable={!inspection.isLocked}
                          keyboardType="decimal-pad"
                          onChangeText={(v) => setItemCharges((prev) => ({ ...prev, [item.id]: v }))}
                          onBlur={() => void handleSaveItemField(item)}
                        />
                      )}

                      {/* Photo Section */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: 4 }}>
                        {item.photos?.map((photo) => (
                          <View key={photo.id}>
                            {photoUris[photo.id] ? (
                              <Image
                                source={{ uri: photoUris[photo.id] }}
                                style={{ width: 60, height: 60, borderRadius: radius.sm }}
                              />
                            ) : (
                              <View
                                style={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: radius.sm,
                                  backgroundColor: palette.surfaceStrong,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                <IconPhoto size={20} color={palette.textMuted} />
                              </View>
                            )}
                            {!inspection.isLocked && (
                              <Pressable
                                onPress={() => handleRemovePhoto(photo.id)}
                                accessibilityRole="button"
                                accessibilityLabel={t('inspection.removePhoto')}
                                style={{
                                  position: 'absolute',
                                  top: 2,
                                  end: 2,
                                  width: 18,
                                  height: 18,
                                  borderRadius: 9,
                                  backgroundColor: 'rgba(15,27,51,0.7)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                <IconX size={10} color="#FFFFFF" />
                              </Pressable>
                            )}
                          </View>
                        ))}

                        {/* Add Photo Button (up to 4) */}
                        {!inspection.isLocked && (item.photos?.length ?? 0) < 4 && (
                          <View style={{ flexDirection: 'row', gap: space.xs }}>
                            <Pressable
                              onPress={() => void handleAddPhoto(item, true)}
                              accessibilityRole="button"
                              style={{
                                width: 60,
                                height: 60,
                                borderRadius: radius.sm,
                                borderWidth: 1,
                                borderStyle: 'dashed',
                                borderColor: palette.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: palette.primarySoft,
                              }}>
                              <IconCamera size={20} color={palette.primary} />
                              <AppText variant="caption" tone="primary" style={{ fontSize: 9 }}>
                                {t('inspection.addPhoto')}
                              </AppText>
                            </Pressable>
                            <Pressable
                              onPress={() => void handleAddPhoto(item, false)}
                              accessibilityRole="button"
                              style={{
                                width: 60,
                                height: 60,
                                borderRadius: radius.sm,
                                borderWidth: 1,
                                borderStyle: 'dashed',
                                borderColor: palette.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: palette.surface,
                              }}>
                              <IconPhoto size={20} color={palette.textSecondary} />
                              <AppText variant="caption" tone="secondary" style={{ fontSize: 9 }}>
                                {t('common.select')}
                              </AppText>
                            </Pressable>
                          </View>
                        )}
                      </View>

                      {/* Ticket section on Damaged item */}
                      {isDamaged && (
                        <View style={{ marginTop: 4 }}>
                          {item.ticketNumber ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Pill
                                accent="orange"
                                label={`${t('inspection.ticket')}: ${item.ticketNumber}`}
                              />
                            </View>
                          ) : !inspection.isLocked ? (
                            <Pressable
                              onPress={() => openTicketModal(item)}
                              accessibilityRole="button"
                              style={{
                                alignSelf: 'flex-start',
                                paddingHorizontal: space.sm,
                                paddingVertical: 4,
                                borderRadius: radius.sm,
                                backgroundColor: palette.primarySoft,
                              }}>
                              <AppText variant="caption" tone="primary" weight="semibold">
                                + {t('inspection.raiseTicket')}
                              </AppText>
                            </Pressable>
                          ) : null}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </Card>

          {/* Readings & Handover Section */}
          <Card style={{ gap: space.sm }}>
            <AppText weight="bold">{t('inspection.readingsHandover')}</AppText>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('inspection.keys')}
                  keyboardType="number-pad"
                  editable={!inspection.isLocked}
                  value={readings.keysCount != null ? String(readings.keysCount) : ''}
                  onChangeText={(v) =>
                    setReadings((prev) => ({
                      ...prev,
                      keysCount: v ? parseInt(v, 10) : undefined,
                    }))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('inspection.accessCards')}
                  keyboardType="number-pad"
                  editable={!inspection.isLocked}
                  value={readings.accessCardsCount != null ? String(readings.accessCardsCount) : ''}
                  onChangeText={(v) =>
                    setReadings((prev) => ({
                      ...prev,
                      accessCardsCount: v ? parseInt(v, 10) : undefined,
                    }))
                  }
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('inspection.parkingRemotes')}
                  keyboardType="number-pad"
                  editable={!inspection.isLocked}
                  value={readings.parkingRemotesCount != null ? String(readings.parkingRemotesCount) : ''}
                  onChangeText={(v) =>
                    setReadings((prev) => ({
                      ...prev,
                      parkingRemotesCount: v ? parseInt(v, 10) : undefined,
                    }))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('inspection.mailboxKeys')}
                  keyboardType="number-pad"
                  editable={!inspection.isLocked}
                  value={readings.mailboxKeysCount != null ? String(readings.mailboxKeysCount) : ''}
                  onChangeText={(v) =>
                    setReadings((prev) => ({
                      ...prev,
                      mailboxKeysCount: v ? parseInt(v, 10) : undefined,
                    }))
                  }
                />
              </View>
            </View>

            <Field
              label={`${t('move.electricityMeter')} (kWh)`}
              keyboardType="decimal-pad"
              editable={!inspection.isLocked}
              value={readings.electricityReading != null ? String(readings.electricityReading) : ''}
              onChangeText={(v) =>
                setReadings((prev) => ({
                  ...prev,
                  electricityReading: v ? parseFloat(v) : undefined,
                }))
              }
            />

            <Field
              label={`${t('move.waterMeter')} (m³)`}
              keyboardType="decimal-pad"
              editable={!inspection.isLocked}
              value={readings.waterReading != null ? String(readings.waterReading) : ''}
              onChangeText={(v) =>
                setReadings((prev) => ({
                  ...prev,
                  waterReading: v ? parseFloat(v) : undefined,
                }))
              }
            />

            <Field
              label={`${t('move.chillerMeter')} (kWh)`}
              keyboardType="decimal-pad"
              editable={!inspection.isLocked}
              value={readings.chillerReading != null ? String(readings.chillerReading) : ''}
              onChangeText={(v) =>
                setReadings((prev) => ({
                  ...prev,
                  chillerReading: v ? parseFloat(v) : undefined,
                }))
              }
            />

            <Field
              label={t('inspection.summary')}
              multiline
              editable={!inspection.isLocked}
              value={readings.summary ?? ''}
              onChangeText={(v) => setReadings((prev) => ({ ...prev, summary: v }))}
            />

            {!inspection.isLocked && (
              <Button
                label={savingReadings ? t('common.loading') : t('inspection.save')}
                disabled={savingReadings}
                onPress={() => void handleSaveReadings()}
              />
            )}
          </Card>

          {/* Action Buttons (Complete & Cancel) */}
          {!inspection.isLocked && (
            <View style={{ gap: space.sm }}>
              <Button
                label={completing ? t('common.loading') : t('inspection.complete')}
                disabled={completing}
                onPress={handleComplete}
              />
              <Button
                label={t('inspection.cancel')}
                tone="outline"
                onPress={() => setShowCancelModal(true)}
              />
            </View>
          )}
        </View>
      )}

      {/* Modal: Raise Ticket */}
      <Modal visible={Boolean(ticketItem)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: space.lg,
          }}>
          <Card style={{ gap: space.md }}>
            <AppText weight="bold">
              {ticketItem ? t('inspection.raiseTicketFor', { name: itemName(t, ticketItem) }) : ''}
            </AppText>
            {ticketItem?.note ? (
              <AppText variant="caption" tone="secondary">
                {ticketItem.note}
              </AppText>
            ) : null}

            <Select
              label={t('inspection.category')}
              value={ticketCategory}
              onChange={setTicketCategory}
              options={serviceCategories.map((c) => ({
                value: c.nameEn,
                label: formatServiceCategoryLabel(c, t, code),
              }))}
            />

            <Select
              label={t('inspection.priority')}
              value={ticketPriority}
              onChange={setTicketPriority}
              options={PRIORITIES.map((p) => ({
                value: p.value,
                label: t(p.labelKey),
              }))}
            />

            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
              <View style={{ flex: 1 }}>
                <Button label={t('common.cancel')} tone="outline" onPress={() => setTicketItem(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={raisingTicket ? t('common.loading') : t('inspection.raiseTicket')}
                  disabled={raisingTicket}
                  onPress={() => void handleRaiseTicket()}
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Modal: Cancel Inspection */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: space.lg,
          }}>
          <Card style={{ gap: space.md }}>
            <AppText weight="bold">
              {inspection ? t('inspection.cancelTitle', { number: inspection.number }) : ''}
            </AppText>
            <Field
              label={t('inspection.reason')}
              placeholder={t('inspection.reason')}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('common.cancel')}
                  tone="outline"
                  onPress={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={cancelling ? t('common.loading') : t('inspection.cancel')}
                  disabled={!cancelReason.trim() || cancelling}
                  onPress={() => void handleCancelInspection()}
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </Page>
  );
}
