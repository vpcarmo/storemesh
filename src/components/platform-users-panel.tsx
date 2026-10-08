import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";

import {
  deletePlatformUser,
  getPlatformUsers,
  invitePlatformUserByEmail,
  resendPlatformUserInviteLink,
  revokePlatformUser,
  savePlatformUser,
} from "@/auth/platform-users.functions";
import {
  assignPermissionProfileToUser,
  getPermissionProfiles,
} from "@/auth/permission-profiles.functions";
import { getPlatformStores } from "@/auth/platform-stores.functions";
import { getCurrentUser } from "@/auth/session";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { PermissionProfilesPanel } from "@/components/permission-profiles-panel";
import {
  PERMISSION_AREAS,
  PERMISSION_PROFILE_QUERY_KEY,
  effectiveProfilePermission,
  permissionProfileAreas,
} from "@/domain/permission-profiles";

const usersQueryKey = ["platform", "users"] as const;
const storesQueryKey = ["platform", "stores"] as const;
type InviteRole = "super_admin" | "store_admin";

interface UserEditor {
  fullName: string;
  isSuperAdmin: boolean;
  storeIds: string[];
  permissionProfileId: string | null;
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
  const loadPermissionProfiles = useServerFn(getPermissionProfiles);
  const removeUser = useServerFn(deletePlatformUser);
  const invite = useServerFn(invitePlatformUserByEmail);
  const resendInvite = useServerFn(resendPlatformUserInviteLink);
  const saveUser = useServerFn(savePlatformUser);
  const saveUserPermissionProfile = useServerFn(assignPermissionProfileToUser);
  const revoke = useServerFn(revokePlatformUser);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("store_admin");
  const [inviteStoreIds, setInviteStoreIds] = useState<string[]>([]);
  const [invitePermissionProfileId, setInvitePermissionProfileId] = useState<string>("legacy");
  const [invitePending, setInvitePending] = useState(false);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PlatformManagedUser | null>(null);
  const [editor, setEditor] = useState<UserEditor | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<PlatformManagedUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletionFeedback, setDeletionFeedback] = useState<string | null>(null);
  const deletionInFlight = useRef(false);

  const currentUserQuery = useQuery({ queryKey: ["auth", "user"], queryFn: getCurrentUser });
  const usersQuery = useQuery({ queryKey: usersQueryKey, queryFn: () => loadUsers() });
  const storesQuery = useQuery({ queryKey: storesQueryKey, queryFn: () => loadStores() });
  const permissionProfilesQuery = useQuery({
    queryKey: PERMISSION_PROFILE_QUERY_KEY,
    queryFn: () => loadPermissionProfiles(),
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: usersQueryKey }),
      queryClient.invalidateQueries({ queryKey: storesQueryKey }),
      queryClient.invalidateQueries({ queryKey: PERMISSION_PROFILE_QUERY_KEY }),
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
          permissionProfileId:
            inviteRole === "store_admin" && invitePermissionProfileId !== "legacy"
              ? invitePermissionProfileId
              : null,
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
      permissionProfileId: user.permissionProfile?.id ?? null,
    });
    setFeedback(null);
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || !editor || pending) return;
    setPending(true);
    setFeedback(null);
    let rolesSaved = false;
    try {
      await saveUser({
        data: {
          userId: selectedUser.id,
          fullName: editor.fullName.trim(),
          isSuperAdmin: editor.isSuperAdmin,
          storeIds: editor.storeIds,
        },
      });
      rolesSaved = true;
      await saveUserPermissionProfile({
        data: {
          userId: selectedUser.id,
          permissionProfileId:
            editor.isSuperAdmin || editor.storeIds.length === 0 ? null : editor.permissionProfileId,
        },
      });
      await refresh();
      setSelectedUser(null);
      setEditor(null);
      setFeedback("Usuário atualizado.");
    } catch (error) {
      if (rolesSaved) await refresh();
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
      setFeedback(
        "Acesso administrativo revogado. O usuário e seus dados pessoais foram mantidos.",
      );
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function confirmUserDeletion() {
    if (!deletionTarget || deletionInFlight.current) return;
    const target = deletionTarget;
    deletionInFlight.current = true;
    setDeletingUserId(target.id);
    setDeletionFeedback(null);
    try {
      await removeUser({ data: { userId: target.id } });
      setDeletionTarget(null);
      setFeedback("Usuário excluído.");
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: usersQueryKey }),
          queryClient.invalidateQueries({ queryKey: storesQueryKey }),
          queryClient.invalidateQueries({ queryKey: PERMISSION_PROFILE_QUERY_KEY }),
        ]);
      } catch {
        setFeedback("Usuário excluído, mas não foi possível atualizar a lista. Atualize a página.");
      }
    } catch (error) {
      setDeletionFeedback(errorMessage(error));
    } finally {
      deletionInFlight.current = false;
      setDeletingUserId(null);
    }
  }

  if (usersQuery.isPending || storesQuery.isPending || permissionProfilesQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Carregando usuários da plataforma…</p>;
  }
  if (usersQuery.isError) {
    return <p className="text-sm text-destructive">{errorMessage(usersQuery.error)}</p>;
  }
  if (storesQuery.isError) {
    return <p className="text-sm text-destructive">{errorMessage(storesQuery.error)}</p>;
  }
  if (permissionProfilesQuery.isError) {
    return (
      <p className="text-sm text-destructive">{errorMessage(permissionProfilesQuery.error)}</p>
    );
  }

  const stores = storesQuery.data.stores;
  const permissionProfiles = permissionProfilesQuery.data;
  const superAdminCount = usersQuery.data.filter((user) => user.isSuperAdmin).length;

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
          <>
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
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="platform-user-invite-profile">Perfil de acesso</Label>
              <Select
                value={invitePermissionProfileId}
                onValueChange={setInvitePermissionProfileId}
                disabled={invitePending}
              >
                <SelectTrigger id="platform-user-invite-profile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legacy">Sem perfil — acesso legado de Store Admin</SelectItem>
                  {permissionProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Lojas definem o escopo; o perfil define as capacidades. Sem perfil mantém o acesso
                legado.
              </p>
            </div>
          </>
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
                <TableCell>
                  <div>{rolesLabel(user)}</div>
                  {user.isSuperAdmin ? (
                    <div className="text-xs text-muted-foreground">Acesso global — Super Admin</div>
                  ) : user.storeIds.length > 0 ? (
                    <div className="text-xs text-muted-foreground">
                      {user.permissionProfile ? (
                        <>
                          Perfil de acesso: {user.permissionProfile.name}
                          {permissionProfileAreas(user.permissionProfile.permissions).length
                            ? ` — ${permissionProfileAreas(user.permissionProfile.permissions).join(" · ")}`
                            : " — sem permissões de módulo"}
                        </>
                      ) : (
                        "Sem perfil — acesso legado de Store Admin"
                      )}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {user.stores.length ? user.stores.map((store) => store.name).join(", ") : "—"}
                </TableCell>
                <TableCell>{accessLabel(user.status)}</TableCell>
                <TableCell>
                  {currentUserQuery.data &&
                  currentUserQuery.data.id !== user.id &&
                  (!user.isSuperAdmin || superAdminCount > 1) ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mr-2"
                      disabled={
                        pending ||
                        invitePending ||
                        resendingUserId !== null ||
                        deletingUserId !== null
                      }
                      onClick={() => {
                        setDeletionFeedback(null);
                        setDeletionTarget(user);
                      }}
                    >
                      Excluir usuário
                    </Button>
                  ) : null}
                  {user.status === "invited" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resendingUserId !== null || deletingUserId !== null}
                      onClick={() => void resendPendingInvite(user)}
                    >
                      {resendingUserId === user.id ? "Reenviando…" : "Reenviar convite"}
                    </Button>
                  ) : null}{" "}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deletingUserId !== null}
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
                      setEditor((current) => {
                        if (!current) return current;
                        const isSuperAdmin = checked === true;
                        return {
                          ...current,
                          isSuperAdmin,
                          permissionProfileId: isSuperAdmin ? null : current.permissionProfileId,
                        };
                      })
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

              {editor.isSuperAdmin ? (
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  Acesso global — Super Admin. Este usuário não depende de perfil de acesso.
                </p>
              ) : editor.storeIds.length > 0 ? (
                <section className="space-y-3 rounded-md border border-border p-3">
                  <div className="grid gap-2">
                    <Label htmlFor="managed-user-permission-profile">Perfil de acesso</Label>
                    <Select
                      value={editor.permissionProfileId ?? "legacy"}
                      onValueChange={(value) =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                permissionProfileId: value === "legacy" ? null : value,
                              }
                            : current,
                        )
                      }
                      disabled={pending}
                    >
                      <SelectTrigger id="managed-user-permission-profile">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="legacy">
                          Sem perfil — acesso legado de Store Admin
                        </SelectItem>
                        {permissionProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Lojas definem o escopo; o perfil define as capacidades.
                    </p>
                  </div>
                  <div aria-live="polite">
                    <h3 className="text-sm font-medium">Permissões efetivas</h3>
                    {editor.permissionProfileId ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {PERMISSION_AREAS.map((area) => {
                          const assignedProfile = permissionProfiles.find(
                            (profile) => profile.id === editor.permissionProfileId,
                          );
                          const permissions = assignedProfile?.permissions ?? [];
                          const canView = effectiveProfilePermission(permissions, area.view);
                          const canManage = effectiveProfilePermission(permissions, area.manage);
                          return (
                            <div
                              key={area.view}
                              className="rounded border border-border p-2 text-sm"
                            >
                              <p className="font-medium">{area.label}</p>
                              {canView || canManage ? (
                                <>
                                  <p>{canView ? "✓ Visualizar" : "— Visualizar"}</p>
                                  <p>{canManage ? "✓ Gerenciar" : "— Gerenciar"}</p>
                                </>
                              ) : (
                                <p className="text-muted-foreground">—</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sem perfil — acesso legado de Store Admin.
                      </p>
                    )}
                  </div>
                </section>
              ) : null}

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

      <AlertDialog
        open={Boolean(deletionTarget)}
        onOpenChange={(open) => {
          if (!open && deletingUserId === null) {
            setDeletionTarget(null);
            setDeletionFeedback(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação exclui permanentemente a conta e remove o acesso administrativo deste
              usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletionTarget ? (
            <div className="space-y-2 text-sm">
              <p className="break-all">
                <span className="font-medium">E-mail:</span> {deletionTarget.email || "—"}
              </p>
              <p className="text-muted-foreground">
                Lojas, produtos, páginas e demais conteúdos da plataforma não serão excluídos por
                esta ação.
              </p>
            </div>
          ) : null}
          {deletionFeedback ? (
            <p className="text-sm text-destructive" role="alert">
              {deletionFeedback}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUserId !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
              disabled={deletingUserId !== null}
              onClick={(event) => {
                event.preventDefault();
                void confirmUserDeletion();
              }}
            >
              {deletingUserId === deletionTarget?.id ? "Excluindo…" : "Excluir usuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PermissionProfilesPanel />
    </section>
  );
}
