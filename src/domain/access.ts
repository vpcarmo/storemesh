export const APP_ROLES = ["super_admin", "store_admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface StoreAccess {
  id: string;
  name: string;
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