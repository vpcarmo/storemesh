import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  invitePlatformUser,
  readPlatformUsers,
  revokePlatformUserAccess,
  savePlatformUserRecord,
} from "@/data/platform-stores.repository";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteInput = z
  .object({
    email: z.string().trim().email().max(254),
    role: z.enum(["super_admin", "store_admin"]),
    storeIds: z
      .array(z.string().uuid())
      .max(100)
      .superRefine((storeIds, context) => {
        if (new Set(storeIds).size !== storeIds.length) {
          context.addIssue({ code: "custom", message: "Há lojas duplicadas na seleção." });
        }
      }),
  })
  .superRefine((input, context) => {
    if (input.role === "super_admin" && input.storeIds.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["storeIds"],
        message: "Super Admin não pode receber associação com lojas.",
      });
    }
    if (input.role === "store_admin" && input.storeIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["storeIds"],
        message: "Selecione pelo menos uma loja para Store Admin.",
      });
    }
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
    const appUrl = process.env["APP_URL"];
    let redirectTo: string;
    try {
      if (!appUrl) throw new Error("APP_URL is not configured.");
      const baseUrl = new URL(appUrl);
      if (
        !["http:", "https:"].includes(baseUrl.protocol) ||
        (process.env["NODE_ENV"] === "production" && baseUrl.protocol !== "https:") ||
        baseUrl.username ||
        baseUrl.password ||
        baseUrl.search ||
        baseUrl.hash
      ) {
        throw new Error("APP_URL is invalid.");
      }
      redirectTo = new URL("/auth/accept-invite", baseUrl.origin).toString();
    } catch (error) {
      console.error("[Platform users] Could not resolve the configured invite redirect.", {
        userId: context.userId,
        error,
      });
      throw new Error("Convites indisponíveis. Configure a URL pública da aplicação no servidor.");
    }

    if (data.role === "store_admin") {
      const { data: stores, error } = await supabaseAdmin
        .from("stores")
        .select("id")
        .in("id", data.storeIds);
      if (error) {
        console.error("[Platform users] Could not validate invite stores.", {
          userId: context.userId,
          error,
        });
        throw new Error("Não foi possível validar as lojas selecionadas.");
      }
      if (stores.length !== data.storeIds.length) {
        throw new Error("Uma ou mais lojas selecionadas não existem.");
      }
    }

    let invitedUserId: string;
    try {
      invitedUserId = await invitePlatformUser(supabaseAdmin, data.email.toLowerCase(), redirectTo);
    } catch (error) {
      console.error("[Platform users] Could not send a user invitation.", {
        userId: context.userId,
        error,
      });
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "email_exists" || error.code === "user_already_exists")
      ) {
        throw new Error("Este e-mail já pertence a uma conta. Gerencie o usuário existente.");
      }
      throw new Error("Não foi possível enviar o convite. Verifique o e-mail e tente novamente.");
    }

    try {
      await savePlatformUserRecord(context.supabase, {
        userId: invitedUserId,
        fullName: "",
        isSuperAdmin: data.role === "super_admin",
        storeIds: data.storeIds,
      });
    } catch (error) {
      console.error("[Platform users] Invitation succeeded but access provisioning failed.", {
        actorUserId: context.userId,
        invitedUserId,
        error,
      });
      throw new Error(
        "O convite foi enviado, mas a atribuição de acesso falhou. A conta permanece sem acesso administrativo; corrija o usuário em /admin/users.",
      );
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
