import type { Category, Product } from "@/domain/catalog";

export const STOREFRONT_PAGE_KINDS = [
  "home",
  "catalog",
  "category",
  "product",
  "about",
  "contact",
  "static",
  "policy",
] as const;

export type StorefrontPageKind = (typeof STOREFRONT_PAGE_KINDS)[number];

export interface StorefrontNavigationItem {
  id: string;
  label: string;
  href?: string;
  pageId?: string | null;
}

interface SectionBase {
  id: string;
}

export interface HeroSectionDefinition extends SectionBase {
  type: "hero";
  title: string;
  description?: string | null;
  action?: { label: string; href: string };
  imageMediaAssetId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface BannerSectionDefinition extends SectionBase {
  type: "banner";
  message: string;
  action?: { label: string; href: string };
  imageMediaAssetId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface CategoriesSectionDefinition extends SectionBase {
  type: "categories";
  title?: string;
  categories: Pick<Category, "id" | "name" | "description">[];
}

export interface ProductGridSectionDefinition extends SectionBase {
  type: "product-grid";
  title?: string;
  products: Pick<Product, "id" | "name" | "description" | "price">[];
}

export interface TextContentSectionDefinition extends SectionBase {
  type: "text-content";
  title?: string;
  content: string;
}

export interface CallToActionSectionDefinition extends SectionBase {
  type: "call-to-action";
  title: string;
  description?: string | null;
  action: { label: string; href: string };
}

export type StorefrontSectionDefinition =
  | HeroSectionDefinition
  | BannerSectionDefinition
  | CategoriesSectionDefinition
  | ProductGridSectionDefinition
  | TextContentSectionDefinition
  | CallToActionSectionDefinition;

export type PublicStorefrontSectionDefinition =
  | Omit<HeroSectionDefinition, "imageMediaAssetId">
  | Omit<BannerSectionDefinition, "imageMediaAssetId">
  | CategoriesSectionDefinition
  | ProductGridSectionDefinition
  | TextContentSectionDefinition
  | CallToActionSectionDefinition;

export interface StorefrontPageDefinition {
  id: string;
  kind: StorefrontPageKind;
  title: string;
  sections: StorefrontSectionDefinition[];
}
