import { createFileRoute } from "@tanstack/react-router";

import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const Route = createFileRoute("/admin/commerce")({
  head: () => ({
    meta: [
      { title: "Comércio — StoreMesh" },
      { name: "description", content: "Área de comércio da loja, em preparação." },
      { property: "og:title", content: "Comércio — StoreMesh" },
      { property: "og:description", content: "Área de comércio da loja, em preparação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminPlaceholder
      title="Comércio"
      description="Espaço reservado para as funcionalidades comerciais da loja."
    />
  ),
});
