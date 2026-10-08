import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isSuperAdmin,
  isPermission,
  type AccessContext,
  type Permission,
  type RoleAssignment,
  type StoreAccess,
} from "@/domain/access";
import type { Database } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type AccessFunctions = {
  current_permissions: { Args: never; Returns: string[] };
  check_store_permission: {
    Args: { _store_id: string; _permission: string };
    Returns: boolean;
  };
};
type AccessDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & AccessFunctions;
  };
};

function accessRpcClient(client: AppClient): SupabaseClient<AccessDatabase> {
  return client as SupabaseClient<AccessDatabase>;
}

export async function ensureProfile(client: AppClient, userId: string): Promise<void> {
  const { error } = await client.from("profiles").upsert({ id: userId }, { onConflict: "id" });

  if (error) throw error;
}

export async function readAccessContext(
  client: AppClient,
  userId: string,
  email: string | null,
): Promise<AccessContext> {
  const [profileResult, rolesResult, permissionsResult] = await Promise.all([
    client.from("profiles").select("full_name").eq("id", userId).single(),
    client.from("user_roles").select("role, store_id").eq("user_id", userId),
    accessRpcClient(client).rpc("current_permissions"),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (permissionsResult.error) throw permissionsResult.error;

  const permissions: Permission[] = permissionsResult.data.map((permission) => {
    if (!isPermission(permission)) {
      throw new Error("O backend retornou uma permissão desconhecida.");
    }
    return permission;
  });

  const storeIds = rolesResult.data
    .map((assignment) => assignment.store_id)
    .filter((storeId): storeId is string => storeId !== null);

  const storesResult = storeIds.length
    ? await client.from("stores").select("id, name, slug, status").in("id", storeIds)
    : { data: [], error: null };

  if (storesResult.error) throw storesResult.error;

  const storesById = new Map(storesResult.data.map((store) => [store.id, store]));
  const assignments: RoleAssignment[] = rolesResult.data.map((assignment) => ({
    role: assignment.role,
    storeId: assignment.store_id,
    store: assignment.store_id ? (storesById.get(assignment.store_id) ?? null) : null,
  }));

  return {
    userId,
    email,
    fullName: profileResult.data.full_name,
    assignments,
    permissions,
  };
}

export async function hasStorePermission(
  client: AppClient,
  storeId: string,
  permission: Permission,
): Promise<boolean> {
  const { data, error } = await accessRpcClient(client).rpc("check_store_permission", {
    _store_id: storeId,
    _permission: permission,
  });

  if (error) throw error;
  return data;
}

export async function readAuthorizedStoreBySlug(
  client: AppClient,
  slug: string,
): Promise<StoreAccess | null> {
  const { data, error } = await client
    .from("stores")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function readAuthorizedStores(
  client: AppClient,
  access: AccessContext,
): Promise<StoreAccess[]> {
  if (isSuperAdmin(access)) {
    const { data, error } = await client
      .from("stores")
      .select("id, name, slug, status")
      .eq("status", "active")
      .order("name");

    if (error) throw error;
    return data;
  }

  const stores = new Map<string, StoreAccess>();

  for (const assignment of access.assignments) {
    if (assignment.role === "store_admin" && assignment.store) {
      stores.set(assignment.store.id, assignment.store);
    }
  }

  return [...stores.values()].sort((left, right) => left.name.localeCompare(right.name));
}
