import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { readNavigation, readPages, readPublishedPage } from "@/data/website.repository";
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
    const [settings, navigation, pages] = await Promise.all([
      readStoreSettings(supabaseAdmin, result.store.id),
      readNavigation(supabaseAdmin, result.store.id),
      readPages(supabaseAdmin, result.store.id),
    ]);
    const slugByPage = new Map(
      pages.filter((page) => page.status === "published").map((page) => [page.id, page.slug]),
    );
    return {
      store: { name: result.store.name, slug: result.store.slug },
      page: {
        id: result.page.id,
        title: result.page.title,
        seoTitle: result.page.seoTitle,
        seoDescription: result.page.seoDescription,
        sections: result.page.sections,
      },
      settings,
      navigation: navigation
        .filter((item) => item.isActive)
        .flatMap((item) => {
          const href =
            item.externalUrl ??
            (item.pageId ? `/store/${result.store.slug}/${slugByPage.get(item.pageId)}` : null);
          return href ? [{ id: item.id, label: item.label, href }] : [];
        }),
    };
  });
