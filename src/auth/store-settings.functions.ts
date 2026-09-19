import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveAuthorizedStore } from "@/auth/authorized-store";
import { readStoreSettings, saveStoreDisplayName } from "@/data/store-settings.repository";
import { normalizeDisplayName } from "@/domain/store-settings";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const storeSelectionInput = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .optional(),
});

const updateDisplayNameInput = storeSelectionInput.extend({
  displayName: z.string().max(120),
});

function emailFromClaims(claims: Record<string, unknown>): string | null {
  return typeof claims["email"] === "string" ? claims["email"] : null;
}

export const getCurrentStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => storeSelectionInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const store = await resolveAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      data.slug,
    );

    if (!store) return { store: null, settings: null };

    return {
      store,
      settings: await readStoreSettings(context.supabase, store.id),
    };
  });

export const updateCurrentStoreDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => updateDisplayNameInput.parse(input))
  .handler(async ({ data, context }) => {
    const store = await resolveAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      data.slug,
    );

    if (!store) throw new Error("Nenhuma loja autorizada foi selecionada.");

    return saveStoreDisplayName(context.supabase, store.id, normalizeDisplayName(data.displayName));
  });
