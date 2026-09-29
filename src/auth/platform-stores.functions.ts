import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { readPlatformStores, savePlatformStoreRecord } from "@/data/platform-stores.repository";
import { STORE_STATUSES } from "@/domain/access";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const savePlatformStoreInput = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(STORE_STATUSES),
  storeAdminUserIds: z.array(z.string().uuid()).superRefine((userIds, context) => {
    if (new Set(userIds).size !== userIds.length) {
      context.addIssue({ code: "custom", message: "Há usuários duplicados na seleção." });
    }
  }),
});

async function requireSuperAdmin(client: Parameters<typeof readPlatformStores>[0]) {
  const { data, error } = await client.rpc("is_super_admin");
  if (error) throw error;
  if (!data) throw new Error("Acesso restrito ao super_admin.");
}

export const getPlatformStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase);
    return readPlatformStores(context.supabase);
  });

export const savePlatformStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => savePlatformStoreInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase);
    return savePlatformStoreRecord(context.supabase, data);
  });
