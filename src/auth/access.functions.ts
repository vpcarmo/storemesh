import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveAuthorizedStore } from "@/auth/authorized-store";
import { ensureProfile, readAccessContext, readAuthorizedStores } from "@/data/access.repository";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const authorizedStoreInput = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .optional(),
});

function emailFromClaims(claims: Record<string, unknown>): string | null {
  return typeof claims["email"] === "string" ? claims["email"] : null;
}

export const getAccessContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureProfile(context.supabase, context.userId);

    return readAccessContext(context.supabase, context.userId, emailFromClaims(context.claims));
  });

export const getAuthorizedStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => authorizedStoreInput.parse(input))
  .handler(({ data, context }) =>
    resolveAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      data.slug,
    ),
  );

export const getAuthorizedStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureProfile(context.supabase, context.userId);
    const access = await readAccessContext(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
    );

    return readAuthorizedStores(context.supabase, access);
  });
