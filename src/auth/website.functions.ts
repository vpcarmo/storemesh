import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuthorizedStore } from "@/auth/authorized-store";
import {
  resolveCategoryGridSnapshots,
  resolveProductGridSnapshots,
} from "@/data/catalog.repository";
import { resolveMediaReferences } from "@/data/media.repository";
import { readPublicStorefrontSettings } from "@/data/store-settings.repository";
import {
  deleteNavigationItem,
  loadStorefrontFooterNavigation,
  readNavigation,
  readPages,
  readStorePageForPreview,
  saveNavigationItem,
  savePage,
  updatePageSections,
  updatePageStatus,
} from "@/data/website.repository";
import {
  enrichProductGridSection,
  enrichCategoriesSection,
  type PublicStorefrontSectionDefinition,
} from "@/domain/storefront";
import { DEFAULT_STOREFRONT_DESIGN_SETTINGS } from "@/domain/storefront-design.schema";
import { PAGE_STATUSES } from "@/domain/website";
import type { Permission } from "@/domain/access";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const previewSignedUrlLifetimeSeconds = 300;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(160);
const storeInput = z.object({ slug: slug.nullable().optional() });
const pagePreviewInput = storeInput.extend({ pageSlug: slug });
const pageInput = storeInput.extend({
  id: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(160),
  pageSlug: slug,
  status: z.enum(PAGE_STATUSES),
  seoTitle: z.string().trim().max(160).nullable(),
  seoDescription: z.string().trim().max(320).nullable(),
});
const pageStatusInput = storeInput.extend({ id: z.string().uuid(), status: z.enum(PAGE_STATUSES) });
const pageSectionsInput = storeInput.extend({
  id: z.string().uuid(),
  sections: z.array(z.unknown()),
});
const navigationInput = storeInput
  .extend({
    id: z.string().uuid().nullable(),
    label: z.string().trim().min(1).max(120),
    pageId: z.string().uuid().nullable(),
    externalUrl: z.string().url().max(2000).nullable(),
    position: z.number().int().min(0),
    isActive: z.boolean(),
  })
  .refine(
    (value) => (value.pageId === null) !== (value.externalUrl === null),
    "Escolha uma página ou uma URL externa.",
  );
const deleteInput = storeInput.extend({ id: z.string().uuid() });
function email(claims: Record<string, unknown>) {
  return typeof claims["email"] === "string" ? claims["email"] : null;
}
async function authorizedStore(
  client: Parameters<typeof requireAuthorizedStore>[0],
  userId: string,
  claims: Record<string, unknown>,
  selectedSlug?: string | null,
  permission: Permission = "website.manage",
) {
  return requireAuthorizedStore(client, userId, email(claims), permission, selectedSlug);
}
export const getCurrentStoreWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => storeInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "website.view",
    );
    const [pages, navigation] = await Promise.all([
      readPages(context.supabase, store.id),
      readNavigation(context.supabase, store.id),
    ]);
    return { store, pages, navigation };
  });
export const getAdminStorePagePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => pagePreviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "website.view",
    );
    const page = await readStorePageForPreview(context.supabase, store.id, data.pageSlug);
    if (!page) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [settings, navigation, pages] = await Promise.all([
      readPublicStorefrontSettings(supabaseAdmin, store.id),
      readNavigation(context.supabase, store.id),
      readPages(context.supabase, store.id),
    ]).catch(() => {
      throw new Error("Não foi possível carregar os dados da prévia.");
    });
    const imageMediaIds = page.sections.flatMap((section) =>
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
    const sectionMediaIds = [...new Set(imageMediaIds)];
    const productSnapshots = page.sections.flatMap((section) =>
      section.type === "product-grid" ? section.products : [],
    );
    const categorySnapshots = page.sections.flatMap((section) =>
      section.type === "categories" ? section.categories : [],
    );
    const backgroundMediaId =
      settings?.designSettings.background.type === "image"
        ? settings.designSettings.background.mediaAssetId
        : null;
    const [mediaReferences, productGridSnapshots, categoryGridSnapshots] = await Promise.all([
      resolveMediaReferences(
        supabaseAdmin,
        store.id,
        [...imageMediaIds, ...(backgroundMediaId ? [backgroundMediaId] : [])],
        { signedUrlLifetimeSeconds: previewSignedUrlLifetimeSeconds },
      ).catch(() => {
        throw new Error("Não foi possível carregar as mídias da prévia.");
      }),
      resolveProductGridSnapshots(supabaseAdmin, store.id, store.slug, productSnapshots, {
        mediaSignedUrlLifetimeSeconds: previewSignedUrlLifetimeSeconds,
      }),
      resolveCategoryGridSnapshots(supabaseAdmin, store.id, store.slug, categorySnapshots),
    ]);
    if (sectionMediaIds.some((id) => !mediaReferences.has(id)))
      throw new Error("Não foi possível carregar as mídias da prévia.");
    const sections = page.sections.map((section): PublicStorefrontSectionDefinition => {
      if (section.type === "hero" || section.type === "banner" || section.type === "image-text") {
        const media = section.imageMediaAssetId
          ? mediaReferences.get(section.imageMediaAssetId)
          : null;
        if (section.type === "image-text") {
          const { imageMediaAssetId: _imageMediaAssetId, ...publicSection } = section;
          return {
            ...publicSection,
            imageUrl: media?.url ?? null,
            imageAlt: section.imageAlt ?? media?.alt ?? null,
          };
        }
        return { ...section, imageUrl: media?.url ?? null, imageAlt: media?.alt ?? null };
      }
      if (section.type === "product-grid") {
        return enrichProductGridSection(
          section,
          productGridSnapshots.validProductIds,
          productGridSnapshots.images,
          productGridSnapshots.hrefs,
        );
      }
      if (section.type === "categories") {
        return enrichCategoriesSection(section, categoryGridSnapshots.hrefs);
      }
      if (section.type === "partner-brands") {
        return {
          ...section,
          brands: section.brands.map(({ logoMediaAssetId, href, ...brand }) => ({
            ...brand,
            logoUrl: mediaReferences.get(logoMediaAssetId)?.url ?? null,
            ...(href === undefined ? {} : { href }),
          })),
        };
      }
      if (section.type === "editorial-gallery") {
        return {
          ...section,
          images: section.images.map(({ mediaAssetId, alt, caption }) => ({
            imageUrl: mediaReferences.get(mediaAssetId)?.url ?? null,
            alt,
            ...(caption === undefined ? {} : { caption }),
          })),
        };
      }
      return section;
    });
    const slugByPage = new Map(
      pages
        .filter(
          (item) =>
            item.status === "published" &&
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) &&
            item.slug.length <= 160,
        )
        .map((item) => [item.id, item.slug]),
    );
    const footerNavigation = await loadStorefrontFooterNavigation(
      supabaseAdmin,
      store.id,
      store.slug,
      settings?.designSettings.footer ?? DEFAULT_STOREFRONT_DESIGN_SETTINGS.footer,
    );

    return {
      store: { id: store.id, name: store.name, slug: store.slug },
      settings,
      footerNavigation,
      copyrightYear: new Date().getUTCFullYear(),
      backgroundImageUrl: backgroundMediaId
        ? (mediaReferences.get(backgroundMediaId)?.url ?? null)
        : null,
      page: { ...page, sections },
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
                  href: `/store/${store.slug}/${targetSlug}`,
                  pageId: item.pageId,
                },
              ]
            : [];
        }),
    };
  });
export const saveCurrentStorePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => pageInput.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    return savePage(context.supabase, store.id, data.id, {
      title: data.title,
      slug: data.pageSlug,
      status: data.status,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });
  });
export const saveCurrentStorePageSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => pageSectionsInput.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
    );
    await updatePageSections(context.supabase, store.id, data.id, data.sections);
  });
export const setCurrentStorePageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => pageStatusInput.parse(input))
  .handler(async ({ data, context }) =>
    updatePageStatus(
      context.supabase,
      (await authorizedStore(context.supabase, context.userId, context.claims, data.slug)).id,
      data.id,
      data.status,
    ),
  );
export const saveCurrentStoreNavigationItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => navigationInput.parse(input))
  .handler(async ({ data, context }) =>
    saveNavigationItem(
      context.supabase,
      (await authorizedStore(context.supabase, context.userId, context.claims, data.slug)).id,
      data.id,
      data,
    ),
  );
export const deleteCurrentStoreNavigationItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => deleteInput.parse(input))
  .handler(async ({ data, context }) =>
    deleteNavigationItem(
      context.supabase,
      (await authorizedStore(context.supabase, context.userId, context.claims, data.slug)).id,
      data.id,
    ),
  );
