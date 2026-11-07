export type UserType = 'SuperAdmin' | 'PropertyManager' | 'Maintenance' | 'Tenant';
/** Module to actions, as the API's PermissionCatalog names them ("Lease": ["View", "Edit"]). */
export type Permissions = Record<string, string[]>;
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
 * - An unknown user type gets the least access (empty rules, nothing allowed)
 *
 * The account's company role then narrows these through MODULES, as on the website.
 */
const RULES: Record<UserType, Record<string, Access | null>> = {
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
    // A maintenance account can be a step's approver.
    'staff/approvals': 'edit',
    profile: 'full',
    language: 'full',
    done: 'full',
  },
};

const HOME: Record<UserType, string> = {
  SuperAdmin: '/staff/dashboard',
  PropertyManager: '/staff/dashboard',
  Maintenance: '/staff/facility',
  Tenant: '/',
};

/**
 * The Role Permission Matrix module each staff screen reads (the API's PermissionCatalog).
 * Longest prefix wins. A screen with no module is decided by the user type alone.
 */
const MODULES: Record<string, string> = {
  'staff/dashboard': 'Dashboard',
  // Counts tickets, so the maintenance team can open it without the dashboard summary.
  'staff/facility': 'ServiceRequest',
  'staff/tickets': 'ServiceRequest',
  'staff/ticket': 'ServiceRequest',
  'staff/properties': 'PropertyBuilding',
  'staff/property': 'PropertyBuilding',
  'staff/facilities': 'Facility',
  'staff/finance': 'Invoice',
  'staff/invoice': 'Invoice',
  'staff/payment': 'Receipt',
  'staff/lease': 'Lease',
  'staff/announcements': 'Announcement',
  'staff/announcement': 'Announcement',
};

const RANK: Record<Access, number> = { view: 1, edit: 2, full: 3 };

const longestMatch = (page: string, prefixes: string[]) =>
  prefixes
    .filter((p) => p === '' || page === p || page.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];

/** What a module's ticked actions allow on a screen: nothing without View. */
const accessFromActions = (actions: string[] = []): Access | null => {
  if (!actions.includes('View')) return null;
  if (actions.includes('Delete')) return 'full';
  return actions.includes('Create') || actions.includes('Edit') ? 'edit' : 'view';
};

const rulesFor = (type: string): Record<string, Access | null> => {
  if (type in RULES) return RULES[type as UserType];
  // An unknown user type gets the least access: empty rules
  return {};
};

/**
 * What the account may do on the screen at this path, or null when it may not open it.
 * Without permissions (demo mode, or a session saved before roles existed) only the
 * user type decides.
 */
export const accessTo = (path: string, type: string, permissions?: Permissions): Access | null => {
  const page = path.split('?')[0].replace(/^\/+|\/+$/g, '');
  const rules = rulesFor(type);
  const prefix = longestMatch(page, Object.keys(rules));
  const byType = prefix === undefined ? null : rules[prefix];
  if (!byType || !permissions) return byType;

  const modulePrefix = longestMatch(page, Object.keys(MODULES));
  if (modulePrefix === undefined) return byType;
  const byRole = accessFromActions(permissions[MODULES[modulePrefix]]);
  if (!byRole) return null;
  return RANK[byRole] < RANK[byType] ? byRole : byType;
};

// Where to land instead when a role has taken away its user type's usual start screen.
const FALLBACK_HOMES = ['/staff/dashboard', '/staff/facility', '/staff/tickets', '/staff/properties', '/staff/finance', '/staff/announcements', '/staff/profile'];

/** Where the account starts, and where a screen it may not open sends it. */
export const homeFor = (type: string, permissions?: Permissions) => {
  const home = type in HOME ? HOME[type as UserType] : '/';
  if (home === '/' || accessTo(home, type, permissions) !== null) return home;
  return FALLBACK_HOMES.find((page) => accessTo(page, type, permissions) !== null) ?? home;
};
