import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";

import {
  createPermissionProfile,
  deletePermissionProfile,
  getPermissionProfiles,
  updatePermissionProfile,
} from "@/auth/permission-profiles.functions";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  effectiveProfilePermission,
  PERMISSION_AREAS,
  PERMISSION_LABELS,
  PERMISSION_PROFILE_QUERY_KEY,
  permissionProfileAreas,
  type PermissionProfile,
} from "@/domain/permission-profiles";
import type { Permission } from "@/domain/access";

const usersQueryKey = ["platform", "users"] as const;

interface ProfileForm {
  name: string;
  permissions: Permission[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export function PermissionProfilesPanel() {
  const queryClient = useQueryClient();
  const loadProfiles = useServerFn(getPermissionProfiles);
  const createProfile = useServerFn(createPermissionProfile);
  const saveProfile = useServerFn(updatePermissionProfile);
  const removeProfile = useServerFn(deletePermissionProfile);
  const profilesQuery = useQuery({
    queryKey: PERMISSION_PROFILE_QUERY_KEY,
    queryFn: () => loadProfiles(),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PermissionProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({ name: "", permissions: [] });
  const [formPending, setFormPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<PermissionProfile | null>(null);
  const [deletionPending, setDeletionPending] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  function openCreateForm() {
    setEditingProfile(null);
    setForm({ name: "", permissions: [] });
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(profile: PermissionProfile) {
    setEditingProfile(profile);
    setForm({ name: profile.name, permissions: [...profile.permissions] });
    setFormError(null);
    setFormOpen(true);
  }

  function setPermission(permission: Permission, checked: boolean) {
    setForm((current) => ({
      ...current,
      permissions: checked
        ? [...new Set([...current.permissions, permission])]
        : current.permissions.filter((value) => value !== permission),
    }));
  }

  async function refreshProfilesAndUsers() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PERMISSION_PROFILE_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: usersQueryKey }),
    ]);
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formPending) return;
    setFormPending(true);
    setFormError(null);
    setFeedback(null);
    try {
      if (editingProfile) {
        await saveProfile({
          data: {
            id: editingProfile.id,
            name: form.name.trim(),
            permissions: form.permissions,
          },
        });
        setFeedback("Perfil atualizado.");
      } else {
        await createProfile({
          data: { name: form.name.trim(), permissions: form.permissions },
        });
        setFeedback("Perfil criado.");
      }
      await refreshProfilesAndUsers();
      setFormOpen(false);
      setEditingProfile(null);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setFormPending(false);
    }
  }

  async function confirmProfileDeletion() {
    if (!deletionTarget || deletionPending) return;
    setDeletionPending(true);
    setDeletionError(null);
    try {
      await removeProfile({ data: { profileId: deletionTarget.id } });
      setDeletionTarget(null);
      setFeedback("Perfil excluído.");
      await refreshProfilesAndUsers();
    } catch (error) {
      setDeletionError(errorMessage(error));
    } finally {
      setDeletionPending(false);
    }
  }

  if (profilesQuery.isPending) {
    return (
      <section className="space-y-4" aria-labelledby="permission-profiles-heading">
        <h2 id="permission-profiles-heading" className="text-lg font-semibold">
          Perfis de acesso
        </h2>
        <p className="text-sm text-muted-foreground">Carregando perfis de acesso…</p>
      </section>
    );
  }

  if (profilesQuery.isError) {
    return (
      <section className="space-y-4" aria-labelledby="permission-profiles-heading">
        <h2 id="permission-profiles-heading" className="text-lg font-semibold">
          Perfis de acesso
        </h2>
        <p className="text-sm text-destructive" role="alert">
          {errorMessage(profilesQuery.error)}
        </p>
      </section>
    );
  }

  return (
    <section
      className="space-y-4 border-t border-border pt-5"
      aria-labelledby="permission-profiles-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="permission-profiles-heading" className="text-lg font-semibold">
            Perfis de acesso
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina capacidades por perfil. Lojas atribuídas continuam sendo o escopo independente de
            cada Store Admin.
          </p>
        </div>
        <Button type="button" onClick={openCreateForm}>
          Criar perfil
        </Button>
      </div>

      {feedback ? (
        <p className="text-sm text-muted-foreground" role="status">
          {feedback}
        </p>
      ) : null}

      {profilesQuery.data.length === 0 ? (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Nenhum perfil de acesso foi criado.</p>
          <Button type="button" variant="outline" className="mt-3" onClick={openCreateForm}>
            Criar perfil
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {profilesQuery.data.map((profile) => {
            const areas = permissionProfileAreas(profile.permissions);
            return (
              <article key={profile.id} className="space-y-3 rounded-lg border border-border p-4">
                <div>
                  <h3 className="font-medium">{profile.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {areas.length
                      ? areas.join(" · ")
                      : "Este perfil não concede permissões de módulo."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.userCount} {profile.userCount === 1 ? "usuário" : "usuários"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditForm(profile)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={profile.userCount > 0}
                    title={
                      profile.userCount > 0
                        ? "Atribua os usuários a outro perfil antes de excluí-lo."
                        : undefined
                    }
                    onClick={() => {
                      setDeletionError(null);
                      setDeletionTarget(profile);
                    }}
                  >
                    Excluir
                  </Button>
                </div>
                {profile.userCount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Reassocie os usuários antes de excluir este perfil.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!formPending) {
            setFormOpen(open);
            if (!open) setFormError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Editar perfil" : "Criar perfil"}</DialogTitle>
            <DialogDescription>
              Selecione as permissões de módulo que os usuários deste perfil receberão.
            </DialogDescription>
          </DialogHeader>
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <form onSubmit={submitProfile} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="permission-profile-name">Nome do perfil</Label>
              <Input
                id="permission-profile-name"
                value={form.name}
                maxLength={120}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>
            <fieldset className="space-y-4" aria-describedby="permission-profile-help">
              <legend className="text-sm font-medium">Permissões</legend>
              <p id="permission-profile-help" className="text-sm text-muted-foreground">
                Gerenciar também concede Visualizar automaticamente.
              </p>
              {PERMISSION_AREAS.map((area) => (
                <fieldset key={area.view} className="space-y-2 rounded-md border border-border p-3">
                  <legend className="px-1 text-sm font-medium">{area.label}</legend>
                  {[area.view, area.manage].map((permission) => {
                    const viewImplied =
                      permission === area.view && form.permissions.includes(area.manage);
                    return (
                      <label key={permission} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={effectiveProfilePermission(form.permissions, permission)}
                          disabled={viewImplied || formPending}
                          onCheckedChange={(checked) => setPermission(permission, checked === true)}
                        />
                        <span>
                          {PERMISSION_LABELS[permission]}
                          {viewImplied ? (
                            <span className="ml-1 text-muted-foreground">
                              (incluído por Gerenciar)
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
            </fieldset>
            {form.permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground" role="status">
                Este perfil não concede permissões de módulo.
              </p>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={formPending}
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={formPending || !form.name.trim()}>
                {formPending ? "Salvando…" : editingProfile ? "Salvar alterações" : "Salvar perfil"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletionTarget)}
        onOpenChange={(open) => {
          if (!open && !deletionPending) {
            setDeletionTarget(null);
            setDeletionError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Usuários que utilizam este perfil precisam ser atribuídos a outro perfil antes da
              exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletionTarget ? (
            <p className="break-words text-sm">
              <span className="font-medium">Perfil:</span> {deletionTarget.name}
            </p>
          ) : null}
          {deletionError ? (
            <p className="text-sm text-destructive" role="alert">
              {deletionError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletionPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
              disabled={deletionPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmProfileDeletion();
              }}
            >
              {deletionPending ? "Excluindo…" : "Excluir perfil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
