/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  defaultPageSections,
  type NavigationItem,
  type PageStatus,
  type WebsitePage,
} from "@/domain/website";

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
