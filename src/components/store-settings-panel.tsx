import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import {
  getCurrentStoreSettings,
  updateCurrentStoreDisplayName,
} from "@/auth/store-settings.functions";
import { FormHelp } from "@/components/admin/form-help";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const settingsQueryKey = ["store", "current", "settings"] as const;

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível salvar a configuração.";
}

export function StoreSettingsPanel({ storeSlug }: { storeSlug?: string | null }) {
  const queryClient = useQueryClient();
  const loadSettings = useServerFn(getCurrentStoreSettings);
  const saveDisplayName = useServerFn(updateCurrentStoreDisplayName);
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const settingsQuery = useQuery({
    queryKey: [...settingsQueryKey, storeSlug],
    queryFn: () => loadSettings({ data: { slug: storeSlug } }),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setDisplayName(settingsQuery.data.settings?.displayName ?? "");
    }
  }, [settingsQuery.data]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);

    try {
      await saveDisplayName({ data: { displayName, slug: storeSlug } });
      await queryClient.invalidateQueries({ queryKey: settingsQueryKey });
      setFeedback("Configuração salva.");
    } catch (error) {
      setFeedback(messageFrom(error));
    } finally {
      setPending(false);
    }
  }

  if (settingsQuery.isPending) {
    return <p className="mt-6 text-sm text-muted-foreground">Carregando configurações…</p>;
  }

  if (settingsQuery.isError) {
    return <p className="mt-6 text-sm text-destructive">{messageFrom(settingsQuery.error)}</p>;
  }

  if (!settingsQuery.data.store) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Selecione uma loja autorizada para consultar suas configurações.
      </p>
    );
  }

  return (
    <section
      className="mt-6 w-full max-w-xl border-t border-border pt-6"
      aria-label="Configuração da loja"
    >
      <p className="text-sm font-semibold">Configuração da loja</p>
      <p className="mt-1 text-sm text-muted-foreground">{settingsQuery.data.store.name}</p>
      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="store-display-name">Nome de exibição</Label>
          <Input
            id="store-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={120}
            placeholder={settingsQuery.data.store.name}
          />
          <FormHelp tooltip="Nome público da loja; não muda seu cadastro administrativo.">
            Nome mostrado aos visitantes. Se ficar vazio, usaremos o nome cadastrado da loja.
          </FormHelp>
        </div>
        <Button className="w-fit" type="submit" disabled={pending}>
          <Save aria-hidden="true" />
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </form>
      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
