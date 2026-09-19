export const APP_ROLES = ["super_admin", "store_admin"] as const;
export const STORE_STATUSES = ["active", "inactive"] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type StoreStatus = (typeof STORE_STATUSES)[number];

export interface StoreAccess {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
}

export interface RoleAssignment {
  role: AppRole;
  storeId: string | null;
  store: StoreAccess | null;
}

export interface AccessContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  assignments: RoleAssignment[];
}

export function isSuperAdmin(context: AccessContext): boolean {
  return context.assignments.some((assignment) => assignment.role === "super_admin");
}

export function canAccessStore(context: AccessContext, storeId: string): boolean {
  return (
    isSuperAdmin(context) ||
    context.assignments.some(
      (assignment) => assignment.role === "store_admin" && assignment.storeId === storeId,
    )
  );
}

export function resolveAssignedStore(context: AccessContext): StoreAccess | null {
  if (isSuperAdmin(context)) return null;

  const stores = new Map<string, StoreAccess>();

  for (const assignment of context.assignments) {
    if (assignment.role === "store_admin" && assignment.store) {
      stores.set(assignment.store.id, assignment.store);
    }
  }

  return stores.size === 1 ? (stores.values().next().value ?? null) : null;
}
