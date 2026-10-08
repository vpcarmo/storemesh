import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSuperAdmin } from "@/auth/require-super-admin";
import {
  findPlatformAuthUserByEmail,
  invitePlatformUser,
  readPlatformUsers,
  resendPlatformUserInvite,
  removePlatformUserAdministrativeData,
  revokePlatformUserAccess,
  savePlatformUserRecord,
  PlatformUserInviteError,
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
const resendInviteInput = z.object({ userId: z.string().uuid() });
const deleteUserInput = z.object({ userId: z.string().uuid() }).strict();

class PlatformUserDeletionPartialError extends Error {}

function authErrorDetails(error: unknown): {
  code: string | null;
  message: string | null;
  status: number | null;
} {
  if (!error || typeof error !== "object") {
    return { code: null, message: null, status: null };
  }

  const candidate = error as { code?: unknown; message?: unknown; status?: unknown };
  return {
    code: typeof candidate.code === "string" ? candidate.code : null,
    message: typeof candidate.message === "string" ? candidate.message : null,
    status: typeof candidate.status === "number" ? candidate.status : null,
  };
}

function isExistingAuthIdentityError(error: unknown): boolean {
  const { code } = authErrorDetails(error);
  return code === "email_exists" || code === "user_already_exists";
}

function resolvePlatformInviteRedirect(actorUserId: string): string {
  const appUrl = process.env["APP_URL"]?.trim();
  if (!appUrl) {
    console.error("[Platform users] Could not resolve the configured invite redirect.", {
      actorUserId,
      reason: "APP_URL is not configured.",
    });
    throw new Error(
      "Convite bloqueado: APP_URL não está configurada no ambiente servidor da aplicação.",
    );
  }

  try {
    const baseUrl = new URL(appUrl);
    if (
      !["http:", "https:"].includes(baseUrl.protocol) ||
      (process.env["NODE_ENV"] !== "development" && baseUrl.protocol !== "https:") ||
      !baseUrl.hostname ||
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.pathname !== "/" ||
      baseUrl.search ||
      baseUrl.hash
    ) {
      throw new Error("APP_URL is invalid.");
    }
    return `${baseUrl.origin}/auth/accept-invite`;
  } catch {
    console.error("[Platform users] Could not resolve the configured invite redirect.", {
      actorUserId,
      reason: "APP_URL is invalid.",
    });
    throw new Error(
      "Convite bloqueado: APP_URL é inválida. Configure a origem pública correta no ambiente servidor.",
    );
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
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const inviteData = inviteInput.parse(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo = resolvePlatformInviteRedirect(context.userId);

    if (inviteData.role === "store_admin") {
      const { data: stores, error } = await supabaseAdmin
        .from("stores")
        .select("id")
        .in("id", inviteData.storeIds);
      if (error) {
        console.error("[Platform users] Could not validate invite stores.", {
          userId: context.userId,
          error,
        });
        throw new Error("Não foi possível validar as lojas selecionadas.");
      }
      if (stores.length !== inviteData.storeIds.length) {
        throw new Error("Uma ou mais lojas selecionadas não existem.");
      }
    }

    const email = inviteData.email.trim().toLowerCase();
    let existingAuthUser: Awaited<ReturnType<typeof findPlatformAuthUserByEmail>>;
    try {
      existingAuthUser = await findPlatformAuthUserByEmail(supabaseAdmin, email);
    } catch (error) {
      console.error("[Platform users] Could not check for an existing Auth identity.", {
        userId: context.userId,
        authError: authErrorDetails(error),
      });
      throw new Error(
        "Não foi possível verificar se este e-mail já possui uma conta. Nenhum convite foi criado.",
      );
    }

    if (existingAuthUser) {
      throw new Error(
        existingAuthUser.email_confirmed_at
          ? "Este e-mail já possui uma conta no StoreMesh. Gerencie o usuário existente em Usuários."
          : "Já existe uma conta pendente para este e-mail. Finalize o convite existente ou utilize o fluxo de gerenciamento disponível.",
      );
    }

    let invitedUserId: string;
    try {
      invitedUserId = await invitePlatformUser(supabaseAdmin, email, redirectTo);
    } catch (error) {
      console.error("[Platform users] Could not send a user invitation.", {
        userId: context.userId,
        authError: authErrorDetails(error),
      });
      if (isExistingAuthIdentityError(error)) {
        try {
          existingAuthUser = await findPlatformAuthUserByEmail(supabaseAdmin, email);
        } catch (lookupError) {
          console.error("[Platform users] Could not classify an existing Auth identity.", {
            userId: context.userId,
            authError: authErrorDetails(lookupError),
          });
        }
        if (existingAuthUser) {
          throw new Error(
            existingAuthUser.email_confirmed_at
              ? "Este e-mail já possui uma conta no StoreMesh. Gerencie o usuário existente em Usuários."
              : "Já existe uma conta pendente para este e-mail. Finalize o convite existente ou utilize o fluxo de gerenciamento disponível.",
          );
        }
        throw new Error(
          "Este e-mail já possui uma conta no StoreMesh. Gerencie o usuário existente em Usuários.",
        );
      }
      throw new Error(
        "Não foi possível enviar o convite. Verifique a configuração de e-mail do projeto.",
      );
    }

    try {
      await savePlatformUserRecord(context.supabase, {
        userId: invitedUserId,
        fullName: "",
        isSuperAdmin: inviteData.role === "super_admin",
        storeIds: inviteData.role === "store_admin" ? inviteData.storeIds : [],
      });
    } catch (error) {
      console.error("[Platform users] Invitation succeeded but access provisioning failed.", {
        actorUserId: context.userId,
        invitedUserId,
        error,
      });
      throw new Error(
        "O Supabase Auth aceitou o convite, mas a atribuição de acesso falhou. A conta permanece sem acesso administrativo; corrija o usuário em /admin/users.",
      );
    }
  });

export const resendPlatformUserInviteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { userId } = resendInviteInput.parse(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo = resolvePlatformInviteRedirect(context.userId);

    try {
      await resendPlatformUserInvite(supabaseAdmin, userId, redirectTo);
    } catch (error) {
      const authError = authErrorDetails(error);
      console.error("[Platform users] Could not resend a user invitation.", {
        actorUserId: context.userId,
        targetUserId: userId,
        error: authError,
      });
      if (error instanceof PlatformUserInviteError) throw error;
      if (authError.code === "over_email_send_rate_limit" || authError.status === 429) {
        throw new Error(
          "Não foi possível reenviar agora. Aguarde alguns minutos e tente novamente.",
        );
      }
      if (authError.status === 404) {
        throw new Error("Usuário não encontrado no Supabase Auth.");
      }
      throw new Error(
        "Não foi possível reenviar o convite. Verifique a configuração de e-mail do projeto.",
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

export const deletePlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => deleteUserInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Você não pode excluir sua própria conta.");
    }

    try {
      await removePlatformUserAdministrativeData(context.supabase, data.userId);
    } catch (error) {
      const details = authErrorDetails(error);
      console.error("[Platform users] Could not prepare user deletion.", {
        actorUserId: context.userId,
        targetUserId: data.userId,
        operation: "delete_platform_user",
        stage: "postgres_revoke",
        error: details,
      });
      if (
        details.code === "23514" &&
        details.message?.includes("Cannot remove the last super_admin")
      ) {
        throw new Error("Não é possível excluir o último Super Admin da plataforma.");
      }
      throw new Error("Não foi possível excluir o usuário.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isMissingAuthUser = (error: unknown): boolean => {
      const details = authErrorDetails(error);
      return (
        details.status === 404 || details.code === "user_not_found" || details.code === "not_found"
      );
    };
    const throwPartialFailure = (stage: string, error: unknown): never => {
      console.error(
        "[Platform users] Administrative access was revoked but Auth deletion failed.",
        {
          actorUserId: context.userId,
          targetUserId: data.userId,
          operation: "delete_platform_user",
          stage,
          error: authErrorDetails(error),
        },
      );
      throw new PlatformUserDeletionPartialError(
        "O acesso administrativo foi removido, mas a identidade do Auth não pôde ser excluída. Tente novamente.",
      );
    };

    let authUser: Awaited<ReturnType<typeof supabaseAdmin.auth.admin.getUserById>>["data"]["user"] =
      null;
    try {
      const result = await supabaseAdmin.auth.admin.getUserById(data.userId);
      if (result.error) {
        if (!isMissingAuthUser(result.error)) throwPartialFailure("auth_lookup", result.error);
        authUser = null;
      } else {
        authUser = result.data.user;
      }
    } catch (error) {
      if (error instanceof PlatformUserDeletionPartialError) {
        throw error;
      }
      throwPartialFailure("auth_lookup", error);
    }

    if (authUser && authUser.id !== data.userId) {
      throwPartialFailure(
        "auth_identity_validation",
        new Error("Auth returned a different user ID."),
      );
    }
    if (
      authUser &&
      !authUser.email?.trim() &&
      !authUser.phone?.trim() &&
      (authUser.identities?.length ?? 0) === 0
    ) {
      throwPartialFailure(
        "auth_identity_validation",
        new Error("Auth user has no valid identity."),
      );
    }

    if (authUser) {
      try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
        if (error && !isMissingAuthUser(error)) throw error;
      } catch (error) {
        throwPartialFailure("auth_delete", error);
      }
    }

    try {
      await removePlatformUserAdministrativeData(context.supabase, data.userId);
    } catch (error) {
      console.error("[Platform users] Could not finish post-Auth user cleanup.", {
        actorUserId: context.userId,
        targetUserId: data.userId,
        operation: "delete_platform_user",
        stage: "postgres_post_auth_cleanup",
        error: authErrorDetails(error),
      });
      throw new Error(
        "O usuário foi removido do Auth, mas não foi possível concluir a limpeza administrativa. Tente novamente.",
      );
    }
  });
