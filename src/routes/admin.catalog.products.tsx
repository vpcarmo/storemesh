import { createFileRoute } from "@tanstack/react-router";

import { useAdminStore } from "@/components/admin/admin-store-context";
import { CatalogPanel } from "@/components/catalog-panel";

export const Route = createFileRoute("/admin/catalog/products")({
  head: () => ({
    meta: [
      { title: "Produtos — StoreMesh" },
      { name: "description", content: "Produtos cadastrados na loja selecionada." },
      { property: "og:title", content: "Produtos — StoreMesh" },
      { property: "og:description", content: "Produtos cadastrados na loja selecionada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsRoute,
});

function ProductsRoute() {
  const { storeSlug, requiresStoreSelection } = useAdminStore();

  return (
    <CatalogPanel
      section="products"
      storeSlug={storeSlug}
      requiresStoreSelection={requiresStoreSelection}
    />
  );
}
