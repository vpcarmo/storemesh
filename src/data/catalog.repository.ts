import type { SupabaseClient } from "@supabase/supabase-js";

import type { Category, Product } from "@/domain/catalog";
import type { Database, Tables } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type CategoryRow = Tables<"categories">;
type ProductRow = Tables<"products">;

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

export async function readCatalog(client: AppClient, storeId: string) {
  const [categoriesResult, productsResult] = await Promise.all([
    client.from("categories").select("*").eq("store_id", storeId).order("name"),
    client.from("products").select("*").eq("store_id", storeId).order("name"),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (productsResult.error) throw productsResult.error;

  return {
    categories: categoriesResult.data.map(toCategory),
    products: productsResult.data.map(toProduct),
  };
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
