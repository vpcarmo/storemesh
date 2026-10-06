/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  defaultPageSections,
  type NavigationItem,
  type PageStatus,
  type WebsitePage,
} from "@/domain/website";
import { storefrontSectionsSchema } from "@/domain/storefront-sections.schema";

// New database tables are intentionally kept behind this repository until generated types refresh.
type AppClient = SupabaseClient<any>;
type PageRow = any;
type NavigationRow = any;

function pageFromRow(row: PageRow): WebsitePage {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    sections: row.sections,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function navigationFromRow(row: NavigationRow): NavigationItem {
  return {
    id: row.id,
    storeId: row.store_id,
    label: row.label,
    pageId: row.page_id,
    externalUrl: row.external_url,
    position: row.position,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function readPages(client: AppClient, storeId: string): Promise<WebsitePage[]> {
  const { data, error } = await client
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at");
  if (error) throw error;
  return data.map(pageFromRow);
}
export async function readStorePageForPreview(
  client: AppClient,
  storeId: string,
  pageSlug: string,
): Promise<WebsitePage | null> {
  const { data, error } = await client
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", pageSlug)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a página de prévia.");
  if (!data) return null;

  const parsedSections = storefrontSectionsSchema.safeParse(data.sections);
  if (!parsedSections.success) throw new Error("As seções salvas desta página são inválidas.");

  const sections = parsedSections.data.map((section) => {
    switch (section.type) {
      case "hero":
        return {
          id: section.id,
          type: section.type,
          title: section.title,
          ...(section.description === undefined ? {} : { description: section.description }),
          ...(section.action === undefined ? {} : { action: section.action }),
          ...(section.imageMediaAssetId === undefined
            ? {}
            : { imageMediaAssetId: section.imageMediaAssetId }),
          ...(section.imageUrl === undefined ? {} : { imageUrl: section.imageUrl }),
          ...(section.imageAlt === undefined ? {} : { imageAlt: section.imageAlt }),
        };
      case "banner":
        return {
          id: section.id,
          type: section.type,
          message: section.message,
          ...(section.action === undefined ? {} : { action: section.action }),
          ...(section.imageMediaAssetId === undefined
            ? {}
            : { imageMediaAssetId: section.imageMediaAssetId }),
          ...(section.imageUrl === undefined ? {} : { imageUrl: section.imageUrl }),
          ...(section.imageAlt === undefined ? {} : { imageAlt: section.imageAlt }),
        };
      case "categories":
        return {
          id: section.id,
          type: section.type,
          ...(section.title === undefined ? {} : { title: section.title }),
          categories: section.categories,
        };
      case "product-grid":
        return {
          id: section.id,
          type: section.type,
          ...(section.title === undefined ? {} : { title: section.title }),
          products: section.products,
        };
      case "text-content":
        return {
          id: section.id,
          type: section.type,
          ...(section.title === undefined ? {} : { title: section.title }),
          content: section.content,
        };
      case "call-to-action":
        return {
          id: section.id,
          type: section.type,
          title: section.title,
          ...(section.description === undefined ? {} : { description: section.description }),
          action: section.action,
        };
    }
  });

  return { ...pageFromRow(data), sections };
}
export async function savePage(
  client: AppClient,
  storeId: string,
  id: string | null,
  value: Pick<WebsitePage, "title" | "slug" | "status" | "seoTitle" | "seoDescription">,
): Promise<WebsitePage> {
  const payload = {
    store_id: storeId,
    title: value.title,
    slug: value.slug,
    status: value.status,
    seo_title: value.seoTitle,
    seo_description: value.seoDescription,
  };
  const query = id
    ? client.from("pages").update(payload).eq("id", id).eq("store_id", storeId)
    : client
        .from("pages")
        .insert({ ...payload, sections: defaultPageSections(value.title, value.seoDescription) });
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return pageFromRow(data);
}
export async function updatePageSections(
  client: AppClient,
  storeId: string,
  pageId: string,
  sectionsInput: unknown,
): Promise<void> {
  const { data: page, error: pageError } = await client
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (pageError) throw pageError;
  if (!page) throw new Error("A página não foi encontrada na loja autorizada.");

  const parsedSections = storefrontSectionsSchema.safeParse(sectionsInput);
  if (!parsedSections.success) {
    const firstIssue = parsedSections.error.issues[0];
    throw new Error(firstIssue?.message ?? "As seções da página são inválidas.");
  }

  const sections = parsedSections.data;
  const mediaIds = sections.flatMap((section) =>
    (section.type === "hero" || section.type === "banner") && section.imageMediaAssetId
      ? [section.imageMediaAssetId]
      : [],
  );
  const categoryIds = sections.flatMap((section) =>
    section.type === "categories" ? section.categories.map(({ id }) => id) : [],
  );
  const productIds = sections.flatMap((section) =>
    section.type === "product-grid" ? section.products.map(({ id }) => id) : [],
  );

  const [mediaResult, categoryResult, productResult] = await Promise.all([
    mediaIds.length
      ? client.from("media_assets").select("id").eq("store_id", storeId).in("id", mediaIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length
      ? client.from("categories").select("id").eq("store_id", storeId).in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? client.from("products").select("id").eq("store_id", storeId).in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (mediaResult.error) throw mediaResult.error;
  if (categoryResult.error) throw categoryResult.error;
  if (productResult.error) throw productResult.error;
  if (new Set(mediaResult.data.map(({ id }) => id)).size !== new Set(mediaIds).size)
    throw new Error("Uma mídia selecionada não pertence à loja autorizada.");
  if (new Set(categoryResult.data.map(({ id }) => id)).size !== new Set(categoryIds).size)
    throw new Error("Uma categoria selecionada não pertence à loja autorizada.");
  if (new Set(productResult.data.map(({ id }) => id)).size !== new Set(productIds).size)
    throw new Error("Um produto selecionado não pertence à loja autorizada.");

  const persistedSections = sections.map((section) => {
    if (section.type === "hero" || section.type === "banner") {
      const { imageUrl: _imageUrl, imageAlt: _imageAlt, ...persistentSection } = section;
      return persistentSection;
    }
    if (section.type === "categories")
      return {
        ...section,
        categories: section.categories.map(({ id, name, description }) => ({
          id,
          name,
          description,
        })),
      };
    if (section.type === "product-grid")
      return {
        ...section,
        products: section.products.map(({ id, name, description, price }) => ({
          id,
          name,
          description,
          price,
        })),
      };
    return section;
  });

  const { data, error } = await client
    .from("pages")
    .update({ sections: persistedSections })
    .eq("id", pageId)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("A página não foi encontrada na loja autorizada.");
}

export async function updatePageStatus(
  client: AppClient,
  storeId: string,
  id: string,
  status: PageStatus,
) {
  const { data, error } = await client
    .from("pages")
    .update({ status })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();
  if (error) throw error;
  return pageFromRow(data);
}
export async function readNavigation(
  client: AppClient,
  storeId: string,
): Promise<NavigationItem[]> {
  const { data, error } = await client
    .from("navigation_items")
    .select("*")
    .eq("store_id", storeId)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return data.map(navigationFromRow);
}
export async function saveNavigationItem(
  client: AppClient,
  storeId: string,
  id: string | null,
  value: Pick<NavigationItem, "label" | "pageId" | "externalUrl" | "position" | "isActive">,
) {
  const payload = {
    store_id: storeId,
    label: value.label,
    page_id: value.pageId,
    external_url: value.externalUrl,
    position: value.position,
    is_active: value.isActive,
  };
  const query = id
    ? client.from("navigation_items").update(payload).eq("id", id).eq("store_id", storeId)
    : client.from("navigation_items").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return navigationFromRow(data);
}
export async function deleteNavigationItem(client: AppClient, storeId: string, id: string) {
  const { error } = await client
    .from("navigation_items")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
  if (error) throw error;
}

export async function readPublishedPage(client: AppClient, storeSlug: string, pageSlug: string) {
  const { data: store, error: storeError } = await client
    .from("stores")
    .select("id, name, slug")
    .eq("slug", storeSlug)
    .eq("status", "active")
    .maybeSingle();
  if (storeError) throw storeError;
  if (!store) return null;
  const { data: page, error } = await client
    .from("pages")
    .select("*")
    .eq("store_id", store.id)
    .eq("slug", pageSlug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return page ? { store, page: pageFromRow(page) } : null;
}
