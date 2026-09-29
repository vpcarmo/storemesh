import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/content/media")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/admin/content/media"!</div>;
}
