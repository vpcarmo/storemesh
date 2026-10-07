import { createFileRoute } from "@tanstack/react-router";

import { AuthFlowLayout, SetPasswordPanel } from "@/components/auth-flows";

export const Route = createFileRoute("/auth/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Redefinir senha — StoreMesh" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  return (
    <AuthFlowLayout
      title="Redefina sua senha"
      description="Escolha uma nova senha para sua conta StoreMesh."
    >
      <SetPasswordPanel flow="recovery" />
    </AuthFlowLayout>
  );
}
