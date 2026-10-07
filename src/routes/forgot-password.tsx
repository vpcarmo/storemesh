import { createFileRoute } from "@tanstack/react-router";

import { AuthFlowLayout, ForgotPasswordPanel } from "@/components/auth-flows";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Recuperar senha — StoreMesh" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <AuthFlowLayout
      title="Esqueci minha senha"
      description="Informe o e-mail associado à sua conta. Se existir uma conta, enviaremos instruções para redefinir a senha."
    >
      <ForgotPasswordPanel />
    </AuthFlowLayout>
  );
}
