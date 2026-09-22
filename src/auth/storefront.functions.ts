import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveAuthorizedStore } from "@/auth/authorized-store";
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
    const store = await resolveAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      data.slug,
    );

    if (!store) return { store: null, settings: null, categories: [], products: [] };

    const [settings, catalog] = await Promise.all([
      readStoreSettings(context.supabase, store.id),
      readCatalog(context.supabase, store.id),
    ]);

    return { store, settings, ...catalog };
  });