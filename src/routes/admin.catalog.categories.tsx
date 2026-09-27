import { createFileRoute } from "@tanstack/react-router";

import { useAdminStore } from "@/components/admin/admin-store-context";
import { CatalogPanel } from "@/components/catalog-panel";

export const Route = createFileRoute("/admin/catalog/categories")({
  head: () => ({
    meta: [
      { title: "Categorias — StoreMesh" },
      { name: "description", content: "Categorias cadastradas na loja selecionada." },
      { property: "og:title", content: "Categorias — StoreMesh" },
      { property: "og:description", content: "Categorias cadastradas na loja selecionada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriesRoute,
});

function CategoriesRoute() {
  const { storeSlug, requiresStoreSelection } = useAdminStore();

  return (
    <CatalogPanel
      section="categories"
      storeSlug={storeSlug}
      requiresStoreSelection={requiresStoreSelection}
      storeSelectionManagedExternally
    />
  );
}
