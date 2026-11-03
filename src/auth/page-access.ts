export type UserRole = 'SuperAdmin' | 'PropertyManager' | 'Maintenance' | 'Tenant';
export type Access = 'full' | 'edit' | 'view';

export interface ActionPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const permissionsFor = (access: Access | null): ActionPermissions => {
  if (access === 'full') return { canAdd: true, canEdit: true, canDelete: true };
  if (access === 'edit') return { canAdd: true, canEdit: true, canDelete: false };
  return { canAdd: false, canEdit: false, canDelete: false };
};

/**
 * Route prefixes without leading slash.
 * - Tenant = everything except 'staff'
 * - Staff roles = 'staff' routes plus shared screens (profile, language, done) only
 * - Maintenance = limited to its own pages only:
 *     staff/facility, staff/facilities, staff/announcements, staff/announcement, staff/property as 'view';
 *     staff/tickets, staff/ticket, staff/inventory and staff/requisition as 'edit';
 *     plus profile, language, done. Everything else under staff is null.
 * - An unknown role gets the least access (empty rules, nothing allowed)
 */
const RULES: Record<UserRole, Record<string, Access | null>> = {
  Tenant: {
    '': 'full',
    staff: null,
  },
  SuperAdmin: {
    staff: 'full',
    profile: 'full',
    language: 'full',
    done: 'full',
  },
  PropertyManager: {
    staff: 'full',
    profile: 'full',
    language: 'full',
    done: 'full',
  },
  Maintenance: {
    staff: null,
    'staff/facility': 'view',
    'staff/facilities': 'view',
    'staff/announcements': 'view',
    'staff/announcement': 'view',
    'staff/property': 'view',
    'staff/profile': 'view',
    'staff/tickets': 'edit',
    'staff/ticket': 'edit',
    'staff/inventory': 'edit',
    'staff/requisition': 'edit',
    profile: 'full',
    language: 'full',
    done: 'full',
  },
};

const HOME: Record<UserRole, string> = {
  SuperAdmin: '/staff/dashboard',
  PropertyManager: '/staff/dashboard',
  Maintenance: '/staff/facility',
  Tenant: '/',
};

const rulesFor = (role: string): Record<string, Access | null> => {
  if (role in RULES) return RULES[role as UserRole];
  // An unknown role gets the least access: empty rules
  return {};
};

export const accessTo = (path: string, role: string): Access | null => {
  const page = path.split('?')[0].replace(/^\/+|\/+$/g, '');
  const rules = rulesFor(role);
  const prefix = Object.keys(rules)
    .filter((p) => p === '' || page === p || page.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return prefix === undefined ? null : rules[prefix];
};

export const homeFor = (role: string) => {
  if (role in HOME) return HOME[role as UserRole];
  return '/';
};
