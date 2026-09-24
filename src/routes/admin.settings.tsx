import { createFileRoute } from "@tanstack/react-router";

import { useAdminStore } from "@/components/admin/admin-store-context";
import { StoreSettingsPanel } from "@/components/store-settings-panel";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — StoreMesh" },
      { name: "description", content: "Configurações da loja selecionada." },
      { property: "og:title", content: "Configurações — StoreMesh" },
      { property: "og:description", content: "Configurações da loja selecionada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { storeSlug } = useAdminStore();

  return <StoreSettingsPanel storeSlug={storeSlug} />;
}
