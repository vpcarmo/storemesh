import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveAuthorizedStore } from "@/auth/authorized-store";
import {
  createExternalMedia,
  createMediaUpload,
  deleteMediaAsset,
  readMediaAssets,
  saveUploadedMedia,
  updateMediaAlt,
} from "@/data/media.repository";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const storeSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160)
    .nullable()
    .optional(),
});
const uuidSchema = z.string().uuid();
const externalMediaSchema = storeSchema.extend({
  url: z
    .string()
    .url()
    .max(2000)
    .refine((value) => /^https?:\/\//i.test(value)),
  alt: z.string().trim().max(500).nullable(),
});
const uploadStartSchema = storeSchema.extend({
  filename: z.string().trim().min(1).max(255),
  mimeType: z
    .string()
    .regex(/^image\/[a-z0-9.+-]+$/i)
    .max(255),
  size: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
});
const uploadCompleteSchema = storeSchema.extend({
  path: z.string().min(1).max(500),
  mimeType: z
    .string()
    .regex(/^image\/[a-z0-9.+-]+$/i)
    .max(255),
  size: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});
const updateSchema = storeSchema.extend({
  id: uuidSchema,
  alt: z.string().trim().max(500).nullable(),
});
const deleteSchema = storeSchema.extend({ id: uuidSchema });

function emailFromClaims(claims: Record<string, unknown>): string | null {
  return typeof claims["email"] === "string" ? claims["email"] : null;
}

async function authorizedStore(
  context: Parameters<typeof resolveAuthorizedStore>[0],
  userId: string,
  claims: Record<string, unknown>,
  slug?: string | null,
) {
  const store = await resolveAuthorizedStore(context, userId, emailFromClaims(claims), slug);
  if (!store) throw new Error("Nenhuma loja autorizada foi selecionada.");
  return store;
}

export const getCurrentStoreMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => storeSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return readMediaAssets(context.supabase, store.id);
  });

export const createCurrentStoreExternalMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => externalMediaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return createExternalMedia(context.supabase, store.id, data);
  });

export const startCurrentStoreMediaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => uploadStartSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return createMediaUpload(context.supabase, store.id, data.filename);
  });

export const completeCurrentStoreMediaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => uploadCompleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return saveUploadedMedia(context.supabase, store.id, data);
  });

export const updateCurrentStoreMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return updateMediaAlt(context.supabase, store.id, data.id, data.alt);
  });

export const deleteCurrentStoreMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return deleteMediaAsset(context.supabase, store.id, data.id);
  });
