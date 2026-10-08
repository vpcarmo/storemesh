import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ensureProfile,
  hasStorePermission,
  readAccessContext,
  readAuthorizedStoreBySlug,
} from "@/data/access.repository";
import {
  canAccessStore,
  resolveAssignedStore,
  type Permission,
  type StoreAccess,
} from "@/domain/access";
import type { Database } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;

export async function resolveAuthorizedStore(
  client: AppClient,
  userId: string,
  email: string | null,
  slug?: string | null,
): Promise<StoreAccess | null> {
  await ensureProfile(client, userId);
  const access = await readAccessContext(client, userId, email);

  if (!slug) {
    const store = resolveAssignedStore(access);
    return store?.status === "active" ? store : null;
  }

  const store = await readAuthorizedStoreBySlug(client, slug);
  if (!store || store.status !== "active" || !canAccessStore(access, store.id)) return null;

  return store;
}

export async function requireAuthorizedStore(
  client: AppClient,
  userId: string,
  email: string | null,
  permission: Permission,
  slug?: string | null,
): Promise<StoreAccess> {
  const store = await resolveAuthorizedStore(client, userId, email, slug);
  if (!store) throw new Error("Nenhuma loja autorizada foi selecionada.");

  if (!(await hasStorePermission(client, store.id, permission))) {
    throw new Error("Você não tem permissão para executar esta operação.");
  }

  return store;
}
