import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

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
  component: ContentRoute,
});

function ContentRoute() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-semibold">Conteúdo</h1>
        <Button asChild variant="outline">
          <Link to="/admin/content/media">Mídia</Link>
        </Button>
      </div>
      <Outlet />
    </>
  );
}
