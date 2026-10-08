import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { getPublishedStorePage } from "@/auth/public-website.functions";
import { PublicStorefrontPageComposition } from "@/components/storefront/public-storefront-frame";
import { isValidHttpUrl } from "@/domain/storefront-theme";

export const Route = createFileRoute("/store/$storeSlug/")({
  loader: async ({ context, params }) => {
    const page = await getPublishedStorePage({
      data: { storeSlug: params.storeSlug, pageSlug: "home" },
    });
    if (!page) throw notFound();
    context.queryClient.setQueryData(["public-page", params.storeSlug, "home"], page);
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
        title: `${loaderData?.page.seoTitle ?? loaderData?.page.title ?? "Página"} — ${loaderData?.store.name ?? "StoreMesh"}`,
      },
      { name: "description", content: loaderData?.page.seoDescription ?? "" },
    ],
  }),
  component: PublicStoreHome,
});

function PublicStoreHome() {
  const { storeSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const load = useServerFn(getPublishedStorePage);
  const query = useQuery({
    queryKey: ["public-page", storeSlug, "home"],
    queryFn: () => load({ data: { storeSlug, pageSlug: "home" } }),
    initialData: loaderData,
  });
  const data = query.data;
  if (!data) return null;

  return (
    <PublicStorefrontPageComposition
      data={data}
      page={{
        id: data.page.id,
        kind: "static",
        title: data.page.title,
        sections: data.page.sections,
      }}
    />
  );
}
