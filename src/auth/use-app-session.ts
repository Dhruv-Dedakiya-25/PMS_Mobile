import type { TFunction } from 'i18next';

import { useAuth } from './session';
import { accessTo, homeFor, permissionsFor, type Access, type ActionPermissions, type UserType } from './page-access';
import type { AuthUser } from '@/api/types';
import { authMode } from '@/config';
import { useMockState } from '@/mock/store';

/**
 * What to call the account: its company role in the app's language, or the name of its
 * user type when it has no role.
 */
export const accountLabel = (user: AuthUser | null, t: TFunction, language: string) => {
  if (!user) return '';
  const role = (language === 'ar' && user.roleNameAr) || user.roleNameEn;
  return role || t(`staff.roles.${user.userType}`, { defaultValue: user.userType });
};

export function useAppSession() {
  const auth = useAuth();
  const mock = useMockState();
  const isDemo = authMode === 'demo';

  const user: AuthUser | null = auth.status === 'signedIn' ? auth.user : null;
  const userType: UserType = (isDemo ? 'Tenant' : (user?.userType as UserType)) || 'Tenant';
  const permissions = isDemo ? undefined : user?.permissions;

  const checkAccess = (path: string): Access | null => accessTo(path, userType, permissions);
  const checkPermissions = (path: string): ActionPermissions => permissionsFor(accessTo(path, userType, permissions));

  return {
    isDemo,
    starting: isDemo ? false : auth.status === 'starting',
    signedIn: isDemo ? mock.signedIn : auth.status === 'signedIn',
    user,
    userType,
    isTenant: userType === 'Tenant',
    isMaintenance: userType === 'Maintenance',
    isPropertyManager: userType === 'PropertyManager',
    isSuperAdmin: userType === 'SuperAdmin',
    isStaff: userType !== 'Tenant',
    accessTo: checkAccess,
    permissionsFor: checkPermissions,
    home: homeFor(userType, permissions),
  };
}
