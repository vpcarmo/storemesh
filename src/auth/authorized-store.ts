import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ensureProfile,
  readAccessContext,
  readAuthorizedStoreBySlug,
} from "@/data/access.repository";
import { canAccessStore, resolveAssignedStore, type StoreAccess } from "@/domain/access";
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
