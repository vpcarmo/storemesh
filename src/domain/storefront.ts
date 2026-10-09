import type { Category, Product } from "@/domain/catalog";

export const PUBLIC_CATEGORY_PAGE_SIZE = 12;

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
  backgroundColor?: string;
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

export type StorefrontCategoryItem = Pick<Category, "id" | "name" | "description"> & {
  href?: string;
};

export interface ProductGridSectionDefinition extends SectionBase {
  type: "product-grid";
  title?: string;
  products: Pick<Product, "id" | "name" | "description" | "price">[];
}

export type StorefrontProductGridItem = Pick<Product, "id" | "name" | "description" | "price"> & {
  imageUrl?: string;
  imageAlt?: string;
  href?: string;
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
  hrefs: ReadonlyMap<string, string>,
): ResolvedProductGridSectionDefinition {
  return {
    id: section.id,
    type: section.type,
    ...(section.backgroundColor === undefined ? {} : { backgroundColor: section.backgroundColor }),
    ...(section.title === undefined ? {} : { title: section.title }),
    products: section.products.flatMap((product) => {
      if (!validProductIds.has(product.id)) return [];
      const image = images.get(product.id);
      const href = hrefs.get(product.id);
      return [
        {
          ...product,
          ...(image ? { imageUrl: image.url, imageAlt: image.alt?.trim() || product.name } : {}),
          ...(href ? { href } : {}),
        },
      ];
    }),
  };
}

export function enrichCategoriesSection(
  section: CategoriesSectionDefinition,
  hrefs: ReadonlyMap<string, string>,
): Omit<CategoriesSectionDefinition, "categories"> & { categories: StorefrontCategoryItem[] } {
  return {
    ...section,
    categories: section.categories.flatMap((category) => {
      const href = hrefs.get(category.id);
      return href ? [{ ...category, href }] : [];
    }),
  };
}

export function storefrontProductHref(storeSlug: string, productSlug: string): string | null {
  if (!isStorefrontSlug(storeSlug) || !isStorefrontSlug(productSlug)) return null;
  return `/store/${storeSlug}/product/${productSlug}`;
}

export function storefrontCategoryHref(storeSlug: string, categorySlug: string): string | null {
  if (!isStorefrontSlug(storeSlug) || !isStorefrontSlug(categorySlug)) return null;
  return `/store/${storeSlug}/category/${categorySlug}`;
}

function isStorefrontSlug(value: string): boolean {
  return value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
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
  | (Omit<CategoriesSectionDefinition, "categories"> & {
      categories: StorefrontCategoryItem[];
    })
  | ResolvedProductGridSectionDefinition
  | TextContentSectionDefinition
  | CallToActionSectionDefinition;

export interface StorefrontPageDefinition {
  id: string;
  kind: StorefrontPageKind;
  title: string;
  sections: StorefrontSectionDefinition[];
}
