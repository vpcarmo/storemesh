import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import {
  applyCurrentStorefrontTemplate,
  applyCurrentStorefrontTemplateToExistingHome,
  createCurrentStorePageFromTemplate,
  deleteCurrentStoreNavigationItem,
  getCurrentStorefrontTemplatePreviewData,
  getCurrentStoreWebsite,
  restoreCurrentStoreHomeBackup,
  saveCurrentStoreNavigationItem,
  saveCurrentStorePage,
} from "@/auth/website.functions";
import {
  getCurrentStoreSettings,
  updateCurrentStoreFooterNavigation,
} from "@/auth/store-settings.functions";
import { useAdminStore } from "@/components/admin/admin-store-context";
import { AdminReadOnlyNotice } from "@/components/admin/admin-read-only-notice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FooterPageGroup } from "@/components/admin/footer-page-group";
import { FormHelp } from "@/components/admin/form-help";
import { PublicStorefrontPageComposition } from "@/components/storefront/public-storefront-frame";
import { WebsiteSectionsEditor } from "@/components/website-sections-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STOREFRONT_TEMPLATES, type StorefrontTemplateId } from "@/domain/storefront-templates";
import { DEFAULT_STOREFRONT_DESIGN_SETTINGS } from "@/domain/storefront-design.schema";
import { isHomeBackupSlug, type NavigationItem, type WebsitePage } from "@/domain/website";

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
  const loadTemplatePreview = useServerFn(getCurrentStorefrontTemplatePreviewData);
  const [selectedTemplateId, setSelectedTemplateId] = useState<StorefrontTemplateId | null>(null);
  const templatePreviewQuery = useQuery({
    queryKey: ["storefront-template-preview", storeSlug],
    queryFn: () => loadTemplatePreview({ data: { slug: storeSlug } }),
    enabled: section === "pages" && Boolean(storeSlug) && selectedTemplateId !== null,
  });
  const [page, setPage] = useState<(typeof emptyPage & { id: string | null }) | WebsitePage | null>(
    null,
  );
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [nav, setNav] = useState<typeof emptyNav | NavigationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savePage = useServerFn(saveCurrentStorePage);
  const applyTemplate = useServerFn(applyCurrentStorefrontTemplate);
  const applyTemplateToHome = useServerFn(applyCurrentStorefrontTemplateToExistingHome);
  const createPageFromTemplate = useServerFn(createCurrentStorePageFromTemplate);
  const restoreHomeBackup = useServerFn(restoreCurrentStoreHomeBackup);
  const saveNav = useServerFn(saveCurrentStoreNavigationItem);
  const removeNav = useServerFn(deleteCurrentStoreNavigationItem);
  const saveFooterNavigation = useServerFn(updateCurrentStoreFooterNavigation);
  const [footerGroups, setFooterGroups] = useState<{
    helpPages: string[];
    institutionalPages: string[];
  } | null>(null);
  const [footerError, setFooterError] = useState<string | null>(null);
  const [footerPending, setFooterPending] = useState(false);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [existingHomeTemplateConfirmOpen, setExistingHomeTemplateConfirmOpen] = useState(false);
  const [pageTemplateConfirmOpen, setPageTemplateConfirmOpen] = useState(false);
  const [templatePending, setTemplatePending] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState<string | null>(null);
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
  const [restorePending, setRestorePending] = useState(false);
  const canApplyTemplate = canManage && hasPermission("settings.manage");
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["website", storeSlug] }),
      client.invalidateQueries({ queryKey: ["admin-page-preview", storeSlug] }),
    ]);
  const chooseTemplate = async (templateId: StorefrontTemplateId) => {
    if (!storeSlug || !canApplyTemplate || templatePending || query.data?.pages.length !== 0)
      return;
    setError(null);
    setTemplateFeedback(null);
    setTemplatePending(true);
    try {
      const result = await applyTemplate({ data: { slug: storeSlug, templateId } });
      setTemplateConfirmOpen(false);
      setSelectedTemplateId(null);
      setPage(result.page);
      setPreviewSlug(result.page.slug);
      setTemplateFeedback(
        result.designPresetApplied
          ? "Modelo aplicado. A tipografia do preset foi configurada."
          : "Modelo aplicado. As configurações visuais já existentes foram preservadas.",
      );
      await refresh();
    } catch (e) {
      setError(message(e));
      await refresh();
    } finally {
      setTemplatePending(false);
    }
  };
  const applyTemplateToExistingHome = async (templateId: StorefrontTemplateId) => {
    const home = query.data?.pages.find((item) => item.slug === "home");
    if (!storeSlug || !home || !canApplyTemplate || templatePending) return;
    setError(null);
    setTemplateFeedback(null);
    setTemplatePending(true);
    try {
      const result = await applyTemplateToHome({ data: { slug: storeSlug, templateId } });
      setExistingHomeTemplateConfirmOpen(false);
      setTemplateFeedback(
        `Modelo aplicado à Home. Cópia de segurança verificada e mantida como /${result.backup.slug}.`,
      );
      await refresh();
    } catch (e) {
      setError(message(e));
      await refresh();
    } finally {
      setTemplatePending(false);
    }
  };
  const restoreSelectedHomeBackup = async () => {
    const backup = query.data?.pages.find((item) => item.id === restoreBackupId);
    if (
      !storeSlug ||
      !backup ||
      !isHomeBackupSlug(backup.slug) ||
      !canApplyTemplate ||
      restorePending
    )
      return;
    setError(null);
    setTemplateFeedback(null);
    setRestorePending(true);
    try {
      await restoreHomeBackup({ data: { slug: storeSlug, backupId: backup.id } });
      setRestoreBackupId(null);
      setTemplateFeedback(
        `A Home foi restaurada a partir de /${backup.slug}. A cópia foi mantida para recuperações futuras.`,
      );
      await refresh();
    } catch (e) {
      setError(message(e));
      await refresh();
    } finally {
      setRestorePending(false);
    }
  };
  if (requiresStoreSelection && !storeSlug)
    return (
      <p className="text-sm text-muted-foreground">
        Selecione uma loja no cabeçalho administrativo.
      </p>
    );
  if (query.isPending) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (query.isError || !query.data)
    return <p className="text-sm text-destructive">{message(query.error)}</p>;
  const selectedTemplate = STOREFRONT_TEMPLATES.find(
    (template) => template.id === selectedTemplateId,
  );
  const homePage = query.data.pages.find((item) => item.slug === "home");
  const backupPages = query.data.pages.filter((item) => isHomeBackupSlug(item.slug));
  const regularPages = query.data.pages.filter((item) => !isHomeBackupSlug(item.slug));
  const selectedBackup = backupPages.find((item) => item.id === restoreBackupId);
  const createPageFromSelectedTemplate = async () => {
    if (
      !selectedTemplate ||
      selectedTemplate.purpose !== "page" ||
      !storeSlug ||
      !canManage ||
      templatePending
    )
      return;

    setError(null);
    setTemplateFeedback(null);
    setTemplatePending(true);
    let createdPage: WebsitePage;
    try {
      const result = await createPageFromTemplate({
        data: { slug: storeSlug, templateId: selectedTemplate.id },
      });
      createdPage = result.page;
    } catch (e) {
      setError(message(e));
      return;
    } finally {
      setTemplatePending(false);
    }

    setPage(createdPage);
    setPreviewSlug(createdPage.slug);
    setSelectedTemplateId(null);
    setPageTemplateConfirmOpen(false);
    setTemplateFeedback(
      `Página criada como rascunho em /${createdPage.slug}. Edite suas informações e seções abaixo; nenhum link de navegação foi adicionado.`,
    );
    try {
      await refresh();
    } catch (e) {
      setError(`A página foi criada, mas não foi possível atualizar a lista: ${message(e)}`);
    }
  };
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
  const templateChoices = (templates: typeof STOREFRONT_TEMPLATES) =>
    templates.map((template) => (
      <Button
        key={template.id}
        type="button"
        variant="outline"
        className="h-auto min-h-24 justify-start whitespace-normal p-4 text-left"
        aria-label={`Pré-visualizar modelo: ${template.name}`}
        onClick={() => {
          setTemplateFeedback(null);
          setSelectedTemplateId(template.id);
        }}
      >
        <span>
          <span className="block font-medium">{template.name}</span>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {template.description}
          </span>
          <span className="mt-3 block text-xs font-medium">
            {template.purpose === "page"
              ? "Modelo para nova página · Pré-visualizar"
              : "Modelo para Home · Pré-visualizar"}
          </span>
        </span>
      </Button>
    ));
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
          <section className="rounded-lg border p-4" aria-labelledby="website-template-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="website-template-title" className="font-medium">
                  Biblioteca de modelos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pré-visualize modelos com a aparência atual da loja. Os modelos internos criam
                  novas páginas em rascunho; criar é uma ação separada da pré-visualização.
                  Conteúdos de exemplo são genéricos e editáveis.
                </p>
              </div>
              {selectedTemplate ? (
                <Button type="button" variant="outline" onClick={() => setSelectedTemplateId(null)}>
                  Voltar aos modelos
                </Button>
              ) : null}
            </div>
            {query.data.pages.length > 0 && !homePage ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Esta loja ainda não tem uma página Home. Modelos para Home ficam disponíveis apenas
                para pré-visualização; modelos internos podem criar novas páginas normalmente.
              </p>
            ) : null}
            {homePage && !canApplyTemplate ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Para aplicar um modelo à Home existente, são necessárias permissões de gestão de
                Website e Configurações. A criação de páginas internas exige apenas gestão de
                Website.
              </p>
            ) : null}
            {query.data.pages.length === 0 && !canApplyTemplate ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Para aplicar um modelo inicial, são necessárias permissões de gestão de Website e
                Configurações. A criação de páginas internas exige apenas gestão de Website.
              </p>
            ) : null}
            {templateFeedback ? (
              <p className="mt-3 text-sm text-emerald-700" role="status">
                {templateFeedback}
              </p>
            ) : null}
            {selectedTemplate ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="font-medium">{selectedTemplate.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedTemplate.description}
                    </p>
                    {selectedTemplate.purpose === "page" ? (
                      <p className="mt-1 text-sm font-medium">
                        Cria uma nova página: {selectedTemplate.page.title} (/
                        {selectedTemplate.page.slug})
                      </p>
                    ) : null}
                  </div>
                  {selectedTemplate.purpose === "page" && canManage ? (
                    <Button
                      type="button"
                      disabled={templatePending}
                      onClick={() => setPageTemplateConfirmOpen(true)}
                    >
                      Criar nova página
                    </Button>
                  ) : selectedTemplate.purpose === "home" &&
                    query.data.pages.length === 0 &&
                    canApplyTemplate ? (
                    <Button
                      type="button"
                      disabled={templatePending}
                      onClick={() => setTemplateConfirmOpen(true)}
                    >
                      Aplicar modelo inicial
                    </Button>
                  ) : selectedTemplate.purpose === "home" && homePage && canApplyTemplate ? (
                    <Button
                      type="button"
                      disabled={templatePending}
                      onClick={() => setExistingHomeTemplateConfirmOpen(true)}
                    >
                      Aplicar à Home existente
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm" role="status">
                  Simulação de pré-visualização. Selecionar ou visualizar um modelo não altera
                  páginas, seções, navegação, mídias ou configurações da loja.
                </p>
                {templatePreviewQuery.isPending ? (
                  <p className="text-sm text-muted-foreground">Carregando pré-visualização…</p>
                ) : templatePreviewQuery.isError || !templatePreviewQuery.data ? (
                  <p className="text-sm text-destructive">{message(templatePreviewQuery.error)}</p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <PublicStorefrontPageComposition
                      data={templatePreviewQuery.data}
                      page={{
                        id: `template-preview-${selectedTemplate.id}`,
                        kind: selectedTemplate.purpose === "home" ? "home" : "static",
                        title:
                          selectedTemplate.purpose === "home"
                            ? "Início"
                            : selectedTemplate.page.title,
                        sections: selectedTemplate.sections(storeSlug ?? ""),
                      }}
                      themeSettings={{
                        ...(templatePreviewQuery.data.settings ?? {}),
                        designSettings: {
                          ...DEFAULT_STOREFRONT_DESIGN_SETTINGS,
                          ...(templatePreviewQuery.data.settings?.designSettings ?? {}),
                          ...(selectedTemplate.purpose === "home"
                            ? { typographyPreset: selectedTemplate.typographyPreset }
                            : {}),
                        },
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <section className="space-y-3" aria-labelledby="website-home-template-title">
                  <h3 id="website-home-template-title" className="font-medium">
                    Modelos de Home
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {templateChoices(
                      STOREFRONT_TEMPLATES.filter((template) => template.purpose === "home"),
                    )}
                  </div>
                </section>
                <section className="space-y-3" aria-labelledby="website-page-template-title">
                  <h3 id="website-page-template-title" className="font-medium">
                    Modelos para páginas internas
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {templateChoices(
                      STOREFRONT_TEMPLATES.filter((template) => template.purpose === "page"),
                    )}
                  </div>
                </section>
              </div>
            )}
          </section>
          <Dialog
            open={pageTemplateConfirmOpen}
            onOpenChange={(open) => {
              if (!templatePending) setPageTemplateConfirmOpen(open);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar página a partir do modelo?</DialogTitle>
                <DialogDescription>
                  {selectedTemplate?.purpose === "page"
                    ? `${selectedTemplate.page.title} será criada como rascunho. Se o endereço /${selectedTemplate.page.slug} já estiver em uso, será escolhido um slug alternativo.`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Nenhuma página existente, configuração da loja ou link de navegação será alterado.
                Você poderá editar a página e suas seções após a criação.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={templatePending}
                  onClick={() => setPageTemplateConfirmOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={selectedTemplate?.purpose !== "page" || templatePending || !canManage}
                  onClick={() => void createPageFromSelectedTemplate()}
                >
                  {templatePending ? "Criando…" : "Criar página"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={templateConfirmOpen} onOpenChange={setTemplateConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aplicar modelo inicial?</DialogTitle>
                <DialogDescription>
                  {selectedTemplate?.name} criará a página inicial publicada somente se a loja
                  continuar sem páginas. Essa ação não pode substituir conteúdo existente.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={templatePending}
                  onClick={() => setTemplateConfirmOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!selectedTemplate || templatePending}
                  onClick={() => {
                    if (selectedTemplate) void chooseTemplate(selectedTemplate.id);
                  }}
                >
                  {templatePending ? "Aplicando…" : "Confirmar aplicação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={existingHomeTemplateConfirmOpen}
            onOpenChange={setExistingHomeTemplateConfirmOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aplicar modelo à Home existente?</DialogTitle>
                <DialogDescription>
                  {selectedTemplate?.name} substituirá somente as seções da página Home.
                </DialogDescription>
              </DialogHeader>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>O conteúdo atual da Home será substituído pelas seções do modelo.</li>
                <li>
                  Uma cópia de segurança recuperável será criada e verificada antes da alteração.
                </li>
                <li>
                  Se a Home estiver publicada, o novo conteúdo poderá aparecer imediatamente no
                  site.
                </li>
                <li>
                  As configurações visuais atuais da loja, incluindo cores e fontes personalizadas,
                  serão preservadas.
                </li>
              </ul>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={templatePending}
                  onClick={() => setExistingHomeTemplateConfirmOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!selectedTemplate || !homePage || templatePending}
                  onClick={() => {
                    if (selectedTemplate) void applyTemplateToExistingHome(selectedTemplate.id);
                  }}
                >
                  {templatePending ? "Aplicando…" : "Confirmar aplicação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                {regularPages.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={4} className="p-3 text-muted-foreground">
                      <p>Nenhuma página comum cadastrada.</p>
                      <p>Clique em "Nova página" para criar uma.</p>
                    </td>
                  </tr>
                ) : (
                  regularPages.map((item) => (
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
          <section className="space-y-3 rounded-lg border p-4" aria-labelledby="home-backups-title">
            <div>
              <h2 id="home-backups-title" className="font-medium">
                Cópias de segurança da Home
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Estas versões são rascunhos protegidos; não podem ser publicadas nem editadas como
                páginas comuns. Restaurar substitui somente as seções da Home e mantém esta cópia.
              </p>
              {!homePage && backupPages.length > 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  A restauração está indisponível porque esta loja não possui uma Home.
                </p>
              ) : null}
            </div>
            {backupPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma cópia de segurança da Home disponível.
              </p>
            ) : (
              <div className="space-y-2">
                {backupPages.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{backup.title}</p>
                      <p className="text-xs text-muted-foreground">
                        /{backup.slug} · Rascunho · {backup.sections.length} seções
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canApplyTemplate || !homePage || restorePending}
                      onClick={() => setRestoreBackupId(backup.id)}
                    >
                      Restaurar esta versão
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <Dialog
            open={restoreBackupId !== null}
            onOpenChange={(open) => {
              if (!open && !restorePending) setRestoreBackupId(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Restaurar esta versão?</DialogTitle>
                <DialogDescription>
                  As seções da Home serão substituídas pelo conteúdo de{" "}
                  {selectedBackup?.title ?? "esta cópia"}.
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                O ID, slug, título, SEO e status atuais da Home serão preservados. A cópia de
                segurança permanecerá disponível após a restauração.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={restorePending}
                  onClick={() => setRestoreBackupId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!selectedBackup || !homePage || !canApplyTemplate || restorePending}
                  onClick={() => void restoreSelectedHomeBackup()}
                >
                  {restorePending ? "Restaurando…" : "Confirmar restauração"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                    {query.data.pages
                      .filter((item) => item.status === "published")
                      .map((item) => (
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
