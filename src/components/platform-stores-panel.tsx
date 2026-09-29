import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { getPlatformStores, savePlatformStore } from "@/auth/platform-stores.functions";
import { FormHelp } from "@/components/admin/form-help";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StoreStatus } from "@/domain/access";
import type { PlatformStore } from "@/data/platform-stores.repository";

const platformStoresQueryKey = ["platform", "stores"] as const;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface StoreForm {
  id: string | null;
  name: string;
  slug: string;
  status: StoreStatus;
  storeAdminUserIds: string[];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar a loja.";
}

function storeDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(date));
}

export function PlatformStoresPanel() {
  const queryClient = useQueryClient();
  const loadStores = useServerFn(getPlatformStores);
  const saveStore = useServerFn(savePlatformStore);
  const [form, setForm] = useState<StoreForm | null>(null);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const query = useQuery({ queryKey: platformStoresQueryKey, queryFn: () => loadStores() });

  function startCreate() {
    setFeedback(null);
    setSearch("");
    setForm({ id: null, name: "", slug: "", status: "active", storeAdminUserIds: [] });
  }

  function startEdit(store: PlatformStore) {
    setFeedback(null);
    setSearch("");
    setForm({
      id: store.id,
      name: store.name,
      slug: store.slug,
      status: store.status,
      storeAdminUserIds: store.administrators.map((administrator) => administrator.userId),
    });
  }

  function updateForm<Key extends keyof StoreForm>(key: Key, value: StoreForm[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || pending) return;

    const slug = form.slug.trim();
    if (!slugPattern.test(slug)) {
      setFeedback("Use letras minúsculas, números e hífens, sem espaços, para o slug.");
      return;
    }

    if (query.data?.stores.some((store) => store.slug === slug && store.id !== form.id)) {
      setFeedback("Este slug já está sendo usado por outra loja.");
      return;
    }

    setPending(true);
    setFeedback(null);
    try {
      await saveStore({
        data: {
          id: form.id,
          name: form.name.trim(),
          slug,
          status: form.status,
          storeAdminUserIds: form.storeAdminUserIds,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: platformStoresQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["auth", "authorized-stores"] }),
      ]);
      setForm(null);
      setFeedback(form.id ? "Loja atualizada." : "Loja criada.");
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  const currentStore = form?.id ? query.data?.stores.find((store) => store.id === form.id) : null;
  const currentAdminIds = new Set(currentStore?.administrators.map((admin) => admin.userId) ?? []);
  const userChoices = new Map(
    (query.data?.users ?? [])
      .filter((user) => !user.isSuperAdmin || currentAdminIds.has(user.id))
      .map((user) => [user.id, user]),
  );
  for (const administrator of currentStore?.administrators ?? []) {
    if (!userChoices.has(administrator.userId)) {
      userChoices.set(administrator.userId, {
        id: administrator.userId,
        fullName: administrator.fullName,
        isSuperAdmin: administrator.isSuperAdmin,
      });
    }
  }
  const filteredUsers = [...userChoices.values()].filter((user) => {
    const queryText = search.trim().toLocaleLowerCase("pt-BR");
    const label = user.fullName ?? user.id;
    return (
      !queryText ||
      label.toLocaleLowerCase("pt-BR").includes(queryText) ||
      user.id.includes(queryText)
    );
  });

  if (query.isPending) {
    return <p className="text-sm text-muted-foreground">Carregando lojas da plataforma…</p>;
  }

  if (query.isError) {
    return <p className="text-sm text-destructive">{errorMessage(query.error)}</p>;
  }

  return (
    <section className="space-y-5" aria-label="Gestão de lojas da plataforma">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lojas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro e administração dos tenants.
          </p>
        </div>
        <Button type="button" onClick={startCreate} disabled={pending}>
          <Plus aria-hidden="true" />
          Nova loja
        </Button>
      </div>

      {feedback ? (
        <p className="text-sm text-muted-foreground" role="status">
          {feedback}
        </p>
      ) : null}

      {form ? (
        <form onSubmit={submitForm} className="grid gap-4 border-y border-border py-5">
          <div>
            <h2 className="font-semibold">{form.id ? "Editar loja" : "Nova loja"}</h2>
            <FormHelp variant="callout">
              Crie uma nova loja para adicionar um novo tenant à plataforma. Depois, atribua um
              administrador responsável por ela.
            </FormHelp>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="platform-store-name">Nome administrativo</Label>
            <Input
              id="platform-store-name"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              required
            />
            <FormHelp>
              Nome administrativo da loja. Nome usado para identificar esta loja dentro da
              plataforma. Não é o nome de exibição, configurado separadamente nas configurações da
              loja.
            </FormHelp>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="platform-store-slug">Slug</Label>
            <Input
              id="platform-store-slug"
              value={form.slug}
              onChange={(event) => updateForm("slug", event.target.value)}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              aria-describedby="platform-store-slug-help"
              required
            />
            <div id="platform-store-slug-help">
              <FormHelp>
                Identificador da loja usado nas URLs e na resolução do tenant. Deve seguir as regras
                existentes, ser único e não conter espaços. Exemplo: minha-loja. A regra do banco
                não é alterada.
              </FormHelp>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="platform-store-status">Status</Label>
            <select
              id="platform-store-status"
              className="h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.status}
              onChange={(event) => updateForm("status", event.target.value as StoreStatus)}
            >
              <option value="active">Ativa</option>
              <option value="inactive">Inativa</option>
            </select>
            <FormHelp>
              Define se a loja está ativa para os fluxos administrativos que usam o status.
            </FormHelp>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="platform-store-admin-search">Administrador da loja</Label>
            <Input
              id="platform-store-admin-search"
              type="search"
              placeholder="Buscar perfil existente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <FormHelp>
              Usuário que administrará esta loja. Ele poderá acessar somente os recursos autorizados
              para esta loja.
            </FormHelp>
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-border p-3">
              {filteredUsers.length ? (
                filteredUsers.map((user) => {
                  const checked = form.storeAdminUserIds.includes(user.id);
                  const label = user.fullName ?? `Perfil ${user.id}`;
                  return (
                    <label key={user.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const selected = new Set(form.storeAdminUserIds);
                          if (value === true) selected.add(user.id);
                          else selected.delete(user.id);
                          updateForm("storeAdminUserIds", [...selected]);
                        }}
                      />
                      <span className="min-w-0 break-all">
                        {label}
                        {user.isSuperAdmin
                          ? " (vínculo atual; não pode ser atribuído novamente)"
                          : ""}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  {query.data.users.some((user) => !user.isSuperAdmin)
                    ? "Nenhum perfil corresponde à busca."
                    : "Nenhum usuário elegível. A loja pode ser criada sem administrador."}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              <Save aria-hidden="true" />
              {pending ? "Salvando…" : "Salvar loja"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(null)}
              disabled={pending}
            >
              <X aria-hidden="true" />
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {query.data.stores.length ? (
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Nome administrativo</th>
                <th className="p-3 font-medium">Slug</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Criada em</th>
                <th className="p-3 font-medium">Administrador da loja</th>
                <th className="p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {query.data.stores.map((store) => (
                <tr key={store.id} className="border-t border-border">
                  <td className="p-3 font-medium">{store.name}</td>
                  <td className="p-3">{store.slug}</td>
                  <td className="p-3">{store.status === "active" ? "Ativa" : "Inativa"}</td>
                  <td className="p-3">{storeDate(store.created_at)}</td>
                  <td className="p-3">
                    {store.administrators.length
                      ? store.administrators
                          .map((administrator) => administrator.fullName ?? administrator.userId)
                          .join(", ")
                      : "Não atribuído"}
                  </td>
                  <td className="p-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(store)}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border-y border-border py-6 text-sm text-muted-foreground">
          Nenhuma loja cadastrada. Crie uma loja para iniciar a plataforma.
        </p>
      )}
    </section>
  );
}
