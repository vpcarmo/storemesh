import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccessContext, RoleAssignment, StoreAccess } from "@/domain/access";
import type { Database } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;

export async function ensureProfile(client: AppClient, userId: string): Promise<void> {
  const { error } = await client.from("profiles").upsert({ id: userId }, { onConflict: "id" });

  if (error) throw error;
}

export async function readAccessContext(
  client: AppClient,
  userId: string,
  email: string | null,
): Promise<AccessContext> {
  const [profileResult, rolesResult] = await Promise.all([
    client.from("profiles").select("full_name").eq("id", userId).single(),
    client.from("user_roles").select("role, store_id").eq("user_id", userId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (rolesResult.error) throw rolesResult.error;

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
  };
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
