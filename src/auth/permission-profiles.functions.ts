import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSuperAdmin } from "@/auth/require-super-admin";
import { PERMISSIONS } from "@/domain/access";
import {
  createPermissionProfile as createPermissionProfileRecord,
  deletePermissionProfile as deletePermissionProfileRecord,
  readPermissionProfiles,
  updatePermissionProfile as updatePermissionProfileRecord,
  assignPermissionProfile,
} from "@/data/permission-profiles.repository";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const profileFields = z
  .object({
    name: z.string().trim().min(1).max(120),
    permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length),
  })
  .strict();
const permissionProfileInput = profileFields.superRefine(({ permissions }, context) => {
  if (new Set(permissions).size !== permissions.length) {
    context.addIssue({ code: "custom", path: ["permissions"], message: "Permissão duplicada." });
  }
});
const updateProfileInput = profileFields
  .extend({ id: z.string().uuid() })
  .strict()
  .superRefine(({ permissions }, context) => {
    if (new Set(permissions).size !== permissions.length) {
      context.addIssue({ code: "custom", path: ["permissions"], message: "Permissão duplicada." });
    }
  });
const deleteProfileInput = z.object({ profileId: z.string().uuid() }).strict();
const assignProfileInput = z
  .object({
    userId: z.string().uuid(),
    permissionProfileId: z.string().uuid().nullable(),
  })
  .strict();

export const getPermissionProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      return await readPermissionProfiles(supabaseAdmin);
    } catch (error) {
      console.error("[Permission profiles] Could not list profiles.", {
        actorUserId: context.userId,
        error,
      });
      throw new Error("Não foi possível carregar os perfis de acesso.");
    }
  });

export const createPermissionProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => permissionProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await createPermissionProfileRecord(supabaseAdmin, data);
    } catch (error) {
      const databaseError = error as { code?: unknown };
      if (databaseError.code === "23505") {
        throw new Error("Já existe um perfil com esse nome.");
      }
      console.error("[Permission profiles] Could not create profile.", {
        actorUserId: context.userId,
        error,
      });
      throw new Error("Não foi possível criar o perfil de acesso.");
    }
  });

export const updatePermissionProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => updateProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await updatePermissionProfileRecord(supabaseAdmin, data);
    } catch (error) {
      const databaseError = error as { code?: unknown };
      if (databaseError.code === "23505") {
        throw new Error("Já existe outro perfil com esse nome.");
      }
      console.error("[Permission profiles] Could not update profile.", {
        actorUserId: context.userId,
        profileId: data.id,
        error,
      });
      if (error instanceof Error && error.message === "O perfil de acesso não foi encontrado.") {
        throw error;
      }
      throw new Error("Não foi possível salvar as alterações do perfil.");
    }
  });

export const deletePermissionProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => deleteProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await deletePermissionProfileRecord(supabaseAdmin, data.profileId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Este perfil")) throw error;
      console.error("[Permission profiles] Could not delete profile.", {
        actorUserId: context.userId,
        profileId: data.profileId,
        error,
      });
      if (error instanceof Error && error.message === "O perfil de acesso não foi encontrado.") {
        throw error;
      }
      throw new Error("Não foi possível excluir o perfil de acesso.");
    }
  });

export const assignPermissionProfileToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => assignProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await assignPermissionProfile(supabaseAdmin, data);
    } catch (error) {
      console.error("[Permission profiles] Could not update user profile assignment.", {
        actorUserId: context.userId,
        targetUserId: data.userId,
        error,
      });
      throw error instanceof Error
        ? error
        : new Error("Não foi possível atualizar o perfil de acesso do usuário.");
    }
  });
