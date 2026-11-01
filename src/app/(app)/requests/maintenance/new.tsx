import { IconCamera, IconPhoto, IconX } from '@tabler/icons-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Details, Field, Select } from '@/components/ui';
import type { RequestCategory, RequestPriority } from '@/mock/data';
import { raiseRequest } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

const categories: RequestCategory[] = ['airConditioning', 'plumbing', 'electrical', 'appliance', 'carpentry', 'pestControl', 'cleaning', 'other'];
const priorities: RequestPriority[] = ['low', 'normal', 'high', 'urgent'];
const steps = ['details', 'photos', 'submit'] as const;
const MAX_PHOTOS = 4;
const MAX_TEXT = 500;

/** The design's numbered steps along the top: done and current in blue, the rest grey. */
function Steps({ current }: { current: number }) {
  const { t } = useTranslation();
  const palette = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {/* One track from the first circle's centre to the last's, drawn first so the circles sit on it. */}
      <View style={{ position: 'absolute', top: 14, start: `${50 / steps.length}%`, end: `${50 / steps.length}%`, height: 2, backgroundColor: palette.border }}>
        <View style={{ width: `${(current / (steps.length - 1)) * 100}%`, height: '100%', backgroundColor: palette.primary }} />
      </View>
      {steps.map((step, i) => {
        const reached = i <= current;
        return (
          <View key={step} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: reached ? palette.primary : palette.surfaceStrong, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="small" weight="bold" align="center" style={{ color: reached ? palette.onPrimary : palette.textMuted }}>
                {i + 1}
              </AppText>
            </View>
            <AppText variant="caption" weight={i === current ? 'semibold' : 'medium'} tone={i === current ? 'primary' : 'muted'} align="center">
              {t(`maint.steps.${step}`)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/** Reports an issue in three steps: what and how urgent, photos of it, then a check before sending. */
export default function NewMaintenanceRequest() {
  const { t } = useTranslation();
  const palette = usePalette();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<RequestCategory>('airConditioning');
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const addPhoto = async (camera: boolean) => {
    if (camera && Platform.OS !== 'web') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const result = camera && Platform.OS !== 'web' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) setPhotos((p) => [...p, result.assets[0].uri].slice(0, MAX_PHOTOS));
  };

  const submit = () => {
    const request = raiseRequest({ category, priority, description: description.trim(), photos });
    router.replace({ pathname: '/done', params: { kind: 'maintenance', ref: request.requestNo } });
  };

  const footer =
    step === 0 ? (
      <Button label={t('common.next')} disabled={!description.trim()} onPress={() => setStep(1)} />
    ) : (
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label={t('common.back')} tone="outline" onPress={() => setStep(step - 1)} />
        </View>
        <View style={{ flex: 2 }}>
          {step === 1 ? <Button label={t('common.next')} onPress={() => setStep(2)} /> : <Button label={t('common.submit')} onPress={submit} />}
        </View>
      </View>
    );

  return (
    <Page title={t('maint.newTitle')} footer={footer}>
      <Steps current={step} />

      {step === 0 ? (
        <>
          <Select label={t('maint.selectCategory')} value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: t(`maint.category.${c}`) }))} />
          <Select label={t('maint.priority')} value={priority} onChange={setPriority} options={priorities.map((p) => ({ value: p, label: t(`maint.priorities.${p}`) }))} />
          <View style={{ gap: 4 }}>
            <Field
              label={t('maint.description')}
              value={description}
              onChangeText={(v) => setDescription(v.slice(0, MAX_TEXT))}
              multiline
              placeholder={t('maint.describePlaceholder')}
            />
            <AppText variant="caption" tone="muted" align="right">
              {description.length}/{MAX_TEXT}
            </AppText>
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <AppText tone="secondary">{t('maint.photosIntro', { count: MAX_PHOTOS })}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {photos.map((uri) => (
              <View key={uri}>
                <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: radius.md }} />
                <Pressable
                  onPress={() => setPhotos(photos.filter((p) => p !== uri))}
                  accessibilityRole="button"
                  accessibilityLabel={t('maint.removePhoto')}
                  style={{ position: 'absolute', top: 4, end: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(15,27,51,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS
              ? [
                  { camera: true, icon: IconCamera, label: t('maint.takePhoto') },
                  { camera: false, icon: IconPhoto, label: t('maint.choosePhoto') },
                ].map((b) => (
                  <Pressable
                    key={b.label}
                    onPress={() => addPhoto(b.camera)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ width: 96, height: 96, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: palette.primary, backgroundColor: pressed ? palette.primarySoft : palette.card, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 })}>
                    <b.icon size={24} color={palette.primary} />
                    <AppText variant="caption" tone="primary" weight="medium" align="center">
                      {b.label}
                    </AppText>
                  </Pressable>
                ))
              : null}
          </View>
          <AppText variant="caption" tone="muted">
            {t('maint.photosOptional')}
          </AppText>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Details
            title={t('maint.review')}
            rows={[
              [t('maint.selectCategory'), t(`maint.category.${category}`)],
              [t('maint.priority'), t(`maint.priorities.${priority}`)],
              [t('maint.photos'), String(photos.length)],
            ]}
          />
          <View style={{ gap: 6 }}>
            <AppText variant="small" weight="medium" tone="secondary">
              {t('maint.description')}
            </AppText>
            <AppText>{description}</AppText>
          </View>
          <AppText variant="caption" tone="muted">
            {t('maint.reviewNote')}
          </AppText>
        </>
      ) : null}
    </Page>
  );
}
