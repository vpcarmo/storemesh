import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";

import { signIn } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const sessionQueryKey = ["auth", "user"] as const;

export function AuthSessionPanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);
    setFeedback(null);

    try {
      await signIn(email, password);
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await navigate({ to: "/admin" });
    } catch {
      setFeedback("Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-xl border-t border-border pt-6" aria-label="Acesso à conta">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Link
          to="/forgot-password"
          className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
        <Button className="w-fit" type="submit" disabled={pending}>
          <LogIn aria-hidden="true" />
          {pending ? "Aguarde…" : "Entrar"}
        </Button>
      </form>
      {feedback ? <p className="mt-4 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
