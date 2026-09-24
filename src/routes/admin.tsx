import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AdminLayout } from "@/components/admin/admin-layout";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administração — StoreMesh" },
      { name: "description", content: "Área administrativa das lojas StoreMesh." },
      { property: "og:title", content: "Administração — StoreMesh" },
      { property: "og:description", content: "Área administrativa das lojas StoreMesh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
