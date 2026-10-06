import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { getPublishedStorePage } from "@/auth/public-website.functions";
import {
  StorefrontFooter,
  StorefrontHeader,
  StorefrontLayout,
} from "@/components/storefront/storefront-layout";
import { StorefrontPage } from "@/components/storefront/storefront-page";
import { StorefrontThemeProvider } from "@/components/storefront/storefront-theme-provider";
import { createStorefrontTheme, isValidHttpUrl } from "@/domain/storefront-theme";

export const Route = createFileRoute("/store/$storeSlug/$pageSlug")({
  loader: async ({ context, params }) => {
    const page = await getPublishedStorePage({ data: params });
    if (!page) throw notFound();
    context.queryClient.setQueryData(["public-page", params.storeSlug, params.pageSlug], page);
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
  component: PublicPage,
});
function PublicPage() {
  const { storeSlug, pageSlug } = Route.useParams();
  const load = useServerFn(getPublishedStorePage);
  const query = useQuery({
    queryKey: ["public-page", storeSlug, pageSlug],
    queryFn: () => load({ data: { storeSlug, pageSlug } }),
  });
  const data = query.data;
  if (!data) return null;
  const theme = createStorefrontTheme(data.settings, data.backgroundImageUrl);
  const navigation = data.navigation;
  const page = {
    id: data.page.id,
    kind: "static" as const,
    title: data.page.title,
    sections: data.page.sections,
  };
  return (
    <StorefrontThemeProvider theme={theme}>
      <StorefrontLayout
        header={
          <StorefrontHeader
            storeName={data.settings?.displayName ?? data.store.name}
            logoUrl={theme.assets.logoUrl}
            navigation={navigation}
          />
        }
        footer={<StorefrontFooter storeName={data.store.name} settings={data.settings} />}
      >
        <StorefrontPage page={page} />
      </StorefrontLayout>
    </StorefrontThemeProvider>
  );
}
