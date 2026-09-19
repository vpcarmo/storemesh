import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  ensureProfile,
  readAccessContext,
  readAuthorizedStoreBySlug,
} from "@/data/access.repository";
import { canAccessStore, resolveAssignedStore } from "@/domain/access";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const authorizedStoreInput = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .optional(),
});

function emailFromClaims(claims: Record<string, unknown>): string | null {
  return typeof claims.email === "string" ? claims.email : null;
}

export const getAccessContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureProfile(context.supabase, context.userId);

    return readAccessContext(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
    );
  });

export const getAuthorizedStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => authorizedStoreInput.parse(input))
  .handler(async ({ data, context }) => {
    const access = await readAccessContext(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
    );

    if (!data.slug) return resolveAssignedStore(access);

    const store = await readAuthorizedStoreBySlug(context.supabase, data.slug);
    if (!store || !canAccessStore(access, store.id)) return null;

    return store;
  });
