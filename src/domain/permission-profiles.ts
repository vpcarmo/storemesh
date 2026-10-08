import { PERMISSIONS, type Permission } from "@/domain/access";

export const PERMISSION_PROFILE_QUERY_KEY = ["platform", "permission-profiles"] as const;

export const PERMISSION_AREAS = [
  { label: "Website", view: "website.view", manage: "website.manage" },
  { label: "Catálogo", view: "catalog.view", manage: "catalog.manage" },
  { label: "Mídia", view: "media.view", manage: "media.manage" },
  { label: "Configurações", view: "settings.view", manage: "settings.manage" },
] as const satisfies ReadonlyArray<{
  label: string;
  view: Permission;
  manage: Permission;
}>;

export const PERMISSION_LABELS: Record<Permission, string> = {
  "website.view": "Visualizar Website",
  "website.manage": "Gerenciar Website",
  "catalog.view": "Visualizar Catálogo",
  "catalog.manage": "Gerenciar Catálogo",
  "media.view": "Visualizar Mídia",
  "media.manage": "Gerenciar Mídia",
  "settings.view": "Visualizar Configurações",
  "settings.manage": "Gerenciar Configurações",
};

export type PermissionProfile = {
  id: string;
  name: string;
  permissions: Permission[];
  userCount: number;
};

export type PermissionProfileSummary = Pick<PermissionProfile, "id" | "name" | "permissions">;

export function permissionProfileAreas(permissions: readonly Permission[]): string[] {
  return PERMISSION_AREAS.filter((area) =>
    permissions.some((permission) => permission.startsWith(`${area.view.split(".")[0]}.`)),
  ).map((area) => area.label);
}

export function effectiveProfilePermission(
  permissions: readonly Permission[],
  permission: Permission,
): boolean {
  if (permissions.includes(permission)) return true;
  return (
    permission.endsWith(".view") &&
    permissions.includes(`${permission.slice(0, -".view".length)}.manage` as Permission)
  );
}

export { PERMISSIONS };
