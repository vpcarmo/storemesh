import { createFileRoute } from "@tanstack/react-router";

import { AuthFlowLayout, SetPasswordPanel } from "@/components/auth-flows";

export const Route = createFileRoute("/auth/accept-invite")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Ativar conta — StoreMesh" }, { name: "robots", content: "noindex" }],
  }),
  component: AcceptInvite,
});

function AcceptInvite() {
  return (
    <AuthFlowLayout
      title="Crie sua senha"
      description="Defina uma senha para ativar sua conta administrativa StoreMesh."
    >
      <SetPasswordPanel flow="invite" />
    </AuthFlowLayout>
  );
}
