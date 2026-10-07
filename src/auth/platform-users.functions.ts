import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  invitePlatformUser,
  readPlatformUsers,
  revokePlatformUserAccess,
  savePlatformUserRecord,
} from "@/data/platform-stores.repository";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteInput = z.object({
  email: z.string().trim().email().max(254),
});

const saveUserInput = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().max(120),
  isSuperAdmin: z.boolean(),
  storeIds: z
    .array(z.string().uuid())
    .max(100)
    .superRefine((storeIds, context) => {
      if (new Set(storeIds).size !== storeIds.length) {
        context.addIssue({ code: "custom", message: "Há lojas duplicadas na seleção." });
      }
    }),
});

const revokeInput = z.object({ userId: z.string().uuid() });

async function requireSuperAdmin(
  client: Parameters<typeof readPlatformUsers>[0],
  userId: string,
): Promise<void> {
  const { data, error } = await client.rpc("is_super_admin");
  if (error) {
    console.error("[Platform users] Could not verify super_admin access.", { userId, error });
    throw error;
  }
  if (!data) {
    console.warn("[Platform users] Rejected a non-super_admin request.", { userId });
    throw new Error("Acesso restrito ao super_admin.");
  }
}

export const getPlatformUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      return await readPlatformUsers(supabaseAdmin);
    } catch (error) {
      console.error("[Platform users] Could not list platform users.", {
        userId: context.userId,
        error,
      });
      throw error;
    }
  });

export const invitePlatformUserByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => inviteInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await invitePlatformUser(supabaseAdmin, data.email.toLowerCase());
    } catch (error) {
      console.error("[Platform users] Could not send a user invitation.", {
        userId: context.userId,
        error,
      });
      throw error;
    }
  });

export const savePlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => saveUserInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    try {
      await savePlatformUserRecord(context.supabase, data);
    } catch (error) {
      console.error("[Platform users] Could not update user roles or profile.", {
        actorUserId: context.userId,
        targetUserId: data.userId,
        error,
      });
      throw error;
    }
  });

export const revokePlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => revokeInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    try {
      await revokePlatformUserAccess(context.supabase, data.userId);
    } catch (error) {
      console.error("[Platform users] Could not revoke user access.", {
        actorUserId: context.userId,
        targetUserId: data.userId,
        error,
      });
      throw error;
    }
  });
