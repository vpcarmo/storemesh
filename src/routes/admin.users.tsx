import { createFileRoute } from "@tanstack/react-router";

import { PlatformUsersPanel } from "@/components/platform-users-panel";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Usuários — StoreMesh" },
      { name: "description", content: "Gestão de usuários da plataforma StoreMesh." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlatformUsersPanel,
});
