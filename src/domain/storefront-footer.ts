import type { StorefrontNavigationItem } from "@/domain/storefront";
import type { StorefrontDesignSettings } from "@/domain/storefront-design.schema";

export interface StorefrontFooterPage {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  status: string;
}

export interface StorefrontFooterNavigation {
  help: StorefrontNavigationItem[];
  institutional: StorefrontNavigationItem[];
}

function resolveGroup(
  ids: string[],
  pagesById: Map<string, StorefrontFooterPage>,
  storeId: string,
  storeSlug: string,
): StorefrontNavigationItem[] {
  return ids.flatMap((id) => {
    const page = pagesById.get(id);
    if (
      !page ||
      page.storeId !== storeId ||
      page.status !== "published" ||
      typeof page.title !== "string" ||
      !page.title.trim() ||
      typeof page.slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) ||
      page.slug.length > 160
    ) {
      return [];
    }
    return [
      {
        id: page.id,
        label: page.title,
        href: `/store/${storeSlug}/${page.slug}`,
        pageId: page.id,
      },
    ];
  });
}

export function resolveStorefrontFooterNavigation(
  footer: StorefrontDesignSettings["footer"],
  pages: StorefrontFooterPage[],
  storeId: string,
  storeSlug: string,
): StorefrontFooterNavigation {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  return {
    help: resolveGroup(footer.helpPages, pagesById, storeId, storeSlug),
    institutional: resolveGroup(footer.institutionalPages, pagesById, storeId, storeSlug),
  };
}
