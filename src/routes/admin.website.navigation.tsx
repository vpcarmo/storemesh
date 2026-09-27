import { createFileRoute } from "@tanstack/react-router";
import { useAdminStore } from "@/components/admin/admin-store-context";
import { WebsitePanel } from "@/components/website-panel";
export const Route = createFileRoute("/admin/website/navigation")({ component: NavigationRoute });
function NavigationRoute() {
  const { storeSlug, requiresStoreSelection } = useAdminStore();
  return (
    <WebsitePanel
      section="navigation"
      storeSlug={storeSlug}
      requiresStoreSelection={requiresStoreSelection}
    />
  );
}
