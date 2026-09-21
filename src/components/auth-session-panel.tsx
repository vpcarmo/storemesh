import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogIn, LogOut, ShieldCheck, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { getAccessContext } from "@/auth/access.functions";
import { getCurrentUser, signIn, signOut, signUp } from "@/auth/session";
import { CatalogPanel } from "@/components/catalog-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreSettingsPanel } from "@/components/store-settings-panel";

const sessionQueryKey = ["auth", "user"] as const;
const accessQueryKey = ["auth", "access-context"] as const;

type AuthMode = "sign-in" | "sign-up";

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a solicitação.";
}

export function AuthSessionPanel() {
  const queryClient = useQueryClient();
  const loadAccessContext = useServerFn(getAccessContext);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const userQuery = useQuery({ queryKey: sessionQueryKey, queryFn: getCurrentUser });
  const accessQuery = useQuery({
    queryKey: accessQueryKey,
    queryFn: () => loadAccessContext(),
    enabled: Boolean(userQuery.data),
  });

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
        setFeedback(
          hasSession
            ? "Conta criada e sessão iniciada."
            : "Conta criada. Confirme seu e-mail antes de entrar.",
        );
      } else {
        await signIn(email, password);
      }

      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await queryClient.invalidateQueries({ queryKey: accessQueryKey });
    } catch (error) {
      setFeedback(messageFrom(error));
    } finally {
      setPending(false);
    }
  }

  async function handleSignOut() {
    setPending(true);
    setFeedback(null);

    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await signOut();
      queryClient.setQueryData(sessionQueryKey, null);
    } catch (error) {
      setFeedback(messageFrom(error));
    } finally {
      setPending(false);
    }
  }

  if (userQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Verificando sessão…</p>;
  }

  if (userQuery.data) {
    const assignments = accessQuery.data?.assignments ?? [];

    return (
      <section className="w-full max-w-xl border-t border-border pt-6" aria-label="Sessão atual">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-status" aria-hidden="true" />
              Sessão autenticada
            </div>
            <p className="mt-2 break-all text-sm text-muted-foreground">{userQuery.data.email}</p>
            {accessQuery.isPending ? (
              <p className="mt-4 text-sm text-muted-foreground">Carregando permissões…</p>
            ) : accessQuery.isError ? (
              <p className="mt-4 text-sm text-destructive">{messageFrom(accessQuery.error)}</p>
            ) : assignments.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhum papel foi atribuído.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {assignments.map((assignment) => (
                  <li key={`${assignment.role}-${assignment.storeId ?? "global"}`}>
                    <span className="font-medium">
                      {assignment.role === "super_admin"
                        ? "Administrador da plataforma"
                        : "Administrador da loja"}
                    </span>
                    {assignment.store ? (
                      <span className="text-muted-foreground"> · {assignment.store.name}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button type="button" variant="outline" onClick={handleSignOut} disabled={pending}>
            <LogOut aria-hidden="true" />
            Sair
          </Button>
        </div>
        {feedback ? <p className="mt-4 text-sm text-muted-foreground">{feedback}</p> : null}
        {!accessQuery.isPending && !accessQuery.isError && assignments.length > 0 ? (
          <>
            <StoreSettingsPanel />
            <CatalogPanel />
          </>
        ) : null}
      </section>
    );
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
