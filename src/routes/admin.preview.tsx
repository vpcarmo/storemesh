import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { useAdminStore } from "@/components/admin/admin-store-context";
import { StorefrontPreviewPanel } from "@/components/storefront-preview-panel";

export const Route = createFileRoute("/admin/preview")({
  validateSearch: z.object({ page: z.string().optional() }),
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
  const { page } = Route.useSearch();

  return (
    <StorefrontPreviewPanel
      storeSlug={storeSlug}
      {...(page === undefined ? {} : { pageSlug: page })}
      requiresStoreSelection={requiresStoreSelection}
    />
  );
}
