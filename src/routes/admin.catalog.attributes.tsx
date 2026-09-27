import { createFileRoute } from "@tanstack/react-router";

import { useAdminStore } from "@/components/admin/admin-store-context";
import { CatalogPanel } from "@/components/catalog-panel";

export const Route = createFileRoute("/admin/catalog/attributes")({
  head: () => ({
    meta: [
      { title: "Atributos — StoreMesh" },
      { name: "description", content: "Atributos do catálogo da loja selecionada." },
      { property: "og:title", content: "Atributos — StoreMesh" },
      { property: "og:description", content: "Atributos do catálogo da loja selecionada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttributesRoute,
});

function AttributesRoute() {
  const { storeSlug, requiresStoreSelection } = useAdminStore();

  return (
    <CatalogPanel
      section="attributes"
      storeSlug={storeSlug}
      requiresStoreSelection={requiresStoreSelection}
      storeSelectionManagedExternally
    />
  );
}
