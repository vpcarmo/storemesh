import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoreStatus } from "@/domain/access";
import type { Database, Tables } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type StoreRow = Pick<Tables<"stores">, "id" | "name" | "slug" | "status" | "created_at">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "full_name">;
type RoleRow = Pick<Tables<"user_roles">, "user_id" | "role" | "store_id">;

export interface PlatformStoreAdmin {
  userId: string;
  fullName: string | null;
  isSuperAdmin: boolean;
}

export interface PlatformStore extends Omit<StoreRow, "status" | "created_at"> {
  status: StoreStatus;
  created_at: string;
  administrators: PlatformStoreAdmin[];
}

export interface PlatformUser {
  id: string;
  fullName: string | null;
  isSuperAdmin: boolean;
}

export async function readPlatformStores(client: AppClient) {
  const [storesResult, profilesResult, rolesResult] = await Promise.all([
    client.from("stores").select("id, name, slug, status, created_at").order("name"),
    client.from("profiles").select("id, full_name").order("full_name"),
    client.from("user_roles").select("user_id, role, store_id"),
  ]);
  const eligibleUsersResult = await client.rpc("list_platform_store_users");

  if (storesResult.error) throw storesResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (eligibleUsersResult.error) throw eligibleUsersResult.error;

  const profiles = profilesResult.data as ProfileRow[];
  const roles = rolesResult.data as RoleRow[];
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const superAdminIds = new Set(
    roles.filter((role) => role.role === "super_admin").map((role) => role.user_id),
  );
  const administratorsByStore = new Map<string, PlatformStoreAdmin[]>();

  for (const role of roles) {
    if (role.role !== "store_admin" || !role.store_id) continue;

    const administrators = administratorsByStore.get(role.store_id) ?? [];
    administrators.push({
      userId: role.user_id,
      fullName: profilesById.get(role.user_id)?.full_name ?? null,
      isSuperAdmin: superAdminIds.has(role.user_id),
    });
    administratorsByStore.set(role.store_id, administrators);
  }

  const users: PlatformUser[] = eligibleUsersResult.data.map((user) => ({
    id: user.user_id,
    fullName: user.full_name,
    isSuperAdmin: false,
  }));

  return {
    stores: (storesResult.data as StoreRow[]).map((store) => ({
      ...store,
      administrators: administratorsByStore.get(store.id) ?? [],
    })),
    users,
  };
}

export async function savePlatformStoreRecord(
  client: AppClient,
  input: {
    id: string | null;
    name: string;
    slug: string;
    status: StoreStatus;
    storeAdminUserIds: string[];
  },
): Promise<string> {
  const { data, error } = await client.rpc("save_platform_store", {
    p_store_id: input.id,
    p_name: input.name,
    p_slug: input.slug,
    p_status: input.status,
    p_store_admin_user_ids: input.storeAdminUserIds,
  });

  if (error) {
    if (error.code === "23505" && error.message.includes("stores_slug_unique")) {
      throw new Error("Este slug já está sendo usado por outra loja.");
    }
    if (error.code === "23514" && error.message.includes("stores_slug_format")) {
      throw new Error("O slug deve conter somente letras minúsculas, números e hífens.");
    }
    throw error;
  }

  if (!data) throw new Error("A operação não retornou a loja salva.");
  return data;
}
