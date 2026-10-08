import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuthorizedStore } from "@/auth/authorized-store";
import { hasStorePermission } from "@/data/access.repository";
import { readCatalog } from "@/data/catalog.repository";
import { readStoreSettings } from "@/data/store-settings.repository";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const storefrontInput = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .optional(),
});

function emailFromClaims(claims: Record<string, unknown>): string | null {
  return typeof claims["email"] === "string" ? claims["email"] : null;
}

export const getCurrentStorefrontFoundation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => storefrontInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const store = await requireAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      "catalog.view",
      data.slug,
    );

    if (!(await hasStorePermission(context.supabase, store.id, "settings.view"))) {
      throw new Error("Você não tem permissão para executar esta operação.");
    }

    const [settings, catalog] = await Promise.all([
      readStoreSettings(context.supabase, store.id),
      readCatalog(context.supabase, store.id),
    ]);

    return { store, settings, ...catalog };
  });
