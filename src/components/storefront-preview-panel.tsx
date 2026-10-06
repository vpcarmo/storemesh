import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";

import { getAdminStorePagePreview, getCurrentStoreWebsite } from "@/auth/website.functions";
import {
  StorefrontFooter,
  StorefrontHeader,
  StorefrontLayout,
} from "@/components/storefront/storefront-layout";
import { StorefrontPage } from "@/components/storefront/storefront-page";
import { StorefrontThemeProvider } from "@/components/storefront/storefront-theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StorefrontPageDefinition } from "@/domain/storefront";
import { createStorefrontTheme } from "@/domain/storefront-theme";

const statusLabels = {
  draft: "Rascunho",
  published: "Publicada",
  archived: "Arquivada",
} as const;

const safeErrorMessages = new Set([
  "Nenhuma loja autorizada foi selecionada.",
  "Não foi possível carregar a página de prévia.",
  "As seções salvas desta página são inválidas.",
  "Não foi possível carregar os dados da prévia.",
  "Não foi possível carregar as mídias da prévia.",
]);

function messageFrom(error: unknown): string {
  return error instanceof Error && safeErrorMessages.has(error.message)
    ? error.message
    : "Não foi possível carregar a prévia. Verifique seu acesso e tente novamente.";
}

export function StorefrontPreviewPanel({
  requiresStoreSelection,
  storeSlug,
  pageSlug,
}: {
  requiresStoreSelection: boolean;
  storeSlug?: string | null;
  pageSlug?: string;
}) {
  const loadPagePreview = useServerFn(getAdminStorePagePreview);
  const loadWebsite = useServerFn(getCurrentStoreWebsite);
  const navigate = useNavigate({ from: "/admin/preview" });
  const websiteQuery = useQuery({
    queryKey: ["website", storeSlug],
    queryFn: () => loadWebsite({ data: { slug: storeSlug } }),
    enabled: storeSlug !== null && storeSlug !== undefined,
  });
  const pagePreviewQuery = useQuery({
    queryKey: ["admin-page-preview", storeSlug, pageSlug],
    queryFn: () => {
      if (!pageSlug) throw new Error("Selecione uma página para visualizar.");
      return loadPagePreview({ data: { slug: storeSlug, pageSlug } });
    },
    enabled: storeSlug !== null && storeSlug !== undefined && !!pageSlug,
    refetchOnMount: "always",
  });

  useEffect(() => {
    const firstPage = websiteQuery.data?.pages[0];
    if (!pageSlug && firstPage) {
      void navigate({
        to: "/admin/preview",
        search: { page: firstPage.slug },
        replace: true,
      });
    }
  }, [navigate, pageSlug, websiteQuery.data]);

  if (requiresStoreSelection && storeSlug === null) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <p className="text-sm font-semibold">Visualização da página</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione uma loja no cabeçalho administrativo para abrir a prévia.
        </p>
      </section>
    );
  }

  if (storeSlug === null || storeSlug === undefined) {
    return <p className="mt-6 text-sm text-muted-foreground">Carregando loja selecionada…</p>;
  }

  if (websiteQuery.isPending) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <p className="text-sm font-semibold">Visualização da página</p>
        <p className="mt-2 text-sm text-muted-foreground">Carregando páginas…</p>
      </section>
    );
  }

  if (websiteQuery.isError || !websiteQuery.data) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <p className="text-sm font-semibold">Visualização da página</p>
        <p className="mt-2 text-sm text-destructive">{messageFrom(websiteQuery.error)}</p>
      </section>
    );
  }

  const pages = websiteQuery.data.pages;
  if (pages.length === 0) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <p className="text-sm font-semibold">Visualização da página</p>
        <div className="mt-4 rounded-md border border-dashed p-6">
          <p className="font-medium">Nenhuma página cadastrada.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma página em Website &gt; Páginas para começar a visualizar o conteúdo.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/admin/website/pages">Ir para Páginas</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!pageSlug) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <p className="text-sm font-semibold">Visualização da página</p>
        <p className="mt-2 text-sm text-muted-foreground">Selecionando a primeira página…</p>
      </section>
    );
  }

  if (pagePreviewQuery.isPending) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold">Visualização da página</p>
            <label className="flex items-center gap-2 text-sm">
              Página:
              <select
                className="h-9 min-w-48 rounded-md border bg-background px-3"
                value={pageSlug}
                onChange={(event) =>
                  void navigate({
                    to: "/admin/preview",
                    search: { page: event.target.value },
                  })
                }
                aria-label="Selecionar página para visualizar"
              >
                {pages.some((item) => item.slug === pageSlug) ? null : (
                  <option value={pageSlug}>Página não encontrada</option>
                )}
                {pages.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.title} · {statusLabels[item.status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <span className="text-sm text-muted-foreground" role="status">
            Carregando página…
          </span>
        </div>
      </section>
    );
  }

  const storedPage = pagePreviewQuery.data?.page;
  const selectedPage = pages.find((item) => item.slug === pageSlug);
  const pageError = pagePreviewQuery.isError ? messageFrom(pagePreviewQuery.error) : null;

  if (!storedPage || !pagePreviewQuery.data) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold">Visualização da página</p>
            <label className="flex items-center gap-2 text-sm">
              Página:
              <select
                className="h-9 min-w-48 rounded-md border bg-background px-3"
                value={pageSlug}
                onChange={(event) =>
                  void navigate({
                    to: "/admin/preview",
                    search: { page: event.target.value },
                  })
                }
                aria-label="Selecionar página para visualizar"
              >
                {selectedPage ? null : <option value={pageSlug}>Página não encontrada</option>}
                {pages.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.title} · {statusLabels[item.status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/website/pages">Editar página</Link>
          </Button>
        </div>
        <p className={`mt-4 text-sm ${pageError ? "text-destructive" : "text-muted-foreground"}`}>
          {pageError ?? "Página não encontrada."}
        </p>
      </section>
    );
  }

  const { store, settings, navigation, backgroundImageUrl } = pagePreviewQuery.data;
  const theme = createStorefrontTheme(settings, backgroundImageUrl);
  const page: StorefrontPageDefinition = {
    id: storedPage.id,
    kind: "static",
    title: storedPage.title,
    sections: storedPage.sections,
  };

  return (
    <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-2">
          <p className="text-sm font-semibold">Visualização da página</p>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Página:
            <select
              className="h-9 min-w-48 rounded-md border bg-background px-3"
              value={pageSlug}
              onChange={(event) =>
                void navigate({
                  to: "/admin/preview",
                  search: { page: event.target.value },
                })
              }
              aria-label="Selecionar página para visualizar"
            >
              {pages.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.title} · {statusLabels[item.status]}
                </option>
              ))}
            </select>
            <Badge variant="secondary">{statusLabels[storedPage.status]}</Badge>
          </label>
          <h1 className="text-lg font-semibold">{storedPage.title}</h1>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/website/pages">Editar página</Link>
        </Button>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-border">
        <StorefrontThemeProvider theme={theme}>
          <StorefrontLayout
            header={
              <StorefrontHeader
                storeName={settings?.displayName ?? store.name}
                logoUrl={theme.assets.logoUrl}
                navigation={navigation}
                currentPageId={storedPage.id}
              />
            }
            footer={<StorefrontFooter storeName={store.name} settings={settings} />}
          >
            {page.sections.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Esta página ainda não possui seções.
              </p>
            ) : null}
            <StorefrontPage page={page} />
          </StorefrontLayout>
        </StorefrontThemeProvider>
      </div>
    </section>
  );
}
