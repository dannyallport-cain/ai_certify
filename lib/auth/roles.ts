export const USER_ROLES = [
  'supersystemAdmin',
  'systemAdmin',
  'support',
  'owner',
  'member',
  'client',
] as const;

export const ADMIN_ROLES = [
  'supersystemAdmin',
  'systemAdmin',
  'owner',
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  supersystemAdmin: 'Super System Admin',
  systemAdmin: 'System Admin',
  support: 'Support',
  owner: 'Owner',
  member: 'Member',
  client: 'Client',
};

export function isUserRole(role: string): role is UserRole {
  return (USER_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return role !== null && role !== undefined && (ADMIN_ROLES as readonly string[]).includes(role);
}
