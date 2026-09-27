import { createFileRoute } from "@tanstack/react-router";
import { useAdminStore } from "@/components/admin/admin-store-context";
import { WebsitePanel } from "@/components/website-panel";
export const Route = createFileRoute("/admin/website/pages")({ component: PagesRoute });
function PagesRoute() {
  const { storeSlug, requiresStoreSelection } = useAdminStore();
  return (
    <WebsitePanel
      section="pages"
      storeSlug={storeSlug}
      requiresStoreSelection={requiresStoreSelection}
    />
  );
}
