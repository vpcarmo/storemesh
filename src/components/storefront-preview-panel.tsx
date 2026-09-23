import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ShoppingBag, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { getCurrentStorefrontFoundation } from "@/auth/storefront.functions";
import {
  StorefrontFooter,
  StorefrontHeader,
  StorefrontLayout,
} from "@/components/storefront/storefront-layout";
import { StorefrontPage } from "@/components/storefront/storefront-page";
import { StorefrontThemeProvider } from "@/components/storefront/storefront-theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StorefrontPageDefinition } from "@/domain/storefront";
import { createStorefrontTheme } from "@/domain/storefront-theme";

const storefrontQueryKey = ["store", "current", "storefront-foundation"] as const;

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível carregar a prévia.";
}

export function StorefrontPreviewPanel({
  requiresStoreSelection = false,
  storeSlug: selectedStoreSlug,
}: {
  requiresStoreSelection?: boolean;
  storeSlug?: string | null;
}) {
  const loadStorefront = useServerFn(getCurrentStorefrontFoundation);
  const [storeSlugInput, setStoreSlugInput] = useState("");
  const [storeSlug, setStoreSlug] = useState<string | null>(selectedStoreSlug ?? null);
  useEffect(() => setStoreSlug(selectedStoreSlug ?? null), [selectedStoreSlug]);
  const storefrontQuery = useQuery({
    queryKey: [...storefrontQueryKey, storeSlug],
    queryFn: () => loadStorefront({ data: { slug: storeSlug } }),
    enabled: !requiresStoreSelection || storeSlug !== null,
  });

  if (requiresStoreSelection && storeSlug === null) {
    return (
      <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
        <p className="text-sm font-semibold">Fundação visual da loja</p>
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setStoreSlug(storeSlugInput);
          }}
        >
          <div className="grid flex-1 gap-2">
            <Label htmlFor="storefront-store-slug">Slug da loja</Label>
            <Input
              id="storefront-store-slug"
              value={storeSlugInput}
              onChange={(event) => setStoreSlugInput(event.target.value)}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </div>
          <Button type="submit">Abrir prévia</Button>
        </form>
      </section>
    );
  }

  if (storefrontQuery.isPending) {
    return <p className="mt-6 text-sm text-muted-foreground">Carregando fundação visual…</p>;
  }
  if (storefrontQuery.isError) {
    return <p className="mt-6 text-sm text-destructive">{messageFrom(storefrontQuery.error)}</p>;
  }
  if (!storefrontQuery.data.store) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Selecione uma loja autorizada para visualizar sua fundação visual.
      </p>
    );
  }

  const { store, settings, categories, products } = storefrontQuery.data;
  const activeCategories = categories.filter((category) => category.isActive);
  const activeProducts = products.filter((product) => product.isActive);
  const theme = createStorefrontTheme(settings);
  const navigation = activeCategories.map((category) => ({
    id: category.id,
    label: category.name,
  }));
  const page: StorefrontPageDefinition = {
    id: `${store.id}-home-preview`,
    kind: "home",
    title: settings?.displayName ?? store.name,
    sections: [
      {
        id: "store-introduction",
        type: "hero",
        title: settings?.displayName ?? store.name,
        description: settings?.shortDescription ?? null,
      },
      {
        id: "store-categories",
        type: "categories",
        title: "Categorias",
        categories: activeCategories,
      },
      {
        id: "store-products",
        type: "product-grid",
        title: "Produtos",
        products: activeProducts,
      },
    ],
  };

  return (
    <section className="mt-6 w-full border-t border-border pt-6" aria-label="Prévia da loja">
      <p className="text-sm font-semibold">Fundação visual da loja</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Prévia estrutural com configurações e catálogo reais.
      </p>
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
            <StorefrontPage page={page} />
          </StorefrontLayout>
        </StorefrontThemeProvider>
      </div>
    </section>
  );
}
