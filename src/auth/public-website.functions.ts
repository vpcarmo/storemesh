import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  readPublicCatalogCategories,
  readPublicCatalogProducts,
  readPublicCategoryPage,
  readPublicProductDetails,
  resolveCategoryGridSnapshots,
  resolveProductGridSnapshots,
} from "@/data/catalog.repository";
import { resolveMediaReferences } from "@/data/media.repository";
import {
  enrichCategoriesSection,
  enrichProductGridSection,
  storefrontCategoryHref,
  storefrontProductHref,
  type PublicStorefrontSectionDefinition,
} from "@/domain/storefront";
import { DEFAULT_STOREFRONT_DESIGN_SETTINGS } from "@/domain/storefront-design.schema";
import { storefrontSectionsReadSchema } from "@/domain/storefront-sections.schema";
import {
  loadStorefrontFooterNavigation,
  readActiveStore,
  readPublicNavigation,
  readPublishedPageLinks,
  readPublishedPage,
} from "@/data/website.repository";
import { readPublicStorefrontSettings } from "@/data/store-settings.repository";

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(160);
const catalogPageInput = z.object({
  storeSlug: slug,
  page: z.number().int().min(1).max(10000).catch(1),
});

async function preparePublicStorefront(
  client: Parameters<typeof readPublicStorefrontSettings>[0],
  store: { id: string; name: string; slug: string },
) {
  const [settings, navigation, pages] = await Promise.all([
    readPublicStorefrontSettings(client, store.id),
    readPublicNavigation(client, store.id),
    readPublishedPageLinks(client, store.id),
  ]);
  const backgroundMediaId =
    settings?.designSettings.background.type === "image"
      ? settings.designSettings.background.mediaAssetId
      : null;
  const [mediaReferences, footerNavigation] = await Promise.all([
    resolveMediaReferences(client, store.id, backgroundMediaId ? [backgroundMediaId] : []),
    loadStorefrontFooterNavigation(
      client,
      store.id,
      store.slug,
      settings?.designSettings.footer ?? DEFAULT_STOREFRONT_DESIGN_SETTINGS.footer,
    ),
  ]);
  const slugByPage = new Map(
    pages
      .filter((page) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) && page.slug.length <= 160)
      .map((page) => [page.id, page.slug]),
  );
  return {
    store: { name: store.name, slug: store.slug },
    settings,
    footerNavigation,
    copyrightYear: new Date().getUTCFullYear(),
    backgroundImageUrl: backgroundMediaId
      ? (mediaReferences.get(backgroundMediaId)?.url ?? null)
      : null,
    navigation: navigation
      .filter((item) => item.isActive)
      .flatMap((item) => {
        if (item.externalUrl)
          return [{ id: item.id, label: item.label, href: item.externalUrl, pageId: null }];
        const targetSlug = item.pageId ? slugByPage.get(item.pageId) : undefined;
        return targetSlug
          ? [
              {
                id: item.id,
                label: item.label,
                href:
                  targetSlug === "home"
                    ? `/store/${store.slug}`
                    : `/store/${store.slug}/${targetSlug}`,
                pageId: item.pageId,
              },
            ]
          : [];
      }),
  };
}

export const getPublishedStorePage = createServerFn({ method: "GET" })
  .validator((input) => z.object({ storeSlug: slug, pageSlug: slug }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await readPublishedPage(supabaseAdmin, data.storeSlug, data.pageSlug);
    if (!result) return null;
    const parsedSections = storefrontSectionsReadSchema.safeParse(result.page.sections);
    if (!parsedSections.success) throw new Error("As seções salvas desta página são inválidas.");
    const parsedPageSections = parsedSections.data;
    const [settings, navigation, pages] = await Promise.all([
      readPublicStorefrontSettings(supabaseAdmin, result.store.id),
      readPublicNavigation(supabaseAdmin, result.store.id),
      readPublishedPageLinks(supabaseAdmin, result.store.id),
    ]);
    const imageMediaIds = parsedPageSections.flatMap((section) =>
      section.type === "hero" || section.type === "banner" || section.type === "image-text"
        ? section.imageMediaAssetId
          ? [section.imageMediaAssetId]
          : []
        : section.type === "partner-brands"
          ? section.brands.map(({ logoMediaAssetId }) => logoMediaAssetId)
          : section.type === "editorial-gallery"
            ? section.images.map(({ mediaAssetId }) => mediaAssetId)
            : [],
    );
    const backgroundMediaId =
      settings?.designSettings.background.type === "image"
        ? settings.designSettings.background.mediaAssetId
        : null;
    const productSnapshots = parsedPageSections.flatMap((section) =>
      section.type === "product-grid" ? section.products : [],
    );
    const categorySnapshots = parsedPageSections.flatMap((section) =>
      section.type === "categories" ? section.categories : [],
    );
    const [mediaReferences, footerNavigation, productGridSnapshots, categoryGridSnapshots] =
      await Promise.all([
        resolveMediaReferences(supabaseAdmin, result.store.id, [
          ...imageMediaIds,
          ...(backgroundMediaId ? [backgroundMediaId] : []),
        ]),
        loadStorefrontFooterNavigation(
          supabaseAdmin,
          result.store.id,
          result.store.slug,
          settings?.designSettings.footer ?? DEFAULT_STOREFRONT_DESIGN_SETTINGS.footer,
        ),
        resolveProductGridSnapshots(
          supabaseAdmin,
          result.store.id,
          result.store.slug,
          productSnapshots,
        ),
        resolveCategoryGridSnapshots(
          supabaseAdmin,
          result.store.id,
          result.store.slug,
          categorySnapshots,
        ),
      ]);
    const publicSections = parsedPageSections.flatMap<PublicStorefrontSectionDefinition>(
      (section) => {
        switch (section.type) {
          case "hero": {
            const media = section.imageMediaAssetId
              ? mediaReferences.get(section.imageMediaAssetId)
              : null;
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                title: section.title,
                ...(section.description === undefined ? {} : { description: section.description }),
                ...(section.action === undefined ? {} : { action: section.action }),
                imageUrl: media?.url ?? null,
                imageAlt: media?.alt ?? null,
              },
            ];
          }
          case "banner": {
            const media = section.imageMediaAssetId
              ? mediaReferences.get(section.imageMediaAssetId)
              : null;
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                message: section.message,
                ...(section.action === undefined ? {} : { action: section.action }),
                imageUrl: media?.url ?? null,
                imageAlt: media?.alt ?? null,
              },
            ];
          }
          case "categories":
            return [
              enrichCategoriesSection(
                {
                  id: section.id,
                  type: section.type,
                  ...(section.backgroundColor === undefined
                    ? {}
                    : { backgroundColor: section.backgroundColor }),
                  ...(section.sectionSpacing === undefined
                    ? {}
                    : { sectionSpacing: section.sectionSpacing }),
                  ...(section.contentWidth === undefined
                    ? {}
                    : { contentWidth: section.contentWidth }),
                  ...(section.contentAlignment === undefined
                    ? {}
                    : { contentAlignment: section.contentAlignment }),
                  ...(section.title === undefined ? {} : { title: section.title }),
                  categories: section.categories,
                },
                categoryGridSnapshots.hrefs,
              ),
            ];
          case "product-grid":
            return [
              enrichProductGridSection(
                {
                  id: section.id,
                  type: section.type,
                  ...(section.backgroundColor === undefined
                    ? {}
                    : { backgroundColor: section.backgroundColor }),
                  ...(section.sectionSpacing === undefined
                    ? {}
                    : { sectionSpacing: section.sectionSpacing }),
                  ...(section.contentWidth === undefined
                    ? {}
                    : { contentWidth: section.contentWidth }),
                  ...(section.contentAlignment === undefined
                    ? {}
                    : { contentAlignment: section.contentAlignment }),
                  ...(section.title === undefined ? {} : { title: section.title }),
                  products: section.products,
                },
                productGridSnapshots.validProductIds,
                productGridSnapshots.images,
                productGridSnapshots.hrefs,
              ),
            ];
          case "text-content":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                ...(section.sectionSpacing === undefined
                  ? {}
                  : { sectionSpacing: section.sectionSpacing }),
                ...(section.contentWidth === undefined
                  ? {}
                  : { contentWidth: section.contentWidth }),
                ...(section.contentAlignment === undefined
                  ? {}
                  : { contentAlignment: section.contentAlignment }),
                ...(section.title === undefined ? {} : { title: section.title }),
                content: section.content,
                ...(section.contentFormat === undefined
                  ? {}
                  : { contentFormat: section.contentFormat }),
              },
            ];
          case "image-text": {
            const media = section.imageMediaAssetId
              ? mediaReferences.get(section.imageMediaAssetId)
              : null;
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                ...(section.sectionSpacing === undefined
                  ? {}
                  : { sectionSpacing: section.sectionSpacing }),
                ...(section.contentWidth === undefined
                  ? {}
                  : { contentWidth: section.contentWidth }),
                ...(section.contentAlignment === undefined
                  ? {}
                  : { contentAlignment: section.contentAlignment }),
                title: section.title,
                description: section.description,
                ...(section.imagePosition === undefined
                  ? {}
                  : { imagePosition: section.imagePosition }),
                imageUrl: media?.url ?? null,
                imageAlt: section.imageAlt ?? media?.alt ?? null,
              },
            ];
          }
          case "benefits":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                ...(section.sectionSpacing === undefined
                  ? {}
                  : { sectionSpacing: section.sectionSpacing }),
                ...(section.contentWidth === undefined
                  ? {}
                  : { contentWidth: section.contentWidth }),
                ...(section.contentAlignment === undefined
                  ? {}
                  : { contentAlignment: section.contentAlignment }),
                ...(section.title === undefined ? {} : { title: section.title }),
                ...(section.description === undefined ? {} : { description: section.description }),
                benefits: section.benefits,
              },
            ];
          case "faq":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                ...(section.sectionSpacing === undefined
                  ? {}
                  : { sectionSpacing: section.sectionSpacing }),
                ...(section.contentWidth === undefined
                  ? {}
                  : { contentWidth: section.contentWidth }),
                ...(section.contentAlignment === undefined
                  ? {}
                  : { contentAlignment: section.contentAlignment }),
                ...(section.title === undefined ? {} : { title: section.title }),
                ...(section.description === undefined ? {} : { description: section.description }),
                items: section.items,
              },
            ];
          case "testimonials":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                ...(section.sectionSpacing === undefined
                  ? {}
                  : { sectionSpacing: section.sectionSpacing }),
                ...(section.contentWidth === undefined
                  ? {}
                  : { contentWidth: section.contentWidth }),
                ...(section.contentAlignment === undefined
                  ? {}
                  : { contentAlignment: section.contentAlignment }),
                ...(section.title === undefined ? {} : { title: section.title }),
                ...(section.description === undefined ? {} : { description: section.description }),
                testimonials: section.testimonials.map(({ role, company, ...testimonial }) => ({
                  ...testimonial,
                  ...(role === undefined ? {} : { role }),
                  ...(company === undefined ? {} : { company }),
                })),
              },
            ];
          case "partner-brands":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                ...(section.sectionSpacing === undefined
                  ? {}
                  : { sectionSpacing: section.sectionSpacing }),
                ...(section.contentWidth === undefined
                  ? {}
                  : { contentWidth: section.contentWidth }),
                ...(section.contentAlignment === undefined
                  ? {}
                  : { contentAlignment: section.contentAlignment }),
                ...(section.title === undefined ? {} : { title: section.title }),
                brands: section.brands.map(({ logoMediaAssetId, href, ...brand }) => ({
                  ...brand,
                  logoUrl: mediaReferences.get(logoMediaAssetId)?.url ?? null,
                  ...(href === undefined ? {} : { href }),
                })),
              },
            ];
          case "editorial-gallery":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                ...(section.sectionSpacing === undefined
                  ? {}
                  : { sectionSpacing: section.sectionSpacing }),
                ...(section.contentWidth === undefined
                  ? {}
                  : { contentWidth: section.contentWidth }),
                ...(section.contentAlignment === undefined
                  ? {}
                  : { contentAlignment: section.contentAlignment }),
                ...(section.title === undefined ? {} : { title: section.title }),
                images: section.images.map(({ mediaAssetId, alt, caption }) => ({
                  imageUrl: mediaReferences.get(mediaAssetId)?.url ?? null,
                  alt,
                  ...(caption === undefined ? {} : { caption }),
                })),
              },
            ];
          case "call-to-action":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.backgroundColor === undefined
                  ? {}
                  : { backgroundColor: section.backgroundColor }),
                title: section.title,
                ...(section.description === undefined ? {} : { description: section.description }),
                action: section.action,
              },
            ];
          default:
            return [];
        }
      },
    );
    const slugByPage = new Map(
      pages
        .filter((page) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) && page.slug.length <= 160)
        .map((page) => [page.id, page.slug]),
    );
    return {
      store: { name: result.store.name, slug: result.store.slug },
      page: {
        id: result.page.id,
        title: result.page.title,
        seoTitle: result.page.seoTitle,
        seoDescription: result.page.seoDescription,
        sections: publicSections,
      },
      settings,
      footerNavigation,
      copyrightYear: new Date().getUTCFullYear(),
      backgroundImageUrl: backgroundMediaId
        ? (mediaReferences.get(backgroundMediaId)?.url ?? null)
        : null,
      navigation: navigation
        .filter((item) => item.isActive)
        .flatMap((item) => {
          if (item.externalUrl) {
            return [{ id: item.id, label: item.label, href: item.externalUrl, pageId: null }];
          }
          const targetSlug = item.pageId ? slugByPage.get(item.pageId) : undefined;
          return targetSlug
            ? [
                {
                  id: item.id,
                  label: item.label,
                  href:
                    targetSlug === "home"
                      ? `/store/${result.store.slug}`
                      : `/store/${result.store.slug}/${targetSlug}`,
                  pageId: item.pageId,
                },
              ]
            : [];
        }),
    };
  });

export const getPublishedProductPage = createServerFn({ method: "GET" })
  .validator((input) => z.object({ storeSlug: slug, productSlug: slug }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await readActiveStore(supabaseAdmin, data.storeSlug);
    if (!store) return null;
    const [catalog, storefront] = await Promise.all([
      readPublicProductDetails(supabaseAdmin, store.id, data.productSlug),
      preparePublicStorefront(supabaseAdmin, store),
    ]);
    if (!catalog) return null;
    const categoryHref = catalog.category
      ? storefrontCategoryHref(store.slug, catalog.category.slug)
      : null;
    return {
      ...storefront,
      product: catalog.product,
      images: catalog.images,
      attributes: catalog.attributes,
      variants: catalog.variants,
      category:
        catalog.category && categoryHref ? { ...catalog.category, href: categoryHref } : null,
    };
  });

export const getPublishedCatalogPage = createServerFn({ method: "GET" })
  .validator((input) => z.object({ storeSlug: slug }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await readActiveStore(supabaseAdmin, data.storeSlug);
    if (!store) return null;

    const [categories, products, storefront] = await Promise.all([
      readPublicCatalogCategories(supabaseAdmin, store.id),
      readPublicCatalogProducts(supabaseAdmin, store.id),
      preparePublicStorefront(supabaseAdmin, store),
    ]);

    return {
      ...storefront,
      categories: categories.flatMap((category) => {
        const href = storefrontCategoryHref(store.slug, category.slug);
        return href ? [{ ...category, href }] : [];
      }),
      products: products.map((product) => ({
        ...product,
        href: storefrontProductHref(store.slug, product.slug),
      })),
    };
  });

export const getPublishedCategoryPage = createServerFn({ method: "GET" })
  .validator((input) => catalogPageInput.extend({ categorySlug: slug }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await readActiveStore(supabaseAdmin, data.storeSlug);
    if (!store) return null;
    const [catalog, storefront] = await Promise.all([
      readPublicCategoryPage(supabaseAdmin, store.id, store.slug, data.categorySlug, data.page),
      preparePublicStorefront(supabaseAdmin, store),
    ]);
    if (!catalog) return null;
    return {
      ...storefront,
      category: catalog.category,
      products: catalog.products,
      totalProducts: catalog.totalProducts,
      page: catalog.page,
    };
  });
