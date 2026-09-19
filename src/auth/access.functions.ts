import { createServerFn } from "@tanstack/react-start";

import { ensureProfile, readAccessContext } from "@/data/access.repository";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAccessContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureProfile(context.supabase, context.userId);

    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    return readAccessContext(context.supabase, context.userId, email);
  });