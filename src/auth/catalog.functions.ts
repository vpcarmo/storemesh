import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveAuthorizedStore } from "@/auth/authorized-store";
import {
  deleteCatalogAttribute,
  deleteCatalogAttributeValue,
  deleteProductImage,
  deleteProductVariant,
  readCatalog,
  replaceProductAttributeValues,
  replaceVariantAttributeValues,
  saveCatalogAttribute,
  saveCatalogAttributeValue,
  saveCategory,
  saveProduct,
  saveProductImage,
  saveProductVariant,
} from "@/data/catalog.repository";
import { normalizeOptionalText } from "@/domain/catalog";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(160);
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
  description: z.string().trim().min(1).max(20000),
  price: z.number().min(0).max(9_999_999_999.99),
  isActive: z.boolean(),
});
const uuidSchema = z.string().uuid();
const attributeSchema = storeSelectionSchema.extend({
  id: uuidSchema.nullable(),
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/)
    .max(120),
  displayType: z.enum(["text", "swatch"]),
  isFilterable: z.boolean(),
  isVariantAxis: z.boolean(),
  position: z.number().int().min(0),
});
const attributeValueSchema = storeSelectionSchema.extend({
  id: uuidSchema.nullable(),
  attributeId: uuidSchema,
  value: z.string().trim().min(1).max(160),
  label: z.string().trim().min(1).max(160),
  swatchValue: z.string().trim().max(160).nullable(),
  position: z.number().int().min(0),
});
const productAttributeValuesSchema = storeSelectionSchema.extend({
  productId: uuidSchema,
  attributeValueIds: z.array(uuidSchema).max(100),
});
const variantSchema = storeSelectionSchema.extend({
  id: uuidSchema.nullable(),
  productId: uuidSchema,
  sku: z.string().trim().min(1).max(160).nullable(),
  price: z.number().min(0).max(9_999_999_999.99),
  compareAtPrice: z.number().min(0).max(9_999_999_999.99).nullable(),
  isActive: z.boolean(),
  position: z.number().int().min(0),
});
const variantAttributeValuesSchema = storeSelectionSchema.extend({
  variantId: uuidSchema,
  values: z.array(z.object({ attributeId: uuidSchema, attributeValueId: uuidSchema })).max(20),
});
const imageSchema = storeSelectionSchema.extend({
  id: uuidSchema.nullable(),
  productId: uuidSchema,
  url: z.string().url().max(2000),
  altText: z.string().trim().max(500).nullable(),
  position: z.number().int().min(0),
  isPrimary: z.boolean(),
});
const deleteSchema = storeSelectionSchema.extend({ id: uuidSchema });

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

export const saveCurrentStoreCatalogAttribute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => attributeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return saveCatalogAttribute(context.supabase, store.id, data.id, data);
  });
export const deleteCurrentStoreCatalogAttribute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return deleteCatalogAttribute(context.supabase, store.id, data.id);
  });
export const saveCurrentStoreCatalogAttributeValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => attributeValueSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return saveCatalogAttributeValue(context.supabase, store.id, data.attributeId, data.id, data);
  });
export const deleteCurrentStoreCatalogAttributeValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return deleteCatalogAttributeValue(context.supabase, store.id, data.id);
  });
export const setCurrentStoreProductAttributeValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => productAttributeValuesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return replaceProductAttributeValues(
      context.supabase,
      store.id,
      data.productId,
      data.attributeValueIds,
    );
  });
export const saveCurrentStoreProductVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => variantSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return saveProductVariant(context.supabase, store.id, data.productId, data.id, data);
  });
export const deleteCurrentStoreProductVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return deleteProductVariant(context.supabase, store.id, data.id);
  });
export const setCurrentStoreVariantAttributeValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => variantAttributeValuesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return replaceVariantAttributeValues(context.supabase, store.id, data.variantId, data.values);
  });
export const saveCurrentStoreProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => imageSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return saveProductImage(context.supabase, store.id, data.productId, data.id, data);
  });
export const deleteCurrentStoreProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return deleteProductImage(context.supabase, store.id, data.id);
  });
