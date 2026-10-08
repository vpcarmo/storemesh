import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  getCurrentSession,
  getInviteSession,
  hasExpiredInviteCallback,
  requestPasswordReset,
  updatePassword,
} from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthFlowLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md space-y-6 rounded-lg border border-border p-6 sm:p-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-primary">StoreMesh</p>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </header>
        {children}
      </section>
    </main>
  );
}

export function ForgotPasswordPanel() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    setPending(true);
    setFeedback(null);
    try {
      await requestPasswordReset(email);
      setFeedback(
        "Se existir uma conta para este e-mail, enviaremos instruções para redefinir a senha.",
      );
    } catch {
      setFeedback("Não foi possível processar a solicitação agora. Tente novamente mais tarde.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-2">
          <Label htmlFor="recovery-email">E-mail</Label>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar instruções"}
        </Button>
      </form>
      {feedback ? (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {feedback}
        </p>
      ) : null}
      <Link
        to="/login"
        className="block w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Voltar ao login
      </Link>
    </>
  );
}

export function SetPasswordPanel({ flow }: { flow: "invite" | "recovery" }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [inviteExpired] = useState(() => flow === "invite" && hasExpiredInviteCallback());
  const sessionQuery = useQuery({
    queryKey: ["auth", "callback-session"],
    queryFn: flow === "invite" ? getInviteSession : getCurrentSession,
    retry: false,
  });
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !sessionQuery.data) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirm-password") ?? "");
    if (password !== confirmation) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    setFeedback(null);
    setPasswordError(null);
    try {
      await updatePassword(password);
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      await navigate({ to: "/admin", replace: true });
    } catch {
      setFeedback(
        "Não foi possível atualizar a senha. Verifique os requisitos de senha e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  if (sessionQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Validando o link de acesso…</p>;
  }

  if (flow === "invite" && inviteExpired) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive" role="alert">
          Este convite é inválido ou expirou. Solicite um novo convite ao Super Admin.
        </p>
        <Link
          to="/login"
          className="block w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    if (flow === "invite") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" role="status">
            Não foi possível concluir a ativação nesta sessão. Se sua conta já foi confirmada, use
            “Esqueci minha senha” para definir ou redefinir sua senha e depois entre normalmente.
          </p>
          <Link
            to="/forgot-password"
            className="block w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
          <Link
            to="/login"
            className="block w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Voltar ao login
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive" role="alert">
          Este link de recuperação é inválido ou expirou. Solicite uma nova recuperação de senha.
        </p>
        <Link
          to="/login"
          className="block w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor="new-password">Nova senha</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirmar senha</Label>
        <Input
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? "password-error" : undefined}
        />
      </div>
      {passwordError ? (
        <p id="password-error" className="text-sm text-destructive" role="alert">
          {passwordError}
        </p>
      ) : null}
      {feedback ? (
        <p className="text-sm text-destructive" role="alert">
          {feedback}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : flow === "invite" ? "Ativar minha conta" : "Redefinir senha"}
      </Button>
    </form>
  );
}
