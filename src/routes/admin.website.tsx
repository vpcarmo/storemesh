import { createFileRoute } from "@tanstack/react-router";

import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const Route = createFileRoute("/admin/website")({
  head: () => ({
    meta: [
      { title: "Website — StoreMesh" },
      { name: "description", content: "Área de website da loja, em preparação." },
      { property: "og:title", content: "Website — StoreMesh" },
      { property: "og:description", content: "Área de website da loja, em preparação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminPlaceholder
      title="Website"
      description="Espaço reservado para a administração das páginas e da navegação da loja."
      items={["Páginas", "Navegação"]}
    />
  ),
});
