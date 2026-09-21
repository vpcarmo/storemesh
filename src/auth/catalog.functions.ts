import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveAuthorizedStore } from "@/auth/authorized-store";
import { readCatalog, saveCategory, saveProduct } from "@/data/catalog.repository";
import { normalizeOptionalText } from "@/domain/catalog";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160);
const storeSelectionSchema = z.object({ slug: slugSchema.nullable().optional() });
const categorySchema = storeSelectionSchema.extend({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  categorySlug: slugSchema,
  description: z.string().max(2000),
  isActive: z.boolean(),
});
const productSchema = storeSelectionSchema.extend({
  id: z.string().uuid().nullable(),
  categoryId: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(160),
  productSlug: slugSchema,
  description: z.string().max(20000),
  price: z.number().min(0).max(9_999_999_999.99),
  isActive: z.boolean(),
});

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

export const getCurrentStoreCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => storeSelectionSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return { store, ...(await readCatalog(context.supabase, store.id)) };
  });

export const saveCurrentStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => categorySchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return saveCategory(context.supabase, store.id, data.id, {
      name: data.name,
      slug: data.categorySlug,
      description: normalizeOptionalText(data.description),
      isActive: data.isActive,
    });
  });

export const saveCurrentStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return saveProduct(context.supabase, store.id, data.id, {
      categoryId: data.categoryId,
      name: data.name,
      slug: data.productSlug,
      description: data.description.trim(),
      price: data.price,
      isActive: data.isActive,
    });
  });