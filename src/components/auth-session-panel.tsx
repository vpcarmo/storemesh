import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { signIn, signUp } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const sessionQueryKey = ["auth", "user"] as const;

type AuthMode = "sign-in" | "sign-up";

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a solicitação.";
}

export function AuthSessionPanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("sign-in");
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
      if (mode === "sign-up") {
        const hasSession = await signUp(email, password);
        if (!hasSession) {
          setFeedback("Conta criada. Confirme seu e-mail antes de entrar.");
          return;
        }
      } else {
        await signIn(email, password);
      }

      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await navigate({ to: "/admin" });
    } catch (error) {
      setFeedback(messageFrom(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-xl border-t border-border pt-6" aria-label="Acesso à conta">
      <div className="mb-5 flex gap-2" role="group" aria-label="Modo de acesso">
        <Button
          type="button"
          size="sm"
          variant={mode === "sign-in" ? "default" : "outline"}
          onClick={() => {
            setMode("sign-in");
            setFeedback(null);
          }}
        >
          Entrar
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "sign-up" ? "default" : "outline"}
          onClick={() => {
            setMode("sign-up");
            setFeedback(null);
          }}
        >
          Criar conta
        </Button>
      </div>

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
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </div>
        <Button className="w-fit" type="submit" disabled={pending}>
          {mode === "sign-in" ? <LogIn aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
          {pending ? "Aguarde…" : mode === "sign-in" ? "Entrar" : "Criar conta"}
        </Button>
      </form>
      {feedback ? <p className="mt-4 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
