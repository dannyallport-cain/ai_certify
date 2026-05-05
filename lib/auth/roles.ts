export const USER_ROLES = [
  'admin',
  'user',
] as const;

export const ADMIN_ROLES = [
  'admin',
  'owner',
  'manager',
  'sysadmin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  user: 'User',
};

export function isUserRole(role: string): role is UserRole {
  return (USER_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return role != null && (ADMIN_ROLES as readonly string[]).includes(role);
}
