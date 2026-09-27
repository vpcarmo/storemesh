import { createFileRoute } from "@tanstack/react-router";

import { useAdminStore } from "@/components/admin/admin-store-context";
import { StorefrontPreviewPanel } from "@/components/storefront-preview-panel";

export const Route = createFileRoute("/admin/preview")({
  head: () => ({
    meta: [
      { title: "Preview — StoreMesh" },
      { name: "description", content: "Prévia da loja selecionada." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreviewRoute,
});

function PreviewRoute() {
  const { storeSlug, requiresStoreSelection } = useAdminStore();

  return (
    <StorefrontPreviewPanel storeSlug={storeSlug} requiresStoreSelection={requiresStoreSelection} />
  );
}
