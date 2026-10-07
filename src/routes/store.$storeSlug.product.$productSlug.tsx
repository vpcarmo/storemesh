import { createFileRoute, notFound } from "@tanstack/react-router";

import { getPublishedProductPage } from "@/auth/public-website.functions";
import { PublicStorefrontFrame } from "@/components/storefront/public-storefront-frame";
import { isValidHttpUrl } from "@/domain/storefront-theme";
import { hideBrokenImage } from "@/lib/image";

export const Route = createFileRoute("/store/$storeSlug/product/$productSlug")({
  loader: async ({ params }) => {
    const page = await getPublishedProductPage({ data: params });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({
    links: [
      loaderData?.settings?.faviconUrl && isValidHttpUrl(loaderData.settings.faviconUrl)
        ? { rel: "icon", href: loaderData.settings.faviconUrl }
        : { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    meta: [
      {
        title: `${loaderData?.product.name ?? "Produto"} — ${loaderData?.store.name ?? "StoreMesh"}`,
      },
      {
        name: "description",
        content: loaderData?.product.description.slice(0, 320) ?? "",
      },
    ],
  }),
  component: PublicProductPage,
});

function PublicProductPage() {
  const data = Route.useLoaderData();
  return (
    <PublicStorefrontFrame data={data}>
      <section className="storefront-section storefront-product-page">
        <div className="storefront-section-inner storefront-product-detail">
          {data.product.imageUrl ? (
            <div className="storefront-product-detail-media">
              <img
                src={data.product.imageUrl}
                alt={data.product.imageAlt}
                onError={hideBrokenImage}
              />
            </div>
          ) : (
            <div className="storefront-product-detail-media" aria-hidden="true" />
          )}
          <div className="storefront-product-detail-info">
            <h1>{data.product.name}</h1>
            {data.category?.href ? (
              <p>
                Categoria: <a href={data.category.href}>{data.category.name}</a>
              </p>
            ) : null}
            <p className="storefront-product-detail-description">{data.product.description}</p>
            <strong>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(data.product.price)}
            </strong>
          </div>
        </div>
      </section>
    </PublicStorefrontFrame>
  );
}
