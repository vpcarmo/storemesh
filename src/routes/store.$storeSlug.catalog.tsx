import { createFileRoute, notFound } from "@tanstack/react-router";

import { getPublishedCatalogPage } from "@/auth/public-website.functions";
import { PublicStorefrontFrame } from "@/components/storefront/public-storefront-frame";
import {
  StorefrontCategoriesSection,
  StorefrontProductCards,
} from "@/components/storefront/storefront-sections";
import type { StorefrontProductGridItem } from "@/domain/storefront";
import { isValidHttpUrl } from "@/domain/storefront-theme";

export const Route = createFileRoute("/store/$storeSlug/catalog")({
  loader: async ({ params }) => {
    const catalog = await getPublishedCatalogPage({ data: params });
    if (!catalog) throw notFound();
    return catalog;
  },
  head: ({ loaderData }) => ({
    links: [
      loaderData?.settings?.faviconUrl && isValidHttpUrl(loaderData.settings.faviconUrl)
        ? { rel: "icon", href: loaderData.settings.faviconUrl }
        : { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    meta: [
      { title: `Catálogo | ${loaderData?.store.name ?? "StoreMesh"}` },
      {
        name: "description",
        content: loaderData?.settings?.shortDescription ?? "",
      },
    ],
  }),
  component: PublicCatalogPage,
});

function PublicCatalogPage() {
  const data = Route.useLoaderData();
  const products: StorefrontProductGridItem[] = data.products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
    imageAlt: product.imageAlt,
    ...(product.href ? { href: product.href } : {}),
  }));

  return (
    <PublicStorefrontFrame data={data}>
      <section className="storefront-section">
        <div className="storefront-section-inner">
          <h1>Catálogo</h1>
        </div>
      </section>
      {data.categories.length > 0 ? (
        <StorefrontCategoriesSection title="Categorias" categories={data.categories} />
      ) : null}
      <section className="storefront-section">
        <div className="storefront-section-inner">
          <h2>Produtos</h2>
          {products.length > 0 ? (
            <StorefrontProductCards products={products} />
          ) : (
            <p className="storefront-category-empty" role="status">
              Esta loja ainda não possui produtos disponíveis.
            </p>
          )}
        </div>
      </section>
    </PublicStorefrontFrame>
  );
}
