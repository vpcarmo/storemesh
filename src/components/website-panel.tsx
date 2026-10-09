import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import {
  deleteCurrentStoreNavigationItem,
  getCurrentStoreWebsite,
  saveCurrentStoreNavigationItem,
  saveCurrentStorePage,
} from "@/auth/website.functions";
import {
  getCurrentStoreSettings,
  updateCurrentStoreFooterNavigation,
} from "@/auth/store-settings.functions";
import { useAdminStore } from "@/components/admin/admin-store-context";
import { AdminReadOnlyNotice } from "@/components/admin/admin-read-only-notice";
import { FooterPageGroup } from "@/components/admin/footer-page-group";
import { FormHelp } from "@/components/admin/form-help";
import { WebsiteSectionsEditor } from "@/components/website-sections-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NavigationItem, WebsitePage } from "@/domain/website";

const emptyPage: Pick<
  WebsitePage,
  "id" | "title" | "slug" | "status" | "seoTitle" | "seoDescription"
> = {
  id: null as unknown as string,
  title: "",
  slug: "",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
};
const emptyNav = { id: null, label: "", pageId: "", externalUrl: "", position: 0, isActive: true };
function message(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar.";
}
export function WebsitePanel({
  section,
  storeSlug,
  requiresStoreSelection,
}: {
  section: "pages" | "navigation";
  storeSlug: string | null;
  requiresStoreSelection: boolean;
}) {
  const { hasPermission } = useAdminStore();
  const canManage = hasPermission("website.manage");
  const canManageFooter = hasPermission("settings.manage");
  const load = useServerFn(getCurrentStoreWebsite);
  const loadSettings = useServerFn(getCurrentStoreSettings);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["website", storeSlug],
    queryFn: () => load({ data: { slug: storeSlug } }),
    enabled: !!storeSlug,
  });
  const settingsQuery = useQuery({
    queryKey: ["store", "current", "settings", storeSlug],
    queryFn: () => loadSettings({ data: { slug: storeSlug } }),
    enabled: section === "navigation" && Boolean(storeSlug),
  });
  const [page, setPage] = useState<(typeof emptyPage & { id: string | null }) | WebsitePage | null>(
    null,
  );
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [nav, setNav] = useState<typeof emptyNav | NavigationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savePage = useServerFn(saveCurrentStorePage);
  const saveNav = useServerFn(saveCurrentStoreNavigationItem);
  const removeNav = useServerFn(deleteCurrentStoreNavigationItem);
  const saveFooterNavigation = useServerFn(updateCurrentStoreFooterNavigation);
  const [footerGroups, setFooterGroups] = useState<{
    helpPages: string[];
    institutionalPages: string[];
  } | null>(null);
  const [footerError, setFooterError] = useState<string | null>(null);
  const [footerPending, setFooterPending] = useState(false);
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["website", storeSlug] }),
      client.invalidateQueries({ queryKey: ["admin-page-preview", storeSlug] }),
    ]);
  if (requiresStoreSelection && !storeSlug)
    return (
      <p className="text-sm text-muted-foreground">
        Selecione uma loja no cabeçalho administrativo.
      </p>
    );
  if (query.isPending) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (query.isError || !query.data)
    return <p className="text-sm text-destructive">{message(query.error)}</p>;
  const submitPage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!page || !canManage) return;
    setError(null);
    try {
      await savePage({
        data: {
          slug: storeSlug,
          id: page.id,
          title: page.title,
          pageSlug: page.slug,
          status: page.status,
          seoTitle: page.seoTitle || null,
          seoDescription: page.seoDescription || null,
        },
      });
      setPage(null);
      setPreviewSlug(null);
      await refresh();
    } catch (e) {
      setError(message(e));
    }
  };
  const submitNav = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nav || !canManage) return;
    setError(null);
    try {
      await saveNav({
        data: {
          slug: storeSlug,
          id: nav.id,
          label: nav.label,
          pageId: nav.pageId || null,
          externalUrl: nav.externalUrl || null,
          position: nav.position,
          isActive: nav.isActive,
        },
      });
      setNav(null);
      await refresh();
    } catch (e) {
      setError(message(e));
    }
  };
  const submitFooterNavigation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!footerGroups || !canManageFooter) return;
    setFooterError(null);
    setFooterPending(true);
    try {
      await saveFooterNavigation({ data: { slug: storeSlug, ...footerGroups } });
      setFooterGroups(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["store", "current", "settings", storeSlug] }),
        client.invalidateQueries({
          queryKey: ["store", "current", "storefront-foundation", storeSlug],
        }),
        client.invalidateQueries({ queryKey: ["admin-page-preview", storeSlug] }),
      ]);
    } catch (e) {
      setFooterError(message(e));
    } finally {
      setFooterPending(false);
    }
  };
  const savedFooter = settingsQuery.data?.settings?.designSettings.footer;
  const currentFooterGroups = footerGroups ?? {
    helpPages: savedFooter?.helpPages ?? [],
    institutionalPages: savedFooter?.institutionalPages ?? [],
  };
  return (
    <section className="space-y-5" aria-label={section === "pages" ? "Páginas" : "Navegação"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{section === "pages" ? "Páginas" : "Navegação"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {section === "pages"
              ? "Páginas e SEO básico da loja."
              : "Links exibidos na navegação pública."}
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              if (section === "pages") {
                setPage(emptyPage);
                setPreviewSlug(null);
              } else {
                setNav({ ...emptyNav, position: query.data.navigation.length });
              }
            }}
          >
            + {section === "pages" ? "Nova página" : "Novo item"}
          </Button>
        ) : null}
      </div>
      <AdminReadOnlyNotice permission="website.manage" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {section === "pages" ? (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Título</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {query.data.pages.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={4} className="p-3 text-muted-foreground">
                      <p>Nenhuma página cadastrada.</p>
                      <p>Clique em "Nova página" para criar a primeira.</p>
                    </td>
                  </tr>
                ) : (
                  query.data.pages.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3 font-medium">{item.title}</td>
                      <td>/{item.slug}</td>
                      <td>
                        {item.status === "published"
                          ? "Publicada"
                          : item.status === "draft"
                            ? "Rascunho"
                            : "Arquivada"}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPage(item);
                              setPreviewSlug(item.slug);
                            }}
                          >
                            {canManage ? "Editar" : "Visualizar"}
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link to="/admin/preview" search={{ page: item.slug }}>
                              Visualizar
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {page && (
            <form onSubmit={submitPage} className="grid gap-3 rounded-lg border p-4">
              <h2 className="font-medium">{page.id ? "Editar página" : "Nova página"}</h2>
              <FormHelp variant="callout">
                Os dados da página definem endereço, status e SEO. As seções definem o conteúdo
                visual.
              </FormHelp>
              <fieldset disabled={!canManage} className="contents">
                <Label>
                  Título
                  <Input
                    value={page.title}
                    onChange={(e) => setPage({ ...page, title: e.target.value })}
                    required
                  />
                  <FormHelp tooltip="Página é um conteúdo acessível por um endereço próprio.">
                    Nome principal da página.
                  </FormHelp>
                </Label>
                <Label>
                  Slug
                  <Input
                    value={page.slug}
                    onChange={(e) => setPage({ ...page, slug: e.target.value })}
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  />
                  <FormHelp tooltip="Slug é o nome técnico usado como identificador amigável no endereço.">
                    Parte amigável do endereço da página. Exemplo: sobre-nos
                  </FormHelp>
                </Label>
                <Label>
                  Status
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3"
                    value={page.status}
                    onChange={(e) =>
                      setPage({ ...page, status: e.target.value as WebsitePage["status"] })
                    }
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicada</option>
                    <option value="archived">Arquivada</option>
                  </select>
                  <FormHelp>
                    Rascunho: página em preparação. Publicada: página disponível publicamente.
                    Arquivada: página retirada do fluxo público. Apenas páginas publicadas ficam
                    disponíveis no endereço público.
                  </FormHelp>
                </Label>
                <Label>
                  SEO title
                  <Input
                    value={page.seoTitle ?? ""}
                    onChange={(e) => setPage({ ...page, seoTitle: e.target.value })}
                  />
                  <FormHelp>
                    Texto usado como título nos metadados da página. Se não for preenchido, o título
                    da página será usado como alternativa.
                  </FormHelp>
                </Label>
                <Label>
                  SEO description
                  <Textarea
                    value={page.seoDescription ?? ""}
                    onChange={(e) => setPage({ ...page, seoDescription: e.target.value })}
                  />
                  <FormHelp>
                    Descrição usada nos metadados da página. Não é um editor do conteúdo visual.
                  </FormHelp>
                </Label>
                <FormHelp>
                  Alterar os campos de SEO posteriormente não significa que um Hero já existente
                  será atualizado automaticamente.
                </FormHelp>
              </fieldset>
              {page.id && "sections" in page ? (
                <WebsiteSectionsEditor
                  key={page.id}
                  pageId={page.id}
                  status={page.status}
                  sections={page.sections}
                  storeSlug={storeSlug}
                  canManage={canManage}
                />
              ) : null}
              <div className="flex gap-2">
                {canManage ? <Button type="submit">Salvar</Button> : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPage(null);
                    setPreviewSlug(null);
                  }}
                >
                  {canManage ? "Cancelar" : "Fechar"}
                </Button>
                {page.id && previewSlug ? (
                  <Button asChild type="button" variant="outline">
                    <Link to="/admin/preview" search={{ page: previewSlug }}>
                      Visualizar página
                    </Link>
                  </Button>
                ) : null}
              </div>
              {page.id && previewSlug ? (
                <p className="text-xs text-muted-foreground">
                  O preview mostra os dados salvos; alterações ainda não salvas não serão exibidas.
                </p>
              ) : null}
            </form>
          )}
        </>
      ) : (
        <>
          <section className="grid gap-3" aria-labelledby="website-header-navigation-title">
            <div>
              <h2 id="website-header-navigation-title" className="text-base font-semibold">
                Menu principal (Header)
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Gerencie os destinos e a ordem dos links do menu principal.
              </p>
            </div>
            <div className="space-y-2">
              {query.data.navigation.map((item) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={item.id}
                >
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.externalUrl ??
                        query.data.pages.find((page) => page.id === item.pageId)?.slug ??
                        "Página removida"}{" "}
                      · posição {item.position} · {item.isActive ? "Ativo" : "Inativo"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setNav(item)}>
                      {canManage ? "Editar" : "Visualizar"}
                    </Button>
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await removeNav({ data: { slug: storeSlug, id: item.id } });
                          await refresh();
                        }}
                      >
                        Excluir
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
          {nav && (
            <form onSubmit={submitNav} className="grid gap-3 rounded-lg border p-4">
              <h2 className="font-medium">{nav.id ? "Editar item" : "Novo item"}</h2>
              <FormHelp variant="callout">
                Os itens de navegação definem os links que podem aparecer no menu público da loja.
              </FormHelp>
              <fieldset disabled={!canManage} className="contents">
                <Label>
                  Rótulo
                  <Input
                    value={nav.label}
                    onChange={(e) => setNav({ ...nav, label: e.target.value })}
                    required
                  />
                  <FormHelp>Texto que o visitante verá no menu. Exemplo: Sobre nós</FormHelp>
                </Label>
                <Label>
                  Página interna
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3"
                    value={nav.pageId ?? ""}
                    onChange={(e) => setNav({ ...nav, pageId: e.target.value, externalUrl: "" })}
                  >
                    <option value="">Selecione se for link externo</option>
                    {query.data.pages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} (/{item.slug})
                      </option>
                    ))}
                  </select>
                  <FormHelp>Escolha uma página publicada da própria loja.</FormHelp>
                </Label>
                <Label>
                  URL externa
                  <Input
                    type="url"
                    value={nav.externalUrl ?? ""}
                    onChange={(e) => setNav({ ...nav, externalUrl: e.target.value, pageId: "" })}
                  />
                  <FormHelp>
                    Use quando o destino estiver fora do StoreMesh. Exemplo:
                    https://instagram.com/exemplo
                  </FormHelp>
                </Label>
                <Label>
                  Posição
                  <Input
                    type="number"
                    min="0"
                    value={nav.position}
                    onChange={(e) => setNav({ ...nav, position: Number(e.target.value) })}
                  />
                  <FormHelp>Números menores aparecem primeiro no menu.</FormHelp>
                </Label>
                <div className="grid gap-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={nav.isActive}
                      onChange={(e) => setNav({ ...nav, isActive: e.target.checked })}
                    />{" "}
                    Ativo
                  </label>
                  <FormHelp>Itens inativos não aparecem no menu público.</FormHelp>
                </div>
                <FormHelp variant="callout">
                  Cada item deve ter apenas um destino: uma página interna OU uma URL externa.
                </FormHelp>
              </fieldset>
              <div className="flex gap-2">
                {canManage ? <Button type="submit">Salvar</Button> : null}
                <Button type="button" variant="outline" onClick={() => setNav(null)}>
                  {canManage ? "Cancelar" : "Fechar"}
                </Button>
              </div>
            </form>
          )}
          <section
            className="grid gap-4 rounded-lg border p-4"
            aria-labelledby="website-footer-links-title"
          >
            <div>
              <h2 id="website-footer-links-title" className="text-base font-semibold">
                Links do rodapé (Footer)
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha páginas publicadas para cada grupo e ordene os links. As opções visuais do
                Footer permanecem em Aparência e identidade.
              </p>
            </div>
            {settingsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando grupos do Footer…</p>
            ) : settingsQuery.isError ? (
              <p className="text-sm text-destructive">{message(settingsQuery.error)}</p>
            ) : settingsQuery.data ? (
              <>
                {footerError ? <p className="text-sm text-destructive">{footerError}</p> : null}
                {!canManageFooter ? <AdminReadOnlyNotice permission="settings.manage" /> : null}
                <form onSubmit={submitFooterNavigation} className="grid gap-5">
                  <fieldset disabled={!canManageFooter} className="grid gap-5">
                    <FooterPageGroup
                      idPrefix="store-footer-help-page"
                      title="AJUDA"
                      pages={settingsQuery.data.footerPages}
                      selectedIds={currentFooterGroups.helpPages}
                      onChange={(helpPages) =>
                        setFooterGroups({ ...currentFooterGroups, helpPages })
                      }
                      disabled={!canManageFooter}
                    />
                    <FooterPageGroup
                      idPrefix="store-footer-institutional-page"
                      title="INSTITUCIONAL"
                      pages={settingsQuery.data.footerPages}
                      selectedIds={currentFooterGroups.institutionalPages}
                      onChange={(institutionalPages) =>
                        setFooterGroups({ ...currentFooterGroups, institutionalPages })
                      }
                      disabled={!canManageFooter}
                    />
                  </fieldset>
                  {canManageFooter ? (
                    <Button type="submit" disabled={!footerGroups || footerPending}>
                      {footerPending ? "Salvando…" : "Salvar links do Footer"}
                    </Button>
                  ) : null}
                </form>
              </>
            ) : null}
          </section>
        </>
      )}
    </section>
  );
}
