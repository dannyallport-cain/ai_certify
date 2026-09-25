export const USER_ROLES = [
  'admin',
  'user',
] as const;

// `users.role` is a PostgreSQL enum containing only the values below
// (see migration 0007_role_consolidation.sql). Referencing any other value in
// a query raises `22P02 invalid input value for enum "UserRole"`, so this list
// must stay in sync with the database enum.
export const ADMIN_ROLES = [
  'admin',
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
