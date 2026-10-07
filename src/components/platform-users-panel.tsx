import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";

import {
  getPlatformUsers,
  invitePlatformUserByEmail,
  resendPlatformUserInviteLink,
  revokePlatformUser,
  savePlatformUser,
} from "@/auth/platform-users.functions";
import { getPlatformStores } from "@/auth/platform-stores.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlatformManagedUser } from "@/data/platform-stores.repository";

const usersQueryKey = ["platform", "users"] as const;
const storesQueryKey = ["platform", "stores"] as const;
type InviteRole = "super_admin" | "store_admin";

interface UserEditor {
  fullName: string;
  isSuperAdmin: boolean;
  storeIds: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function accessLabel(status: PlatformManagedUser["status"]): string {
  if (status === "active") return "Acesso ativo";
  if (status === "invited") return "Convite pendente";
  return "Sem acesso";
}

function rolesLabel(user: PlatformManagedUser): string {
  const roles = [];
  if (user.isSuperAdmin) roles.push("Super Admin");
  if (user.storeIds.length > 0) roles.push("Store Admin");
  return roles.length ? roles.join(", ") : "Sem papel";
}

export function PlatformUsersPanel() {
  const queryClient = useQueryClient();
  const loadUsers = useServerFn(getPlatformUsers);
  const loadStores = useServerFn(getPlatformStores);
  const invite = useServerFn(invitePlatformUserByEmail);
  const resendInvite = useServerFn(resendPlatformUserInviteLink);
  const saveUser = useServerFn(savePlatformUser);
  const revoke = useServerFn(revokePlatformUser);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("store_admin");
  const [inviteStoreIds, setInviteStoreIds] = useState<string[]>([]);
  const [invitePending, setInvitePending] = useState(false);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PlatformManagedUser | null>(null);
  const [editor, setEditor] = useState<UserEditor | null>(null);

  const usersQuery = useQuery({ queryKey: usersQueryKey, queryFn: () => loadUsers() });
  const storesQuery = useQuery({ queryKey: storesQueryKey, queryFn: () => loadStores() });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: usersQueryKey }),
      queryClient.invalidateQueries({ queryKey: storesQueryKey }),
    ]);
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invitePending) return;
    if (inviteRole === "store_admin" && inviteStoreIds.length === 0) {
      setFeedback("Selecione pelo menos uma loja para Store Admin.");
      return;
    }
    setInvitePending(true);
    setFeedback(null);
    try {
      await invite({
        data: {
          email: email.trim(),
          role: inviteRole,
          storeIds: inviteRole === "store_admin" ? inviteStoreIds : [],
        },
      });
      setEmail("");
      setInviteStoreIds([]);
      setFeedback(
        "Convite aceito pelo Supabase Auth e acesso provisionado. A entrega do e-mail depende da configuração do provedor.",
      );
      await refresh();
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setInvitePending(false);
    }
  }

  async function resendPendingInvite(user: PlatformManagedUser) {
    if (user.status !== "invited" || resendingUserId) return;
    setResendingUserId(user.id);
    setFeedback(null);
    let succeeded = false;
    try {
      await resendInvite({ data: { userId: user.id } });
      succeeded = true;
      setFeedback("Novo convite aceito pelo Supabase Auth.");
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      try {
        await queryClient.invalidateQueries({ queryKey: usersQueryKey });
      } catch {
        setFeedback(
          (current) =>
            current ??
            (succeeded
              ? "Convite reenviado, mas não foi possível atualizar a lista. Atualize a página."
              : "Não foi possível atualizar a lista. Atualize a página."),
        );
      }
      setResendingUserId(null);
    }
  }

  function openEditor(user: PlatformManagedUser) {
    setSelectedUser(user);
    setEditor({
      fullName: user.fullName ?? "",
      isSuperAdmin: user.isSuperAdmin,
      storeIds: [...user.storeIds],
    });
    setFeedback(null);
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || !editor || pending) return;
    setPending(true);
    setFeedback(null);
    try {
      await saveUser({
        data: {
          userId: selectedUser.id,
          fullName: editor.fullName.trim(),
          isSuperAdmin: editor.isSuperAdmin,
          storeIds: editor.storeIds,
        },
      });
      await refresh();
      setSelectedUser(null);
      setEditor(null);
      setFeedback("Usuário atualizado.");
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function revokeAccess() {
    if (!selectedUser || pending) return;
    const confirmed = window.confirm(
      `Revogar todo o acesso administrativo de ${selectedUser.email ?? "este usuário"}? O usuário e seu histórico serão mantidos.`,
    );
    if (!confirmed) return;

    setPending(true);
    setFeedback(null);
    try {
      await revoke({ data: { userId: selectedUser.id } });
      await refresh();
      setSelectedUser(null);
      setEditor(null);
      setFeedback("Acesso administrativo revogado. O usuário e o perfil foram mantidos.");
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (usersQuery.isPending || storesQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Carregando usuários da plataforma…</p>;
  }
  if (usersQuery.isError) {
    return <p className="text-sm text-destructive">{errorMessage(usersQuery.error)}</p>;
  }
  if (storesQuery.isError) {
    return <p className="text-sm text-destructive">{errorMessage(storesQuery.error)}</p>;
  }

  const stores = storesQuery.data.stores;

  return (
    <section className="space-y-5" aria-label="Gestão de usuários da plataforma">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Convide usuários e gerencie seus papéis e associações com lojas.
          </p>
        </div>
        <Link
          to="/admin/stores"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Gerenciar lojas
        </Link>
      </div>

      <form
        onSubmit={submitInvite}
        className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2"
      >
        <div className="grid gap-2">
          <Label htmlFor="platform-user-invite-email">Novo usuário — e-mail</Label>
          <Input
            id="platform-user-invite-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome@exemplo.com"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="platform-user-invite-role">Papel</Label>
          <Select
            value={inviteRole}
            onValueChange={(value: InviteRole) => {
              setInviteRole(value);
              if (value === "super_admin") setInviteStoreIds([]);
            }}
          >
            <SelectTrigger id="platform-user-invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="store_admin">Store Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {inviteRole === "store_admin" ? (
          <fieldset className="space-y-2 md:col-span-2">
            <legend className="text-sm font-medium">Lojas</legend>
            {stores.map((store) => (
              <label key={store.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={inviteStoreIds.includes(store.id)}
                  onCheckedChange={(checked) =>
                    setInviteStoreIds((current) =>
                      checked
                        ? [...new Set([...current, store.id])]
                        : current.filter((storeId) => storeId !== store.id),
                    )
                  }
                />
                <span>
                  {store.name} <span className="text-muted-foreground">({store.slug})</span>
                  {store.status === "inactive" ? " — inativa" : ""}
                </span>
              </label>
            ))}
            {stores.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma loja cadastrada.{" "}
                <Link to="/admin/stores" className="underline">
                  Criar loja
                </Link>
              </p>
            ) : null}
          </fieldset>
        ) : (
          <p className="text-sm text-muted-foreground md:col-span-2">
            Super Admin recebe acesso global e não pode ser associado a lojas.
          </p>
        )}
        <div className="md:col-span-2">
          <Button type="submit" disabled={invitePending}>
            {invitePending ? "Enviando convite…" : "Enviar convite"}
          </Button>
        </div>
      </form>

      {feedback ? (
        <p className="text-sm text-muted-foreground" role="status">
          {feedback}
        </p>
      ) : null}

      {usersQuery.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário foi encontrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Lojas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQuery.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName || "—"}</TableCell>
                <TableCell>{user.email || "—"}</TableCell>
                <TableCell>{rolesLabel(user)}</TableCell>
                <TableCell>
                  {user.stores.length ? user.stores.map((store) => store.name).join(", ") : "—"}
                </TableCell>
                <TableCell>{accessLabel(user.status)}</TableCell>
                <TableCell>
                  {user.status === "invited" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resendingUserId !== null}
                      onClick={() => void resendPendingInvite(user)}
                    >
                      {resendingUserId === user.id ? "Reenviando…" : "Reenviar convite"}
                    </Button>
                  ) : null}{" "}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(user)}
                  >
                    Gerenciar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setSelectedUser(null);
            setEditor(null);
          }
        }}
      >
        {selectedUser && editor ? (
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar usuário</DialogTitle>
              <DialogDescription>
                Edite o nome e as atribuições administrativas. O e-mail é gerenciado pelo Supabase
                Auth e não pode ser alterado aqui.
              </DialogDescription>
            </DialogHeader>

            {feedback ? (
              <p className="text-sm text-destructive" role="alert">
                {feedback}
              </p>
            ) : null}

            <form onSubmit={submitEditor} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="managed-user-name">Nome</Label>
                <Input
                  id="managed-user-name"
                  value={editor.fullName}
                  maxLength={120}
                  onChange={(event) =>
                    setEditor((current) =>
                      current ? { ...current, fullName: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="grid gap-1 text-sm">
                <span className="font-medium">E-mail</span>
                <span className="break-all text-muted-foreground">{selectedUser.email || "—"}</span>
              </div>

              <fieldset className="space-y-3">
                <legend className="mb-2 text-sm font-medium">Papéis</legend>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editor.isSuperAdmin}
                    onCheckedChange={(checked) =>
                      setEditor((current) =>
                        current ? { ...current, isSuperAdmin: checked === true } : current,
                      )
                    }
                  />
                  Super Admin
                </label>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Lojas como Store Admin</p>
                  {stores.map((store) => (
                    <label key={store.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={editor.storeIds.includes(store.id)}
                        onCheckedChange={(checked) =>
                          setEditor((current) => {
                            if (!current) return current;
                            const storeIds = checked
                              ? [...new Set([...current.storeIds, store.id])]
                              : current.storeIds.filter((storeId) => storeId !== store.id);
                            return { ...current, storeIds };
                          })
                        }
                      />
                      <span>
                        {store.name} <span className="text-muted-foreground">({store.slug})</span>
                        {store.status === "inactive" ? " — inativa" : ""}
                      </span>
                    </label>
                  ))}
                  {stores.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma loja cadastrada.{" "}
                      <Link to="/admin/stores" className="underline">
                        Criar loja
                      </Link>
                    </p>
                  ) : null}
                </div>
              </fieldset>

              <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    pending || (!selectedUser.isSuperAdmin && selectedUser.storeIds.length === 0)
                  }
                  onClick={revokeAccess}
                >
                  Revogar acesso
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setSelectedUser(null);
                      setEditor(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Salvando…" : "Salvar alterações"}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
