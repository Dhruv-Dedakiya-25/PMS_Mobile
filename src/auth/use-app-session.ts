import { useAuth } from './session';
import { accessTo, permissionsFor, type Access, type ActionPermissions, type UserRole } from './page-access';
import type { AuthUser } from '@/api/types';
import { authMode } from '@/config';
import { useMockState } from '@/mock/store';

export function useAppSession() {
  const auth = useAuth();
  const mock = useMockState();
  const isDemo = authMode === 'demo';

  const user: AuthUser | null = auth.status === 'signedIn' ? auth.user : null;
  const role: UserRole = (isDemo ? 'Tenant' : (user?.role as UserRole)) || 'Tenant';

  const checkAccess = (path: string): Access | null => accessTo(path, role);
  const checkPermissions = (path: string): ActionPermissions => permissionsFor(accessTo(path, role));

  return {
    isDemo,
    starting: isDemo ? false : auth.status === 'starting',
    signedIn: isDemo ? mock.signedIn : auth.status === 'signedIn',
    user,
    role,
    isTenant: role === 'Tenant',
    isMaintenance: role === 'Maintenance',
    isPropertyManager: role === 'PropertyManager',
    isSuperAdmin: role === 'SuperAdmin',
    isStaff: role !== 'Tenant',
    accessTo: checkAccess,
    permissionsFor: checkPermissions,
  };
}
