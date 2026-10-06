import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveAuthorizedStore } from "@/auth/authorized-store";
import { resolveMediaReferences } from "@/data/media.repository";
import { readStoreSettings } from "@/data/store-settings.repository";
import {
  deleteNavigationItem,
  readNavigation,
  readPages,
  readStorePageForPreview,
  saveNavigationItem,
  savePage,
  updatePageSections,
  updatePageStatus,
} from "@/data/website.repository";
import type { PublicStorefrontSectionDefinition } from "@/domain/storefront";
import { PAGE_STATUSES } from "@/domain/website";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  client: Parameters<typeof resolveAuthorizedStore>[0],
  userId: string,
  claims: Record<string, unknown>,
  selectedSlug?: string | null,
) {
  const store = await resolveAuthorizedStore(client, userId, email(claims), selectedSlug);
  if (!store) throw new Error("Nenhuma loja autorizada foi selecionada.");
  return store;
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
    );
    const page = await readStorePageForPreview(context.supabase, store.id, data.pageSlug);
    if (!page) return null;

    const [settings, navigation, pages] = await Promise.all([
      readStoreSettings(context.supabase, store.id),
      readNavigation(context.supabase, store.id),
      readPages(context.supabase, store.id),
    ]).catch(() => {
      throw new Error("Não foi possível carregar os dados da prévia.");
    });
    const imageMediaIds = page.sections.flatMap((section) =>
      (section.type === "hero" || section.type === "banner") && section.imageMediaAssetId
        ? [section.imageMediaAssetId]
        : [],
    );
    const mediaReferences = await resolveMediaReferences(
      context.supabase,
      store.id,
      imageMediaIds,
    ).catch(() => {
      throw new Error("Não foi possível carregar as mídias da prévia.");
    });
    if (mediaReferences.size !== new Set(imageMediaIds).size)
      throw new Error("Não foi possível carregar as mídias da prévia.");
    const sections = page.sections.map((section): PublicStorefrontSectionDefinition => {
      if (section.type === "hero" || section.type === "banner") {
        const media = section.imageMediaAssetId
          ? mediaReferences.get(section.imageMediaAssetId)
          : null;
        return { ...section, imageUrl: media?.url ?? null, imageAlt: media?.alt ?? null };
      }
      return section;
    });
    const slugByPage = new Map(
      pages.filter((item) => item.status === "published").map((item) => [item.id, item.slug]),
    );

    return {
      store: { id: store.id, name: store.name, slug: store.slug },
      settings,
      page: { ...page, sections },
      navigation: navigation
        .filter((item) => item.isActive)
        .flatMap((item) => {
          const targetSlug = item.pageId ? slugByPage.get(item.pageId) : undefined;
          const href =
            item.externalUrl ?? (targetSlug ? `/store/${store.slug}/${targetSlug}` : null);
          return href ? [{ id: item.id, label: item.label, href }] : [];
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
