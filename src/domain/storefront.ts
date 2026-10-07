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

export type StorefrontProductGridItem = Pick<Product, "id" | "name" | "description" | "price"> & {
  imageUrl?: string;
  imageAlt?: string;
};

export type ResolvedProductGridSectionDefinition = Omit<
  ProductGridSectionDefinition,
  "products"
> & {
  products: StorefrontProductGridItem[];
};

export function enrichProductGridSection(
  section: Omit<ProductGridSectionDefinition, "title"> & { title?: string | undefined },
  validProductIds: ReadonlySet<string>,
  images: ReadonlyMap<string, { url: string; alt: string | null }>,
): ResolvedProductGridSectionDefinition {
  return {
    id: section.id,
    type: section.type,
    ...(section.title === undefined ? {} : { title: section.title }),
    products: section.products.flatMap((product) => {
      if (!validProductIds.has(product.id)) return [];
      const image = images.get(product.id);
      return [
        {
          ...product,
          ...(image ? { imageUrl: image.url, imageAlt: image.alt?.trim() || product.name } : {}),
        },
      ];
    }),
  };
}

export interface TextContentSectionDefinition extends SectionBase {
  type: "text-content";
  title?: string;
  content: string;
  contentFormat?: "plain" | "markdown";
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
  | ResolvedProductGridSectionDefinition
  | TextContentSectionDefinition
  | CallToActionSectionDefinition;

export interface StorefrontPageDefinition {
  id: string;
  kind: StorefrontPageKind;
  title: string;
  sections: StorefrontSectionDefinition[];
}
