import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { getPublishedCategoryPage } from "@/auth/public-website.functions";
import { PublicStorefrontFrame } from "@/components/storefront/public-storefront-frame";
import { StorefrontProductCards } from "@/components/storefront/storefront-sections";
import { PUBLIC_CATEGORY_PAGE_SIZE, type StorefrontProductGridItem } from "@/domain/storefront";
import { isValidHttpUrl } from "@/domain/storefront-theme";

export const Route = createFileRoute("/store/$storeSlug/category/$categorySlug")({
  validateSearch: z.object({
    page: z.coerce.number().int().min(1).max(10000).catch(1),
  }),
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: async ({ params, deps }) => {
    const page = await getPublishedCategoryPage({ data: { ...params, page: deps.page } });
    if (!page) throw notFound();
    if (page.page !== deps.page) {
      throw redirect({
        to: "/store/$storeSlug/category/$categorySlug",
        params,
        search: { page: page.page },
        replace: true,
      });
    }
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
        title: `${loaderData?.category.name ?? "Categoria"} — ${loaderData?.store.name ?? "StoreMesh"}`,
      },
      {
        name: "description",
        content: loaderData?.category.description?.slice(0, 320) ?? "",
      },
    ],
  }),
  component: PublicCategoryPage,
});

function PublicCategoryPage() {
  const data = Route.useLoaderData();
  const { storeSlug, categorySlug } = Route.useParams();
  const products: StorefrontProductGridItem[] = data.products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
    imageAlt: product.imageAlt,
    ...(product.href ? { href: product.href } : {}),
  }));
  const totalPages = Math.max(1, Math.ceil(data.totalProducts / PUBLIC_CATEGORY_PAGE_SIZE));

  return (
    <PublicStorefrontFrame data={data}>
      <section className="storefront-section storefront-category-page">
        <div className="storefront-section-inner">
          <nav className="storefront-product-breadcrumb" aria-label="Navegação estrutural">
            <ol>
              <li>
                <a href={`/store/${storeSlug}`}>Home</a>
              </li>
              <li>
                <a href={`/store/${storeSlug}/catalog`}>Catálogo</a>
              </li>
              <li>
                <span aria-current="page">{data.category.name}</span>
              </li>
            </ol>
          </nav>
          <a className="storefront-category-back" href={`/store/${storeSlug}/catalog`}>
            Voltar ao catálogo
          </a>
          <h1>{data.category.name}</h1>
          {data.category.description ? <p>{data.category.description}</p> : null}
          {products.length > 0 ? (
            <StorefrontProductCards products={products} />
          ) : (
            <p className="storefront-category-empty" role="status">
              Esta categoria ainda não possui produtos disponíveis.
            </p>
          )}
          {totalPages > 1 ? (
            <nav className="storefront-pagination" aria-label="Paginação da categoria">
              {data.page > 1 ? (
                <a href={`/store/${storeSlug}/category/${categorySlug}?page=${data.page - 1}`}>
                  Anterior
                </a>
              ) : (
                <span aria-disabled="true">Anterior</span>
              )}
              <span aria-current="page">
                Página {data.page} de {totalPages}
              </span>
              {data.page < totalPages ? (
                <a href={`/store/${storeSlug}/category/${categorySlug}?page=${data.page + 1}`}>
                  Próxima
                </a>
              ) : (
                <span aria-disabled="true">Próxima</span>
              )}
            </nav>
          ) : null}
        </div>
      </section>
    </PublicStorefrontFrame>
  );
}
