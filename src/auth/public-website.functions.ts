import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveMediaReferences } from "@/data/media.repository";
import type { PublicStorefrontSectionDefinition } from "@/domain/storefront";
import { DEFAULT_STOREFRONT_DESIGN_SETTINGS } from "@/domain/storefront-design.schema";
import { storefrontSectionsReadSchema } from "@/domain/storefront-sections.schema";
import {
  loadStorefrontFooterNavigation,
  readNavigation,
  readPages,
  readPublishedPage,
} from "@/data/website.repository";
import { readStoreSettings } from "@/data/store-settings.repository";

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(160);
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
      readStoreSettings(supabaseAdmin, result.store.id),
      readNavigation(supabaseAdmin, result.store.id),
      readPages(supabaseAdmin, result.store.id),
    ]);
    const imageMediaIds = parsedPageSections.flatMap((section) =>
      (section.type === "hero" || section.type === "banner") && section.imageMediaAssetId
        ? [section.imageMediaAssetId]
        : [],
    );
    const backgroundMediaId =
      settings?.designSettings.background.type === "image"
        ? settings.designSettings.background.mediaAssetId
        : null;
    const [mediaReferences, footerNavigation] = await Promise.all([
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
                message: section.message,
                ...(section.action === undefined ? {} : { action: section.action }),
                imageUrl: media?.url ?? null,
                imageAlt: media?.alt ?? null,
              },
            ];
          }
          case "categories":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.title === undefined ? {} : { title: section.title }),
                categories: section.categories.map(({ id, name, description }) => ({
                  id,
                  name,
                  description,
                })),
              },
            ];
          case "product-grid":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.title === undefined ? {} : { title: section.title }),
                products: section.products.map(({ id, name, description, price }) => ({
                  id,
                  name,
                  description,
                  price,
                })),
              },
            ];
          case "text-content":
            return [
              {
                id: section.id,
                type: section.type,
                ...(section.title === undefined ? {} : { title: section.title }),
                content: section.content,
                ...(section.contentFormat === undefined
                  ? {}
                  : { contentFormat: section.contentFormat }),
              },
            ];
          case "call-to-action":
            return [
              {
                id: section.id,
                type: section.type,
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
        .filter(
          (page) =>
            page.status === "published" &&
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) &&
            page.slug.length <= 160,
        )
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
                  href: `/store/${result.store.slug}/${targetSlug}`,
                  pageId: item.pageId,
                },
              ]
            : [];
        }),
    };
  });
