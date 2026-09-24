import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/catalog")({
  component: () => <Outlet />,
});
