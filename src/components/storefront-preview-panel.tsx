import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ShoppingBag, UserRound } from "lucide-react";

import { getAdminStorePagePreview } from "@/auth/website.functions";
import {
  StorefrontFooter,
  StorefrontHeader,
  StorefrontLayout,
} from "@/components/storefront/storefront-layout";
import { StorefrontPage } from "@/components/storefront/storefront-page";
import { StorefrontThemeProvider } from "@/components/storefront/storefront-theme-provider";
import type { StorefrontPageDefinition } from "@/domain/storefront";
import { createStorefrontTheme } from "@/domain/storefront-theme";

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
  const pagePreviewQuery = useQuery({
    queryKey: ["admin-page-preview", storeSlug, pageSlug],
    queryFn: () => {
      if (!pageSlug) throw new Error("Selecione uma página para visualizar.");
      return loadPagePreview({ data: { slug: storeSlug, pageSlug } });
    },
    enabled: storeSlug !== null && storeSlug !== undefined && !!pageSlug,
    refetchOnMount: "always",
  });

  if (requiresStoreSelection && storeSlug === null) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <p className="text-sm font-semibold">Fundação visual da loja</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione uma loja no cabeçalho administrativo para abrir a prévia.
        </p>
      </section>
    );
  }

  if (storeSlug === null || storeSlug === undefined) {
    return <p className="mt-6 text-sm text-muted-foreground">Carregando loja selecionada…</p>;
  }

  if (!pageSlug) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">Selecione uma página para visualizar.</p>
    );
  }

  if (pagePreviewQuery.isPending) {
    return <p className="mt-6 text-sm text-muted-foreground">Carregando página…</p>;
  }
  if (pagePreviewQuery.isError) {
    return <p className="mt-6 text-sm text-destructive">{messageFrom(pagePreviewQuery.error)}</p>;
  }
  if (!pagePreviewQuery.data) {
    return <p className="mt-6 text-sm text-muted-foreground">Página não encontrada.</p>;
  }

  const { store, settings, page: storedPage, navigation } = pagePreviewQuery.data;
  const theme = createStorefrontTheme(settings);
  const page: StorefrontPageDefinition = {
    id: storedPage.id,
    kind: "static",
    title: storedPage.title,
    sections: storedPage.sections,
  };
  const statusLabel = {
    draft: "Rascunho",
    published: "Publicada",
    archived: "Arquivada",
  }[storedPage.status];

  return (
    <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
      <p className="text-sm text-muted-foreground">{statusLabel}</p>
      <div className="mt-4 overflow-hidden rounded-md border border-border">
        <StorefrontThemeProvider theme={theme}>
          <StorefrontLayout
            header={
              <StorefrontHeader
                storeName={settings?.displayName ?? store.name}
                logoUrl={theme.assets.logoUrl}
                navigation={navigation}
                searchSlot={<Search className="size-4" aria-label="Área de busca" />}
                accountSlot={<UserRound className="size-4" aria-label="Área da conta" />}
                cartSlot={<ShoppingBag className="size-4" aria-label="Área do carrinho" />}
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
