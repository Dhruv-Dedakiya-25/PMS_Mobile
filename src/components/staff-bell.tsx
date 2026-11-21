import { IconBell } from '@tabler/icons-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getInbox } from '@/api/staff';
import { RoundIcon } from '@/components/ui';
import { authMode } from '@/config';

/**
 * The staff bell on the home screens, with how many of their own notifications are unread.
 * It counts again whenever the screen comes back into view, so reading them clears the badge.
 */
export function StaffBell() {
  const { t } = useTranslation();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (authMode !== 'api') return;
      let cancelled = false;
      getInbox()
        .then((r) => { if (!cancelled) setUnread(r.unread); })
        .catch(() => undefined);
      return () => { cancelled = true; };
    }, []),
  );

  return <RoundIcon icon={IconBell} label={t('notifications.title')} badge={unread} onPress={() => router.push('/staff/inbox')} />;
}
