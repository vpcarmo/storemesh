import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CatalogAttribute,
  CatalogAttributeValue,
  Category,
  Product,
  ProductImage,
  ProductVariant,
} from "@/domain/catalog";
import type { Database, Tables } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type CategoryRow = Tables<"categories">;
type ProductRow = Tables<"products">;
type AttributeRow = Tables<"catalog_attributes">;
type AttributeValueRow = Tables<"catalog_attribute_values">;
type VariantRow = Tables<"product_variants">;
type ImageRow = Tables<"product_images">;

export interface CategoryValues {
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface ProductValues {
  categoryId: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  isActive: boolean;
}

export interface CatalogAttributeValues {
  name: string;
  code: string;
  displayType: CatalogAttribute["displayType"];
  isFilterable: boolean;
  isVariantAxis: boolean;
  position: number;
}

export interface CatalogAttributeValueValues {
  value: string;
  label: string;
  swatchValue: string | null;
  position: number;
}

export interface ProductVariantValues {
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
  position: number;
}

export interface ProductImageValues {
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAttribute(row: AttributeRow): CatalogAttribute {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    code: row.code,
    displayType: row.display_type,
    isFilterable: row.is_filterable,
    isVariantAxis: row.is_variant_axis,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function toAttributeValue(row: AttributeValueRow): CatalogAttributeValue {
  return {
    id: row.id,
    storeId: row.store_id,
    attributeId: row.attribute_id,
    value: row.value,
    label: row.label,
    swatchValue: row.swatch_value,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function toVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id,
    sku: row.sku,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    isActive: row.is_active,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function toImage(row: ImageRow): ProductImage {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id,
    url: row.url,
    altText: row.alt_text,
    position: row.position,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function readCatalog(client: AppClient, storeId: string) {
  const [
    categoriesResult,
    productsResult,
    attributesResult,
    attributeValuesResult,
    variantsResult,
    imagesResult,
  ] = await Promise.all([
    client.from("categories").select("*").eq("store_id", storeId).order("name"),
    client.from("products").select("*").eq("store_id", storeId).order("name"),
    client
      .from("catalog_attributes")
      .select("*")
      .eq("store_id", storeId)
      .order("position")
      .order("name"),
    client
      .from("catalog_attribute_values")
      .select("*")
      .eq("store_id", storeId)
      .order("position")
      .order("label"),
    client.from("product_variants").select("*").eq("store_id", storeId).order("position"),
    client.from("product_images").select("*").eq("store_id", storeId).order("position"),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (productsResult.error) throw productsResult.error;
  if (attributesResult.error) throw attributesResult.error;
  if (attributeValuesResult.error) throw attributeValuesResult.error;
  if (variantsResult.error) throw variantsResult.error;
  if (imagesResult.error) throw imagesResult.error;

  return {
    categories: categoriesResult.data.map(toCategory),
    products: productsResult.data.map(toProduct),
    attributes: attributesResult.data.map(toAttribute),
    attributeValues: attributeValuesResult.data.map(toAttributeValue),
    variants: variantsResult.data.map(toVariant),
    images: imagesResult.data.map(toImage),
  };
}

export async function saveCatalogAttribute(
  client: AppClient,
  storeId: string,
  id: string | null,
  values: CatalogAttributeValues,
): Promise<CatalogAttribute> {
  const payload = {
    store_id: storeId,
    name: values.name,
    code: values.code,
    display_type: values.displayType,
    is_filterable: values.isFilterable,
    is_variant_axis: values.isVariantAxis,
    position: values.position,
  };
  const query = id
    ? client.from("catalog_attributes").update(payload).eq("id", id).eq("store_id", storeId)
    : client.from("catalog_attributes").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return toAttribute(data);
}
export async function deleteCatalogAttribute(client: AppClient, storeId: string, id: string) {
  const { error } = await client
    .from("catalog_attributes")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
  if (error) throw error;
}
export async function saveCatalogAttributeValue(
  client: AppClient,
  storeId: string,
  attributeId: string,
  id: string | null,
  values: CatalogAttributeValueValues,
): Promise<CatalogAttributeValue> {
  const payload = {
    store_id: storeId,
    attribute_id: attributeId,
    value: values.value,
    label: values.label,
    swatch_value: values.swatchValue,
    position: values.position,
  };
  const query = id
    ? client.from("catalog_attribute_values").update(payload).eq("id", id).eq("store_id", storeId)
    : client.from("catalog_attribute_values").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return toAttributeValue(data);
}
export async function deleteCatalogAttributeValue(client: AppClient, storeId: string, id: string) {
  const { error } = await client
    .from("catalog_attribute_values")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
  if (error) throw error;
}
export async function replaceProductAttributeValues(
  client: AppClient,
  storeId: string,
  productId: string,
  attributeValueIds: string[],
) {
  const { error: deleteError } = await client
    .from("product_attribute_values")
    .delete()
    .eq("product_id", productId)
    .eq("store_id", storeId);
  if (deleteError) throw deleteError;
  if (!attributeValueIds.length) return;
  const { error } = await client.from("product_attribute_values").insert(
    attributeValueIds.map((attribute_value_id) => ({
      store_id: storeId,
      product_id: productId,
      attribute_value_id,
    })),
  );
  if (error) throw error;
}
export async function saveProductVariant(
  client: AppClient,
  storeId: string,
  productId: string,
  id: string | null,
  values: ProductVariantValues,
): Promise<ProductVariant> {
  const payload = {
    store_id: storeId,
    product_id: productId,
    sku: values.sku,
    price: values.price,
    compare_at_price: values.compareAtPrice,
    is_active: values.isActive,
    position: values.position,
  };
  const query = id
    ? client.from("product_variants").update(payload).eq("id", id).eq("store_id", storeId)
    : client.from("product_variants").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return toVariant(data);
}
export async function deleteProductVariant(client: AppClient, storeId: string, id: string) {
  const { error } = await client
    .from("product_variants")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
  if (error) throw error;
}
export async function replaceVariantAttributeValues(
  client: AppClient,
  storeId: string,
  variantId: string,
  values: { attributeId: string; attributeValueId: string }[],
) {
  const { error: deleteError } = await client
    .from("variant_attribute_values")
    .delete()
    .eq("variant_id", variantId)
    .eq("store_id", storeId);
  if (deleteError) throw deleteError;
  if (!values.length) return;
  const { error } = await client.from("variant_attribute_values").insert(
    values.map(({ attributeId: attribute_id, attributeValueId: attribute_value_id }) => ({
      store_id: storeId,
      variant_id: variantId,
      attribute_id,
      attribute_value_id,
    })),
  );
  if (error) throw error;
}
export async function saveProductImage(
  client: AppClient,
  storeId: string,
  productId: string,
  id: string | null,
  values: ProductImageValues,
): Promise<ProductImage> {
  const payload = {
    store_id: storeId,
    product_id: productId,
    url: values.url,
    alt_text: values.altText,
    position: values.position,
    is_primary: values.isPrimary,
  };
  const query = id
    ? client.from("product_images").update(payload).eq("id", id).eq("store_id", storeId)
    : client.from("product_images").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return toImage(data);
}
export async function deleteProductImage(client: AppClient, storeId: string, id: string) {
  const { error } = await client
    .from("product_images")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
  if (error) throw error;
}

export async function saveCategory(
  client: AppClient,
  storeId: string,
  id: string | null,
  values: CategoryValues,
): Promise<Category> {
  const payload = {
    store_id: storeId,
    name: values.name,
    slug: values.slug,
    description: values.description,
    is_active: values.isActive,
  };
  const query = id
    ? client.from("categories").update(payload).eq("id", id).eq("store_id", storeId)
    : client.from("categories").insert(payload);
  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return toCategory(data);
}

export async function saveProduct(
  client: AppClient,
  storeId: string,
  id: string | null,
  values: ProductValues,
): Promise<Product> {
  const payload = {
    store_id: storeId,
    category_id: values.categoryId,
    name: values.name,
    slug: values.slug,
    description: values.description,
    price: values.price,
    is_active: values.isActive,
  };
  const query = id
    ? client.from("products").update(payload).eq("id", id).eq("store_id", storeId)
    : client.from("products").insert(payload);
  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return toProduct(data);
}
