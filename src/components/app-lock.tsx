import { IconFaceId, IconFingerprint } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canCheckOwner, clearLock, setLockEnabled, unlock, useLockEnabled } from '@/auth/lock';
import { logout } from '@/auth/session';
import { AppText } from '@/components/app-text';
import { EstateFlowMark } from '@/components/art';
import { useAuthColors } from '@/components/auth-ui';
import { Button, Card, ListRow } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { contentColumn, space, usePalette } from '@/theme/tokens';

const LockIcon = Platform.OS === 'ios' ? IconFaceId : IconFingerprint;

/** Over the app while it is locked: Face ID or a fingerprint opens it, and the password is always an option. */
export function LockScreen({ name }: { name: string }) {
  const { t } = useTranslation();
  const c = useAuthColors();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const [busy, setBusy] = useState(false);

  const ask = () => unlock(t('lock.prompt'), t('common.cancel')).catch(() => false);
  const tryUnlock = async () => {
    setBusy(true);
    await ask();
    setBusy(false);
  };

  // Asks straight away, as the phone's own lock does; the button is there after a cancel.
  useEffect(() => {
    void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        direction: isRTL ? 'rtl' : 'ltr',
        justifyContent: 'center',
        paddingHorizontal: space.xl,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}>
      <View style={{ ...contentColumn, maxWidth: 420, width: '100%', gap: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <EstateFlowMark size={40} />
          <AppText weight="bold" style={{ fontSize: 21, lineHeight: 26, letterSpacing: -0.5, color: c.ink }}>
            EstateFlow
          </AppText>
        </View>
        <View style={{ gap: space.sm, alignItems: 'center' }}>
          <AppText variant="heading" weight="bold" align="center" accessibilityRole="header" style={{ color: c.ink }}>
            {t('lock.title', { name })}
          </AppText>
          <AppText align="center" style={{ color: c.muted }}>
            {t('lock.hint')}
          </AppText>
        </View>
        <Button label={t('lock.unlock')} icon={LockIcon} disabled={busy} onPress={() => void tryUnlock()} />
        <Pressable
          onPress={() => {
            clearLock();
            void logout();
          }}
          disabled={busy}
          accessibilityRole="button"
          hitSlop={8}
          style={{ alignSelf: 'center' }}>
          <AppText weight="semibold" style={{ color: c.accent }}>
            {t('lock.usePassword')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

/** Profile's Face ID / fingerprint switch. A phone with no way to check its owner cannot turn it on. */
export function LockSetting() {
  const { t } = useTranslation();
  const palette = usePalette();
  const enabled = useLockEnabled();
  const [canCheck, setCanCheck] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    canCheckOwner().then(setCanCheck, () => setCanCheck(false));
  }, []);
  const on = enabled && canCheck !== false;

  const toggle = async (next: boolean) => {
    setBusy(true);
    await setLockEnabled(next, t('lock.prompt'), t('common.cancel'));
    setBusy(false);
  };

  return (
    <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
      <ListRow
        first
        icon={LockIcon}
        label={t('profile.lock.title')}
        detail={t(canCheck === false ? 'profile.lock.unavailable' : on ? 'profile.lock.onHint' : 'profile.lock.offHint')}
        right={
          <Switch
            value={on}
            onValueChange={(next) => void toggle(next)}
            disabled={busy || canCheck !== true}
            accessibilityLabel={t('profile.lock.title')}
            trackColor={{ true: palette.primary, false: palette.border }}
          />
        }
      />
    </Card>
  );
}
