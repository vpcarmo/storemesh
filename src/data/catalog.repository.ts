import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CatalogAttribute,
  CatalogAttributeValue,
  Category,
  Product,
  ProductAttributeValue,
  ProductImage,
  VariantAttributeValue,
  ProductVariant,
} from "@/domain/catalog";
import { resolveMediaReferences } from "@/data/media.repository";
import {
  storefrontCategoryHref,
  storefrontProductHref,
  PUBLIC_CATEGORY_PAGE_SIZE,
  type StorefrontProductGridItem,
} from "@/domain/storefront";
import { isValidHttpUrl } from "@/domain/storefront-theme";
import type { Database, Tables } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type CategoryRow = Tables<"categories">;
type ProductRow = Tables<"products">;
type AttributeRow = Tables<"catalog_attributes">;
type AttributeValueRow = Tables<"catalog_attribute_values">;
type VariantRow = Tables<"product_variants">;
type ImageRow = Tables<"product_images">;
type ProductAttributeValueRow = Tables<"product_attribute_values">;
type VariantAttributeValueRow = Tables<"variant_attribute_values">;

export interface ResolvedProductGridImage {
  url: string;
  alt: string | null;
}

export interface ResolvedPublicProductImage extends ResolvedProductGridImage {
  id: string;
  position: number;
}

export interface PublicProductAttribute {
  id: string;
  name: string;
  code: string;
  displayType: CatalogAttribute["displayType"];
  value: string;
  label: string;
  swatchValue: string | null;
  position: number;
  valuePosition: number;
}

export interface PublicProductVariant {
  id: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  position: number;
  attributes: PublicProductAttribute[];
}

export interface PublicProductDetails {
  product: Pick<
    PublicCatalogProduct,
    "id" | "name" | "slug" | "description" | "price" | "categoryId"
  >;
  images: ResolvedPublicProductImage[];
  attributes: PublicProductAttribute[];
  variants: PublicProductVariant[];
  category: PublicCatalogCategory | null;
}

export interface ResolvedProductGridSnapshots {
  validProductIds: Set<string>;
  images: Map<string, ResolvedProductGridImage>;
  hrefs: Map<string, string>;
}

export interface ResolvedCategorySnapshots {
  hrefs: Map<string, string>;
}

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
  url: string | null;
  mediaAssetId: string | null;
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
function toProductAttributeValue(row: ProductAttributeValueRow): ProductAttributeValue {
  return {
    productId: row.product_id,
    attributeValueId: row.attribute_value_id,
    storeId: row.store_id,
  };
}
function toVariantAttributeValue(row: VariantAttributeValueRow): VariantAttributeValue {
  return {
    variantId: row.variant_id,
    attributeId: row.attribute_id,
    attributeValueId: row.attribute_value_id,
    storeId: row.store_id,
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
    mediaAssetId: row.media_asset_id,
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
    productAttributeValuesResult,
    variantAttributeValuesResult,
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
    client.from("product_attribute_values").select("*").eq("store_id", storeId),
    client.from("variant_attribute_values").select("*").eq("store_id", storeId),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (productsResult.error) throw productsResult.error;
  if (attributesResult.error) throw attributesResult.error;
  if (attributeValuesResult.error) throw attributeValuesResult.error;
  if (variantsResult.error) throw variantsResult.error;
  if (imagesResult.error) throw imagesResult.error;
  if (productAttributeValuesResult.error) throw productAttributeValuesResult.error;
  if (variantAttributeValuesResult.error) throw variantAttributeValuesResult.error;

  return {
    categories: categoriesResult.data.map(toCategory),
    products: productsResult.data.map(toProduct),
    attributes: attributesResult.data.map(toAttribute),
    attributeValues: attributeValuesResult.data.map(toAttributeValue),
    variants: variantsResult.data.map(toVariant),
    images: imagesResult.data.map(toImage),
    productAttributeValues: productAttributeValuesResult.data.map(toProductAttributeValue),
    variantAttributeValues: variantAttributeValuesResult.data.map(toVariantAttributeValue),
  };
}

export async function resolveProductGridSnapshots(
  client: AppClient,
  storeId: string,
  storeSlug: string,
  products: Pick<StorefrontProductGridItem, "id">[],
  options: { mediaSignedUrlLifetimeSeconds?: number } = {},
): Promise<ResolvedProductGridSnapshots> {
  const productIds = [...new Set(products.map(({ id }) => id))];
  if (productIds.length === 0) {
    return { validProductIds: new Set(), images: new Map(), hrefs: new Map() };
  }

  const { data: productRows, error: productsError } = await client
    .from("products")
    .select("id, store_id, slug, is_active")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .in("id", productIds);
  if (productsError) throw productsError;

  const validProductIds = new Set(
    productRows.filter((product) => product.store_id === storeId).map(({ id }) => id),
  );
  const hrefs = new Map(
    productRows.flatMap((product) => {
      if (product.store_id !== storeId) return [];
      const href = storefrontProductHref(storeSlug, product.slug);
      return href ? [[product.id, href] as const] : [];
    }),
  );
  if (validProductIds.size === 0) return { validProductIds, images: new Map(), hrefs };

  const images = await resolveProductImages(
    client,
    storeId,
    [...validProductIds],
    options.mediaSignedUrlLifetimeSeconds,
  );
  return { validProductIds, images, hrefs };
}

export async function resolveCategoryGridSnapshots(
  client: AppClient,
  storeId: string,
  storeSlug: string,
  categories: { id: string }[],
): Promise<ResolvedCategorySnapshots> {
  const categoryIds = [...new Set(categories.map(({ id }) => id))];
  if (categoryIds.length === 0) return { hrefs: new Map() };
  const { data, error } = await client
    .from("categories")
    .select("id, store_id, slug")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .in("id", categoryIds);
  if (error) throw error;
  const hrefs = new Map(
    data.flatMap((category) => {
      if (category.store_id !== storeId) return [];
      const href = storefrontCategoryHref(storeSlug, category.slug);
      return href ? [[category.id, href] as const] : [];
    }),
  );
  return { hrefs };
}

async function resolveProductImages(
  client: AppClient,
  storeId: string,
  productIds: string[],
  mediaSignedUrlLifetimeSeconds?: number,
): Promise<Map<string, ResolvedProductGridImage>> {
  const galleries = await resolveProductImageGalleries(
    client,
    storeId,
    productIds,
    mediaSignedUrlLifetimeSeconds,
  );
  return new Map(
    [...galleries].flatMap(([productId, images]) =>
      images[0] ? [[productId, images[0]] as const] : [],
    ),
  );
}

async function resolveProductImageGalleries(
  client: AppClient,
  storeId: string,
  productIds: string[],
  mediaSignedUrlLifetimeSeconds?: number,
): Promise<Map<string, ResolvedPublicProductImage[]>> {
  if (productIds.length === 0) return new Map();
  const { data: imageRows, error: imagesError } = await client
    .from("product_images")
    .select("id, store_id, product_id, media_asset_id, url, alt_text, position, is_primary")
    .eq("store_id", storeId)
    .in("product_id", productIds);
  if (imagesError) throw imagesError;

  const imagesByProduct = new Map<string, typeof imageRows>();
  const productIdSet = new Set(productIds);
  const mediaAssetIds: string[] = [];
  for (const image of imageRows) {
    if (image.store_id !== storeId || !productIdSet.has(image.product_id)) continue;
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push(image);
    imagesByProduct.set(image.product_id, list);
    if (image.media_asset_id) mediaAssetIds.push(image.media_asset_id);
  }
  const mediaReferences = await resolveMediaReferences(client, storeId, mediaAssetIds, {
    tolerateUnavailable: true,
    ...(mediaSignedUrlLifetimeSeconds === undefined
      ? {}
      : { signedUrlLifetimeSeconds: mediaSignedUrlLifetimeSeconds }),
  });
  const resolvedImages = new Map<string, ResolvedPublicProductImage[]>();
  for (const [productId, productImages] of imagesByProduct) {
    const orderedImages = [...productImages].sort(
      (left, right) =>
        Number(right.is_primary) - Number(left.is_primary) ||
        left.position - right.position ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );
    for (const image of orderedImages) {
      const media = image.media_asset_id ? mediaReferences.get(image.media_asset_id) : undefined;
      const url =
        media && isValidHttpUrl(media.url)
          ? media.url
          : !image.media_asset_id && image.url && isValidHttpUrl(image.url)
            ? image.url
            : null;
      if (!url) continue;
      const images = resolvedImages.get(productId) ?? [];
      images.push({
        id: image.id,
        url,
        alt: image.alt_text?.trim() || media?.alt?.trim() || null,
        position: image.position,
      });
      resolvedImages.set(productId, images);
    }
  }
  return resolvedImages;
}

export interface PublicCatalogProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string | null;
  imageUrl: string | null;
  imageAlt: string;
}

export interface PublicCatalogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const PUBLIC_CATALOG_READ_BATCH_SIZE = 500;

export async function readPublicCatalogCategories(
  client: AppClient,
  storeId: string,
): Promise<PublicCatalogCategory[]> {
  const categories: PublicCatalogCategory[] = [];
  let offset = 0;

  while (true) {
    const { data, error, count } = await client
      .from("categories")
      .select("id, store_id, name, slug, description", { count: "exact" })
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PUBLIC_CATALOG_READ_BATCH_SIZE - 1);
    if (error) throw error;
    if (count === null) throw new Error("Could not determine the public category count.");

    categories.push(
      ...data.flatMap((category) =>
        category.store_id === storeId
          ? [
              {
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description,
              },
            ]
          : [],
      ),
    );
    if (data.length === 0) {
      if (offset < count) throw new Error("Could not load all public categories.");
      break;
    }

    offset += data.length;
    if (offset >= count) break;
  }

  return categories;
}

export async function readPublicCatalogProducts(
  client: AppClient,
  storeId: string,
): Promise<PublicCatalogProduct[]> {
  const products: PublicCatalogProduct[] = [];
  let offset = 0;

  while (true) {
    const { data, error, count } = await client
      .from("products")
      .select("id, store_id, category_id, name, slug, description, price", { count: "exact" })
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PUBLIC_CATALOG_READ_BATCH_SIZE - 1);
    if (error) throw error;
    if (count === null) throw new Error("Could not determine the public product count.");

    products.push(
      ...data.flatMap((product) =>
        product.store_id === storeId
          ? [
              {
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.price,
                categoryId: product.category_id,
                imageUrl: null,
                imageAlt: product.name,
              },
            ]
          : [],
      ),
    );
    if (data.length === 0) {
      if (offset < count) throw new Error("Could not load all public products.");
      break;
    }

    offset += data.length;
    if (offset >= count) break;
  }

  const imageBatches = await Promise.all(
    Array.from({ length: Math.ceil(products.length / 100) }, (_, batchIndex) => {
      const batch = products.slice(batchIndex * 100, (batchIndex + 1) * 100);
      return resolveProductImages(
        client,
        storeId,
        batch.map(({ id }) => id),
      );
    }),
  );
  const images = new Map(imageBatches.flatMap((batch) => [...batch]));

  return products.map((product) => {
    const image = images.get(product.id);
    return {
      ...product,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt?.trim() || product.name,
    };
  });
}

export async function readPublicProduct(
  client: AppClient,
  storeId: string,
  productSlug: string,
): Promise<{ product: PublicCatalogProduct; category: PublicCatalogCategory | null } | null> {
  const { data: product, error } = await client
    .from("products")
    .select("id, store_id, category_id, name, slug, description, price")
    .eq("store_id", storeId)
    .eq("slug", productSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!product || product.store_id !== storeId) return null;

  const [images, categoryResult] = await Promise.all([
    resolveProductImages(client, storeId, [product.id]),
    product.category_id
      ? client
          .from("categories")
          .select("id, store_id, name, slug, description")
          .eq("store_id", storeId)
          .eq("id", product.category_id)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (categoryResult.error) throw categoryResult.error;
  const image = images.get(product.id);
  const categoryRow = categoryResult.data;
  return {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      categoryId: product.category_id,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt?.trim() || product.name,
    },
    category:
      categoryRow && categoryRow.store_id === storeId
        ? {
            id: categoryRow.id,
            name: categoryRow.name,
            slug: categoryRow.slug,
            description: categoryRow.description,
          }
        : null,
  };
}

export async function readPublicProductDetails(
  client: AppClient,
  storeId: string,
  productSlug: string,
): Promise<PublicProductDetails | null> {
  const { data: product, error } = await client
    .from("products")
    .select("id, store_id, category_id, name, slug, description, price")
    .eq("store_id", storeId)
    .eq("slug", productSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!product || product.store_id !== storeId) return null;

  const [imagesByProduct, categoryResult, variantsResult, productAttributeValuesResult] =
    await Promise.all([
      resolveProductImageGalleries(client, storeId, [product.id]),
      product.category_id
        ? client
            .from("categories")
            .select("id, store_id, name, slug, description")
            .eq("store_id", storeId)
            .eq("id", product.category_id)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      client
        .from("product_variants")
        .select("id, store_id, product_id, sku, price, compare_at_price, position")
        .eq("store_id", storeId)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("id", { ascending: true }),
      client
        .from("product_attribute_values")
        .select("product_id, attribute_value_id, store_id")
        .eq("store_id", storeId)
        .eq("product_id", product.id),
    ]);
  if (categoryResult.error) throw categoryResult.error;
  if (variantsResult.error) throw variantsResult.error;
  if (productAttributeValuesResult.error) throw productAttributeValuesResult.error;

  const variants = variantsResult.data.filter(
    (variant) => variant.store_id === storeId && variant.product_id === product.id,
  );
  const variantIds = variants.map(({ id }) => id);
  const { data: variantAttributeValues, error: variantAttributeValuesError } =
    variantIds.length > 0
      ? await client
          .from("variant_attribute_values")
          .select("variant_id, attribute_id, attribute_value_id, store_id")
          .eq("store_id", storeId)
          .in("variant_id", variantIds)
      : { data: [], error: null };
  if (variantAttributeValuesError) throw variantAttributeValuesError;

  const validVariantIds = new Set(variantIds);
  const validProductAttributeValues = productAttributeValuesResult.data.filter(
    (row) => row.store_id === storeId && row.product_id === product.id,
  );
  const validVariantAttributeValues = variantAttributeValues.filter(
    (row) => row.store_id === storeId && validVariantIds.has(row.variant_id),
  );
  const attributeValueIds = [
    ...new Set([
      ...validProductAttributeValues.map(({ attribute_value_id }) => attribute_value_id),
      ...validVariantAttributeValues.map(({ attribute_value_id }) => attribute_value_id),
    ]),
  ];
  const { data: attributeValues, error: attributeValuesError } =
    attributeValueIds.length > 0
      ? await client
          .from("catalog_attribute_values")
          .select("id, store_id, attribute_id, value, label, swatch_value, position")
          .eq("store_id", storeId)
          .in("id", attributeValueIds)
      : { data: [], error: null };
  if (attributeValuesError) throw attributeValuesError;

  const attributeIds = [...new Set(attributeValues.map(({ attribute_id }) => attribute_id))];
  const { data: attributes, error: attributesError } =
    attributeIds.length > 0
      ? await client
          .from("catalog_attributes")
          .select("id, store_id, name, code, display_type, position")
          .eq("store_id", storeId)
          .in("id", attributeIds)
      : { data: [], error: null };
  if (attributesError) throw attributesError;

  const attributeValuesById = new Map(
    attributeValues.filter((value) => value.store_id === storeId).map((value) => [value.id, value]),
  );
  const attributesById = new Map(
    attributes
      .filter((attribute) => attribute.store_id === storeId)
      .map((attribute) => [attribute.id, attribute]),
  );
  const publicAttributeForValue = (
    valueId: string,
    expectedAttributeId?: string,
  ): PublicProductAttribute | null => {
    const value = attributeValuesById.get(valueId);
    if (!value || (expectedAttributeId && value.attribute_id !== expectedAttributeId)) return null;
    const attribute = attributesById.get(value.attribute_id);
    if (!attribute) return null;
    return {
      id: attribute.id,
      name: attribute.name,
      code: attribute.code,
      displayType: attribute.display_type,
      value: value.value,
      label: value.label,
      swatchValue: value.swatch_value,
      position: attribute.position,
      valuePosition: value.position,
    };
  };
  const publicAttributes = validProductAttributeValues.flatMap((row) => {
    const attribute = publicAttributeForValue(row.attribute_value_id);
    return attribute ? [attribute] : [];
  });
  const publicVariants = variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    price: variant.price,
    compareAtPrice: variant.compare_at_price,
    position: variant.position,
    attributes: validVariantAttributeValues
      .filter((row) => row.variant_id === variant.id)
      .flatMap((row) => {
        const attribute = publicAttributeForValue(row.attribute_value_id, row.attribute_id);
        return attribute ? [attribute] : [];
      })
      .sort(
        (left, right) =>
          left.position - right.position ||
          left.valuePosition - right.valuePosition ||
          (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
      ),
  }));
  const category = categoryResult.data;
  return {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      categoryId: product.category_id,
    },
    images: (imagesByProduct.get(product.id) ?? []).map((image) => ({
      ...image,
      alt: image.alt?.trim() || product.name,
    })),
    attributes: publicAttributes.sort(
      (left, right) =>
        left.position - right.position ||
        left.valuePosition - right.valuePosition ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    ),
    variants: publicVariants,
    category:
      category && category.store_id === storeId
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
          }
        : null,
  };
}

export async function readPublicCategoryPage(
  client: AppClient,
  storeId: string,
  storeSlug: string,
  categorySlug: string,
  page: number,
): Promise<{
  category: PublicCatalogCategory;
  products: (Omit<PublicCatalogProduct, "categoryId"> & { href: string | null })[];
  totalProducts: number;
} | null> {
  const { data: category, error: categoryError } = await client
    .from("categories")
    .select("id, store_id, name, slug, description")
    .eq("store_id", storeId)
    .eq("slug", categorySlug)
    .eq("is_active", true)
    .maybeSingle();
  if (categoryError) throw categoryError;
  if (!category || category.store_id !== storeId) return null;

  const first = (page - 1) * PUBLIC_CATEGORY_PAGE_SIZE;
  const {
    data: products,
    error: productsError,
    count,
  } = await client
    .from("products")
    .select("id, store_id, name, slug, description, price", { count: "exact" })
    .eq("store_id", storeId)
    .eq("category_id", category.id)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(first, first + PUBLIC_CATEGORY_PAGE_SIZE - 1);
  if (productsError) throw productsError;
  const eligibleProducts = products.filter((product) => product.store_id === storeId);
  const images = await resolveProductImages(
    client,
    storeId,
    eligibleProducts.map(({ id }) => id),
  );
  return {
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
    },
    products: eligibleProducts.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      imageUrl: images.get(product.id)?.url ?? null,
      imageAlt: images.get(product.id)?.alt?.trim() || product.name,
      href: storefrontProductHref(storeSlug, product.slug),
    })),
    totalProducts: count ?? 0,
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
  await requireStoreRecord(client, "catalog_attributes", attributeId, storeId);
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
async function requireStoreRecord(
  client: AppClient,
  table: "products" | "product_variants" | "catalog_attributes" | "catalog_attribute_values",
  id: string,
  storeId: string,
) {
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("O registro não pertence à loja autorizada.");
}

async function requireAttributeValuesInStore(client: AppClient, storeId: string, ids: string[]) {
  if (!ids.length) return;
  const uniqueIds = [...new Set(ids)];
  const { data, error } = await client
    .from("catalog_attribute_values")
    .select("id")
    .eq("store_id", storeId)
    .in("id", uniqueIds);
  if (error) throw error;
  if (data.length !== uniqueIds.length)
    throw new Error("Há valores de atributo fora da loja autorizada.");
}

export async function replaceProductAttributeValues(
  client: AppClient,
  storeId: string,
  productId: string,
  attributeValueIds: string[],
) {
  await requireStoreRecord(client, "products", productId, storeId);
  await requireAttributeValuesInStore(client, storeId, attributeValueIds);
  const { error: deleteError } = await client
    .from("product_attribute_values")
    .delete()
    .eq("product_id", productId)
    .eq("store_id", storeId);
  if (deleteError) throw deleteError;
  if (!attributeValueIds.length) return;
  const { error } = await client.from("product_attribute_values").insert(
    [...new Set(attributeValueIds)].map((attribute_value_id) => ({
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
  await requireStoreRecord(client, "products", productId, storeId);
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
  await requireStoreRecord(client, "product_variants", variantId, storeId);
  await requireAttributeValuesInStore(
    client,
    storeId,
    values.map((value) => value.attributeValueId),
  );
  const { error: deleteError } = await client
    .from("variant_attribute_values")
    .delete()
    .eq("variant_id", variantId)
    .eq("store_id", storeId);
  if (deleteError) throw deleteError;
  if (!values.length) return;
  const uniqueAttributeIds = new Set(values.map((value) => value.attributeId));
  if (uniqueAttributeIds.size !== values.length)
    throw new Error("Uma variante não pode ter dois valores do mesmo atributo.");
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
  await requireStoreRecord(client, "products", productId, storeId);
  if (values.mediaAssetId) {
    const { data, error } = await client
      .from("media_assets")
      .select("id")
      .eq("id", values.mediaAssetId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("A mídia selecionada não pertence à loja autorizada.");
  }
  const payload = {
    store_id: storeId,
    product_id: productId,
    url: values.mediaAssetId ? null : values.url,
    media_asset_id: values.mediaAssetId,
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

/** Saves a variant and its combination atomically, preserving the deferred duplicate-combination rule. */
export async function saveProductVariantWithAttributeValues(
  client: AppClient,
  storeId: string,
  productId: string,
  id: string | null,
  values: ProductVariantValues,
  attributeValues: { attributeId: string; attributeValueId: string }[],
): Promise<ProductVariant> {
  await requireStoreRecord(client, "products", productId, storeId);
  await requireAttributeValuesInStore(
    client,
    storeId,
    attributeValues.map((item) => item.attributeValueId),
  );
  if (new Set(attributeValues.map((item) => item.attributeId)).size !== attributeValues.length) {
    throw new Error("Uma variante não pode ter dois valores do mesmo atributo.");
  }
  const { data, error } = await client.rpc("save_product_variant_with_attribute_values", {
    p_store_id: storeId,
    p_product_id: productId,
    // A função aceita estes parâmetros nulos; os tipos gerados não refletem os defaults.
    p_variant_id: id as unknown as string,
    p_sku: values.sku as unknown as string,
    p_price: values.price,
    p_compare_at_price: values.compareAtPrice as unknown as number,
    p_is_active: values.isActive,
    p_position: values.position,
    p_values: attributeValues,
  });
  if (error) throw error;
  return toVariant(data);
}
