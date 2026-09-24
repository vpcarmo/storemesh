import { createFileRoute } from "@tanstack/react-router";

import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const Route = createFileRoute("/admin/content")({
  head: () => ({
    meta: [
      { title: "Conteúdo — StoreMesh" },
      { name: "description", content: "Área de conteúdo da loja, em preparação." },
      { property: "og:title", content: "Conteúdo — StoreMesh" },
      { property: "og:description", content: "Área de conteúdo da loja, em preparação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminPlaceholder
      title="Conteúdo"
      description="Espaço reservado para a administração de mídia da loja."
      items={["Mídia"]}
    />
  ),
});
