import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;

export async function requireSuperAdmin(client: AppClient, userId: string): Promise<void> {
  const { data, error } = await client.rpc("is_super_admin");
  if (error) {
    console.error("[Platform access] Could not verify super_admin access.", {
      userId,
      code: error.code,
      message: error.message,
    });
    throw error;
  }
  if (!data) {
    console.warn("[Platform access] Rejected a non-super_admin request.", { userId });
    throw new Error("Acesso restrito ao super_admin.");
  }
}
