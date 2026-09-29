import { createFileRoute } from "@tanstack/react-router";

import { MediaLibraryPanel } from "@/components/media-library-panel";

export const Route = createFileRoute("/admin/content/media")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MediaLibraryPanel />;
}
