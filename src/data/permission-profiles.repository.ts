import type { SupabaseClient } from "@supabase/supabase-js";

import { PERMISSIONS, type Permission } from "@/domain/access";
import type { PermissionProfile, PermissionProfileSummary } from "@/domain/permission-profiles";
import type { Database } from "@/integrations/supabase/types";

type PermissionProfileRow = {
  id: string;
  name: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
};
type UserPermissionProfileRow = {
  user_id: string;
  permission_profile_id: string;
};
type ProfileTable = {
  Row: PermissionProfileRow;
  Insert: Pick<PermissionProfileRow, "name" | "permissions"> &
    Partial<Pick<PermissionProfileRow, "id" | "created_at" | "updated_at">>;
  Update: Partial<Pick<PermissionProfileRow, "name" | "permissions" | "updated_at">>;
  Relationships: [];
};
type UserProfileTable = {
  Row: UserPermissionProfileRow;
  Insert: UserPermissionProfileRow;
  Update: Partial<UserPermissionProfileRow>;
  Relationships: [];
};
type PermissionProfileDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      permission_profiles: ProfileTable;
      user_permission_profiles: UserProfileTable;
    };
  };
};
type AppClient = SupabaseClient<Database>;

function permissionProfileClient(client: AppClient): SupabaseClient<PermissionProfileDatabase> {
  return client as SupabaseClient<PermissionProfileDatabase>;
}

function parseStoredPermissions(values: string[]): Permission[] {
  const permitted = new Set<string>(PERMISSIONS);
  if (values.some((permission) => !permitted.has(permission))) {
    throw new Error("O banco retornou permissões incompatíveis com o catálogo da aplicação.");
  }
  return values as Permission[];
}

export async function readPermissionProfiles(client: AppClient): Promise<PermissionProfile[]> {
  const typedClient = permissionProfileClient(client);
  const [profilesResult, assignmentsResult] = await Promise.all([
    typedClient
      .from("permission_profiles")
      .select("id, name, permissions, created_at, updated_at")
      .order("name"),
    typedClient.from("user_permission_profiles").select("user_id, permission_profile_id"),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  const counts = new Map<string, number>();
  for (const assignment of assignmentsResult.data) {
    counts.set(
      assignment.permission_profile_id,
      (counts.get(assignment.permission_profile_id) ?? 0) + 1,
    );
  }
  return profilesResult.data.map((profile) => ({
    id: profile.id,
    name: profile.name,
    permissions: parseStoredPermissions(profile.permissions),
    userCount: counts.get(profile.id) ?? 0,
  }));
}

export async function readUserPermissionProfiles(
  client: AppClient,
): Promise<Map<string, PermissionProfileSummary>> {
  const typedClient = permissionProfileClient(client);
  const [assignmentsResult, profilesResult] = await Promise.all([
    typedClient.from("user_permission_profiles").select("user_id, permission_profile_id"),
    typedClient.from("permission_profiles").select("id, name, permissions"),
  ]);
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const profiles = new Map(
    profilesResult.data.map((profile) => [
      profile.id,
      {
        id: profile.id,
        name: profile.name,
        permissions: parseStoredPermissions(profile.permissions),
      },
    ]),
  );
  const result = new Map<string, PermissionProfileSummary>();
  for (const assignment of assignmentsResult.data) {
    const profile = profiles.get(assignment.permission_profile_id);
    if (!profile) throw new Error("Uma associação aponta para um perfil de acesso inexistente.");
    result.set(assignment.user_id, profile);
  }
  return result;
}

export async function createPermissionProfile(
  client: AppClient,
  input: { name: string; permissions: Permission[] },
): Promise<void> {
  const { error } = await permissionProfileClient(client)
    .from("permission_profiles")
    .insert({ name: input.name, permissions: input.permissions });
  if (error) throw error;
}

export async function updatePermissionProfile(
  client: AppClient,
  input: { id: string; name: string; permissions: Permission[] },
): Promise<void> {
  const { data, error } = await permissionProfileClient(client)
    .from("permission_profiles")
    .update({ name: input.name, permissions: input.permissions })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("O perfil de acesso não foi encontrado.");
}

export async function deletePermissionProfile(client: AppClient, profileId: string): Promise<void> {
  const typedClient = permissionProfileClient(client);
  const { count, error: countError } = await typedClient
    .from("user_permission_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("permission_profile_id", profileId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error(
      `Este perfil está associado a ${count} ${count === 1 ? "usuário" : "usuários"}. Atribua esses usuários a outro perfil antes de excluí-lo.`,
    );
  }

  const { data, error } = await typedClient
    .from("permission_profiles")
    .delete()
    .eq("id", profileId)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Este perfil passou a ser utilizado. Atribua os usuários a outro perfil antes de excluí-lo.",
      );
    }
    throw error;
  }
  if (!data) throw new Error("O perfil de acesso não foi encontrado.");
}

export async function assignPermissionProfile(
  client: AppClient,
  input: { userId: string; permissionProfileId: string | null },
): Promise<void> {
  const typedClient = permissionProfileClient(client);
  if (input.permissionProfileId === null) {
    const { error } = await typedClient
      .from("user_permission_profiles")
      .delete()
      .eq("user_id", input.userId);
    if (error) throw error;
    return;
  }

  const { data: roleRows, error: roleError } = await typedClient
    .from("user_roles")
    .select("role")
    .eq("user_id", input.userId);
  if (roleError) throw roleError;
  if (roleRows.some((role) => role.role === "super_admin")) {
    throw new Error("Super Admin possui acesso global e não pode receber um perfil de acesso.");
  }
  if (!roleRows.some((role) => role.role === "store_admin")) {
    throw new Error("Atribua ao usuário pelo menos uma loja como Store Admin antes do perfil.");
  }

  const { error } = await typedClient
    .from("user_permission_profiles")
    .upsert(
      { user_id: input.userId, permission_profile_id: input.permissionProfileId },
      { onConflict: "user_id" },
    );
  if (error) {
    if (error.code === "23503") throw new Error("O perfil ou usuário selecionado não existe.");
    throw error;
  }
}

export async function rollbackInvitedPlatformUser(
  client: AppClient,
  userId: string,
): Promise<void> {
  const { error } = await client.rpc("manage_platform_user_access", {
    p_user_id: userId,
    p_is_super_admin: false,
    p_store_ids: [],
    p_full_name: "",
    p_revoke_access: true,
    p_update_profile: false,
  });
  if (error) throw error;
}
