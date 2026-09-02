// Page-level access control: which roles can view each page
export const PAGE_ACCESS = {
  Dashboard: ['admin', 'manager', 'staff', 'viewer'],
  Cattle: ['admin', 'manager', 'staff', 'viewer'],
  MilkProduction: ['admin', 'manager', 'staff', 'viewer'],
  MilkDashboard: ['admin', 'manager', 'staff', 'viewer'],
  MilkAnalytics: ['admin', 'manager'],
  HealthRecords: ['admin', 'manager', 'staff', 'viewer'],
  Breeding: ['admin', 'manager', 'staff', 'viewer'],
  Inventory: ['admin', 'manager', 'staff', 'viewer'],
  Tasks: ['admin', 'manager', 'staff', 'viewer'],
  Finance: ['admin', 'manager'],
  Vendors: ['admin', 'manager'],
  Reports: ['admin', 'manager'],
  PredictiveAnalytics: ['admin', 'manager'],
  Settings: ['admin', 'manager'],
};

// Settings sub-tab access
export const SETTINGS_TAB_ACCESS = {
  farm: ['admin'],
  categories: ['admin', 'manager'],
  users: ['admin'],
  roles: ['admin'],
};

// Detailed permission matrix for display in the Role Matrix tab
export const PERMISSION_MATRIX = [
  { module: 'Dashboard', permissions: { admin: true, manager: true, staff: true, viewer: true } },
  { module: 'Cattle — View', permissions: { admin: true, manager: true, staff: true, viewer: true } },
  { module: 'Cattle — Add / Edit / Delete', permissions: { admin: true, manager: true, staff: false, viewer: false } },
  { module: 'Milk Production — View', permissions: { admin: true, manager: true, staff: true, viewer: true } },
  { module: 'Milk Production — Record / Edit', permissions: { admin: true, manager: true, staff: true, viewer: false } },
  { module: 'Health Records — View', permissions: { admin: true, manager: true, staff: true, viewer: true } },
  { module: 'Health Records — Add / Edit', permissions: { admin: true, manager: true, staff: true, viewer: false } },
  { module: 'Breeding — View', permissions: { admin: true, manager: true, staff: true, viewer: true } },
  { module: 'Breeding — Add / Edit', permissions: { admin: true, manager: true, staff: false, viewer: false } },
  { module: 'Inventory — View', permissions: { admin: true, manager: true, staff: true, viewer: true } },
  { module: 'Inventory — Add / Edit / Consume', permissions: { admin: true, manager: true, staff: true, viewer: false } },
  { module: 'Inventory — Delete', permissions: { admin: true, manager: true, staff: false, viewer: false } },
  { module: 'Finance — View', permissions: { admin: true, manager: true, staff: false, viewer: false } },
  { module: 'Finance — Add / Edit Transactions', permissions: { admin: true, manager: true, staff: false, viewer: false } },
  { module: 'Finance — Delete / Reports', permissions: { admin: true, manager: false, staff: false, viewer: false } },
  { module: 'Tasks — View', permissions: { admin: true, manager: true, staff: true, viewer: true } },
  { module: 'Tasks — Create / Complete', permissions: { admin: true, manager: true, staff: true, viewer: false } },
  { module: 'Reports & Analytics', permissions: { admin: true, manager: true, staff: false, viewer: false } },
  { module: 'Settings — Farm & Alerts', permissions: { admin: true, manager: false, staff: false, viewer: false } },
  { module: 'Settings — Categories', permissions: { admin: true, manager: true, staff: false, viewer: false } },
  { module: 'Settings — User Administration', permissions: { admin: true, manager: false, staff: false, viewer: false } },
];

export function canAccessPage(pageName, role) {
  const userRole = role || 'staff';
  const allowed = PAGE_ACCESS[pageName];
  if (!allowed) return true;
  return allowed.includes(userRole);
}

export function canAccessSettingsTab(tab, role) {
  const userRole = role || 'staff';
  const allowed = SETTINGS_TAB_ACCESS[tab];
  if (!allowed) return false;
  return allowed.includes(userRole);
}

export function filterNavSections(sections, role) {
  const userRole = role || 'staff';
  return sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessPage(item.page, userRole)),
    }))
    .filter(section => section.items.length > 0);
}