export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CatalogAttributeDisplayType = "text" | "swatch";

export interface CatalogAttribute {
  id: string;
  storeId: string;
  name: string;
  code: string;
  displayType: CatalogAttributeDisplayType;
  isFilterable: boolean;
  isVariantAxis: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogAttributeValue {
  id: string;
  storeId: string;
  attributeId: string;
  value: string;
  label: string;
  swatchValue: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  storeId: string;
  productId: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  storeId: string;
  productId: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}
