import { createFileRoute } from "@tanstack/react-router";

import { PlatformStoresPanel } from "@/components/platform-stores-panel";

export const Route = createFileRoute("/admin/stores")({
  head: () => ({
    meta: [
      { title: "Lojas — StoreMesh" },
      { name: "description", content: "Gestão de lojas da plataforma StoreMesh." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlatformStoresPanel,
});
