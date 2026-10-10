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
  createHomeBackup,
  createPageFromTemplate,
  loadStorefrontFooterNavigation,
  readNavigation,
  readPages,
  readStorePageForPreview,
  restoreHomeSectionsFromBackup,
  saveNavigationItem,
  savePage,
  updatePageSections,
  updatePageStatus,
} from "@/data/website.repository";
import { applyStorefrontTemplateTypographyPreset } from "@/data/store-settings.repository";
import {
  enrichProductGridSection,
  enrichCategoriesSection,
  type PublicStorefrontSectionDefinition,
} from "@/domain/storefront";
import { DEFAULT_STOREFRONT_DESIGN_SETTINGS } from "@/domain/storefront-design.schema";
import { storefrontSectionsSchema } from "@/domain/storefront-sections.schema";
import {
  getStorefrontPageTemplate,
  getStorefrontTemplate,
  STOREFRONT_HOME_TEMPLATE_IDS,
  STOREFRONT_PAGE_TEMPLATE_IDS,
} from "@/domain/storefront-templates";
import { PAGE_STATUSES } from "@/domain/website";
import type { Permission } from "@/domain/access";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const previewSignedUrlLifetimeSeconds = 300;

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeJsonValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, normalizeJsonValue(nestedValue)]),
    );
  return value;
}

function matchesInitialTemplatePage(
  page: Awaited<ReturnType<typeof readPages>>[number],
  sections: ReturnType<ReturnType<typeof getStorefrontTemplate>["sections"]>,
) {
  return (
    page.title === "Início" &&
    page.slug === "home" &&
    page.status === "published" &&
    page.seoTitle === null &&
    page.seoDescription === null &&
    JSON.stringify(normalizeJsonValue(page.sections)) ===
      JSON.stringify(normalizeJsonValue(sections))
  );
}

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
const applyTemplateInput = storeInput.extend({
  templateId: z.enum(STOREFRONT_HOME_TEMPLATE_IDS),
});
const createPageTemplateInput = storeInput.extend({
  templateId: z.enum(STOREFRONT_PAGE_TEMPLATE_IDS),
});
const restoreHomeBackupInput = storeInput.extend({ backupId: z.string().uuid() });
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
export const getCurrentStorefrontTemplatePreviewData = createServerFn({ method: "POST" })
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [settings, navigation, pages] = await Promise.all([
      readPublicStorefrontSettings(supabaseAdmin, store.id),
      readNavigation(context.supabase, store.id),
      readPages(context.supabase, store.id),
    ]);
    const backgroundMediaId =
      settings?.designSettings.background.type === "image"
        ? settings.designSettings.background.mediaAssetId
        : null;
    const [mediaReferences, footerNavigation] = await Promise.all([
      resolveMediaReferences(
        supabaseAdmin,
        store.id,
        backgroundMediaId ? [backgroundMediaId] : [],
        { signedUrlLifetimeSeconds: previewSignedUrlLifetimeSeconds },
      ),
      loadStorefrontFooterNavigation(
        supabaseAdmin,
        store.id,
        store.slug,
        settings?.designSettings.footer ?? DEFAULT_STOREFRONT_DESIGN_SETTINGS.footer,
      ),
    ]);
    const slugByPage = new Map(
      pages
        .filter(
          (page) =>
            page.status === "published" &&
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) &&
            page.slug.length <= 160,
        )
        .map((page) => [page.id, page.slug]),
    );

    return {
      store: { name: store.name, slug: store.slug },
      settings,
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
      footerNavigation,
      copyrightYear: new Date().getUTCFullYear(),
      backgroundImageUrl: backgroundMediaId
        ? (mediaReferences.get(backgroundMediaId)?.url ?? null)
        : null,
    };
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
export const applyCurrentStorefrontTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => applyTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    const websiteStore = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "website.manage",
    );
    const settingsStore = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "settings.manage",
    );
    if (websiteStore.id !== settingsStore.id)
      throw new Error("As permissões selecionadas não pertencem à mesma loja.");

    const template = getStorefrontTemplate(data.templateId);
    if (template.purpose !== "home")
      throw new Error("Este modelo não pode ser aplicado como página inicial.");
    const templateSections = template.sections(websiteStore.slug);
    const pages = await readPages(context.supabase, websiteStore.id);
    const existingPage = pages[0];
    let page: (typeof pages)[number];
    if (pages.length === 0) {
      page = await savePage(
        context.supabase,
        websiteStore.id,
        null,
        {
          title: "Início",
          slug: "home",
          status: "published",
          seoTitle: null,
          seoDescription: null,
        },
        templateSections,
      );
    } else if (
      pages.length === 1 &&
      existingPage &&
      matchesInitialTemplatePage(existingPage, templateSections)
    ) {
      page = existingPage;
    } else {
      throw new Error(
        "Os modelos iniciais só podem ser aplicados a uma loja sem páginas. O conteúdo existente foi preservado.",
      );
    }

    try {
      const designPresetApplied = await applyStorefrontTemplateTypographyPreset(
        context.supabase,
        websiteStore.id,
        template.typographyPreset,
      );
      return { page, designPresetApplied };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro desconhecido.";
      throw new Error(
        `A página inicial e suas seções foram salvas, mas não foi possível confirmar a aplicação do preset visual. ${detail}`,
      );
    }
  });
export const createCurrentStorePageFromTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => createPageTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    const store = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "website.manage",
    );
    const template = getStorefrontPageTemplate(data.templateId);
    const sections = template.sections(store.slug);
    const parsedSections = storefrontSectionsSchema.safeParse(sections);
    if (!parsedSections.success) {
      const firstIssue = parsedSections.error.issues[0];
      throw new Error(firstIssue?.message ?? "As seções do modelo são inválidas.");
    }

    const page = await createPageFromTemplate(
      context.supabase,
      store.id,
      {
        title: template.page.title,
        slug: template.page.slug,
        status: "draft",
        seoTitle: null,
        seoDescription: null,
      },
      sections,
    );
    return { page };
  });
export const applyCurrentStorefrontTemplateToExistingHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => applyTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    const websiteStore = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "website.manage",
    );
    const settingsStore = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "settings.manage",
    );
    if (websiteStore.id !== settingsStore.id)
      throw new Error("As permissões selecionadas não pertencem à mesma loja.");

    const pages = await readPages(context.supabase, websiteStore.id);
    const homePages = pages.filter((page) => page.slug === "home");
    if (homePages.length !== 1)
      throw new Error("A aplicação exige exatamente uma página Home nesta loja.");
    const homePage = homePages[0];
    if (!homePage) throw new Error("A página Home não foi encontrada.");

    const template = getStorefrontTemplate(data.templateId);
    if (template.purpose !== "home") throw new Error("Este modelo não pode ser aplicado à Home.");
    const parsedTemplateSections = storefrontSectionsSchema.safeParse(
      template.sections(websiteStore.slug),
    );
    if (!parsedTemplateSections.success) {
      const firstIssue = parsedTemplateSections.error.issues[0];
      throw new Error(firstIssue?.message ?? "As seções do modelo são inválidas.");
    }

    const backup = await createHomeBackup(context.supabase, websiteStore.id, homePage.id);
    try {
      await updatePageSections(
        context.supabase,
        websiteStore.id,
        homePage.id,
        parsedTemplateSections.data,
      );
      const updatedHome = await readStorePageForPreview(context.supabase, websiteStore.id, "home");
      if (
        !updatedHome ||
        JSON.stringify(normalizeJsonValue(updatedHome.sections)) !==
          JSON.stringify(normalizeJsonValue(parsedTemplateSections.data))
      )
        throw new Error("As seções aplicadas não corresponderam ao modelo selecionado.");
      return { page: updatedHome, backup };
    } catch (error) {
      const applicationError = error instanceof Error ? error.message : "Erro desconhecido.";
      try {
        await restoreHomeSectionsFromBackup(context.supabase, websiteStore.id, backup.id);
      } catch (restoreError) {
        const restoreMessage =
          restoreError instanceof Error ? restoreError.message : "Erro desconhecido.";
        throw new Error(
          `A aplicação falhou (${applicationError}) e a restauração automática também falhou (${restoreMessage}). A cópia permanece disponível em Website > Páginas > Cópias de segurança da Home: /${backup.slug}.`,
        );
      }
      throw new Error(
        `A aplicação falhou (${applicationError}). As seções originais foram restauradas automaticamente. A cópia de segurança foi mantida em Website > Páginas > Cópias de segurança da Home: /${backup.slug}.`,
      );
    }
  });
export const restoreCurrentStoreHomeBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => restoreHomeBackupInput.parse(input))
  .handler(async ({ data, context }) => {
    const websiteStore = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "website.manage",
    );
    const settingsStore = await authorizedStore(
      context.supabase,
      context.userId,
      context.claims,
      data.slug,
      "settings.manage",
    );
    if (websiteStore.id !== settingsStore.id)
      throw new Error("As permissões selecionadas não pertencem à mesma loja.");

    await restoreHomeSectionsFromBackup(context.supabase, websiteStore.id, data.backupId);
    return { restored: true };
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
