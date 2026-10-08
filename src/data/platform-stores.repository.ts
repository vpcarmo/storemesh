import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { StoreStatus } from "@/domain/access";
import type { Database, Tables } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type StoreRow = Pick<Tables<"stores">, "id" | "name" | "slug" | "status" | "created_at">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "full_name">;
type RoleRow = Pick<Tables<"user_roles">, "user_id" | "role" | "store_id">;
type ManagedUserRoleRow = Pick<Tables<"user_roles">, "id" | "user_id" | "role" | "store_id">;
type SavePlatformStoreArgs = Omit<
  Database["public"]["Functions"]["save_platform_store"]["Args"],
  "p_store_id"
> & { p_store_id: string | null };

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

export interface PlatformManagedUser {
  id: string;
  email: string | null;
  fullName: string | null;
  isSuperAdmin: boolean;
  storeIds: string[];
  stores: Pick<StoreRow, "id" | "name" | "slug">[];
  status: "active" | "invited" | "no_access";
}

export class PlatformUserInviteError extends Error {}

function platformUserStatus(
  user: Pick<User, "invited_at" | "email_confirmed_at">,
  hasRoles: boolean,
): PlatformManagedUser["status"] {
  if (user.invited_at && !user.email_confirmed_at) return "invited";
  if (hasRoles) return "active";
  return "no_access";
}

// Auth users are identities; profiles hold application profile data and user_roles grant StoreMesh access.
async function listAllAuthUsers(client: AppClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 100) break;
  }

  return users;
}

export async function findPlatformAuthUserByEmail(
  client: AppClient,
  email: string,
): Promise<{ id: string; email_confirmed_at: string | null } | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = (await listAllAuthUsers(client)).find(
    (authUser) => authUser.email?.toLowerCase() === normalizedEmail,
  );

  return user ? { id: user.id, email_confirmed_at: user.email_confirmed_at ?? null } : null;
}

export async function readPlatformUsers(client: AppClient): Promise<PlatformManagedUser[]> {
  const authUsers = await listAllAuthUsers(client);

  const [profilesResult, rolesResult, storesResult] = await Promise.all([
    client.from("profiles").select("id, full_name"),
    client.from("user_roles").select("id, user_id, role, store_id"),
    client.from("stores").select("id, name, slug"),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (storesResult.error) throw storesResult.error;

  const profilesById = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
  const storesById = new Map(storesResult.data.map((store) => [store.id, store]));
  const rolesByUser = new Map<string, ManagedUserRoleRow[]>();
  for (const role of rolesResult.data as ManagedUserRoleRow[]) {
    const userRoles = rolesByUser.get(role.user_id) ?? [];
    userRoles.push(role);
    rolesByUser.set(role.user_id, userRoles);
  }

  return authUsers.map((user) => {
    const roles = rolesByUser.get(user.id) ?? [];
    const storeIds = roles.flatMap((role) =>
      role.role === "store_admin" && role.store_id ? [role.store_id] : [],
    );
    const isSuperAdmin = roles.some((role) => role.role === "super_admin");
    const status = platformUserStatus(user, roles.length > 0);

    return {
      id: user.id,
      email: user.email ?? null,
      fullName: profilesById.get(user.id)?.full_name ?? null,
      isSuperAdmin,
      storeIds,
      stores: storeIds.flatMap((storeId) => {
        const store = storesById.get(storeId);
        return store ? [store] : [];
      }),
      status,
    };
  });
}

export async function invitePlatformUser(
  client: AppClient,
  email: string,
  redirectTo: string,
): Promise<string> {
  const { data, error } = await client.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) throw error;
  if (!data.user) throw new Error("O Supabase Auth não retornou o usuário convidado.");
  return data.user.id;
}

export async function resendPlatformUserInvite(
  client: AppClient,
  userId: string,
  redirectTo: string,
): Promise<void> {
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error) throw error;
  if (!data.user) throw new PlatformUserInviteError("Usuário não encontrado no Supabase Auth.");

  const user = data.user;
  if (user.email_confirmed_at) {
    throw new PlatformUserInviteError(
      "Este usuário já confirmou o convite. Não é necessário reenviar.",
    );
  }
  if (!user.email?.trim()) {
    throw new PlatformUserInviteError("Este usuário não possui um e-mail válido no Supabase Auth.");
  }

  const { data: roles, error: rolesError } = await client
    .from("user_roles")
    .select("id")
    .eq("user_id", userId);
  if (rolesError) throw rolesError;
  if (platformUserStatus(user, roles.length > 0) !== "invited") {
    throw new PlatformUserInviteError("Este usuário não possui um convite pendente.");
  }

  let invitedUserId: string;
  try {
    invitedUserId = await invitePlatformUser(client, user.email, redirectTo);
  } catch (inviteError) {
    const { data: latestUser, error: lookupError } = await client.auth.admin.getUserById(userId);
    if (lookupError) throw lookupError;
    if (latestUser.user?.email_confirmed_at) {
      throw new PlatformUserInviteError(
        "Este usuário já confirmou o convite. Não é necessário reenviar.",
      );
    }
    throw inviteError;
  }

  if (invitedUserId !== userId) {
    throw new PlatformUserInviteError(
      "O Supabase Auth retornou uma identidade diferente da solicitada.",
    );
  }
}

export async function savePlatformUserRecord(
  client: AppClient,
  input: {
    userId: string;
    fullName: string;
    isSuperAdmin: boolean;
    storeIds: string[];
  },
): Promise<void> {
  const { error } = await client.rpc("manage_platform_user_access", {
    p_user_id: input.userId,
    p_is_super_admin: input.isSuperAdmin,
    p_store_ids: input.storeIds,
    p_full_name: input.fullName.trim(),
    p_revoke_access: false,
    p_update_profile: true,
  });
  if (error) throw error;
}

export async function revokePlatformUserAccess(client: AppClient, userId: string): Promise<void> {
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

export async function removePlatformUserAdministrativeData(
  client: AppClient,
  userId: string,
): Promise<void> {
  const { error } = await client.rpc("manage_platform_user_access", {
    p_user_id: userId,
    p_is_super_admin: false,
    p_store_ids: [],
    p_full_name: "",
    p_revoke_access: true,
    p_update_profile: true,
  });
  if (error) throw error;
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
  const args: SavePlatformStoreArgs = {
    p_store_id: input.id,
    p_name: input.name,
    p_slug: input.slug,
    p_status: input.status,
    p_store_admin_user_ids: input.storeAdminUserIds,
  };
  const { data, error } = await client.rpc(
    "save_platform_store",
    args as Database["public"]["Functions"]["save_platform_store"]["Args"],
  );

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
