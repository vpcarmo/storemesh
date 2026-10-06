import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

import { getCurrentStoreCatalog } from "@/auth/catalog.functions";
import { getCurrentStoreMedia } from "@/auth/media.functions";
import { saveCurrentStorePageSections } from "@/auth/website.functions";
import { FormHelp } from "@/components/admin/form-help";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { storefrontSectionsSchema } from "@/domain/storefront-sections.schema";
import type { StorefrontSectionDefinition } from "@/domain/storefront";
import type { WebsitePage } from "@/domain/website";

const sectionChoices = [
  ["hero", "Hero"],
  ["banner", "Banner"],
  ["categories", "Categorias"],
  ["product-grid", "Produtos"],
  ["text-content", "Texto"],
  ["call-to-action", "Chamada para ação"],
] as const;

function sectionSummary(section: StorefrontSectionDefinition) {
  switch (section.type) {
    case "hero":
      return `Hero — ${section.title || "Sem título"}`;
    case "banner":
      return `Banner — ${section.message || "Sem mensagem"}`;
    case "categories":
      return `Categorias — ${section.categories.length} selecionadas`;
    case "product-grid":
      return `Produtos — ${section.products.length} selecionados`;
    case "text-content":
      return `Texto — ${section.title || "Sem título"}`;
    case "call-to-action":
      return `Chamada para ação — ${section.title || "Sem título"}`;
  }
}

function newSection(type: StorefrontSectionDefinition["type"]): StorefrontSectionDefinition {
  const id = crypto.randomUUID();
  switch (type) {
    case "hero":
      return { id, type, title: "" };
    case "banner":
      return { id, type, message: "" };
    case "categories":
      return { id, type, categories: [] };
    case "product-grid":
      return { id, type, products: [] };
    case "text-content":
      return { id, type, content: "" };
    case "call-to-action":
      return { id, type, title: "", description: "", action: { label: "", href: "" } };
  }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar as seções.";
}

export function WebsiteSectionsEditor({
  pageId,
  status,
  sections: initialSections,
  storeSlug,
}: {
  pageId: string;
  status: WebsitePage["status"];
  sections: StorefrontSectionDefinition[];
  storeSlug: string | null;
}) {
  const [sections, setSections] = useState<StorefrontSectionDefinition[]>(() =>
    structuredClone(initialSections),
  );
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const loadCatalog = useServerFn(getCurrentStoreCatalog);
  const loadMedia = useServerFn(getCurrentStoreMedia);
  const saveSections = useServerFn(saveCurrentStorePageSections);
  const needsCatalog = sections.some(
    (section) => section.type === "categories" || section.type === "product-grid",
  );
  const needsMedia = sections.some(
    (section) => section.type === "hero" || section.type === "banner",
  );
  const catalogQuery = useQuery({
    queryKey: ["store", "current", "catalog", storeSlug],
    queryFn: () => loadCatalog({ data: { slug: storeSlug } }),
    enabled: !!storeSlug && needsCatalog,
  });
  const mediaQuery = useQuery({
    queryKey: ["store", "current", "media", storeSlug],
    queryFn: () => loadMedia({ data: { slug: storeSlug } }),
    enabled: !!storeSlug && needsMedia,
  });

  function replaceSection(sectionId: string, patch: Partial<StorefrontSectionDefinition>) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? ({ ...section, ...patch } as StorefrontSectionDefinition)
          : section,
      ),
    );
    setSectionErrors((current) => {
      const next = { ...current };
      delete next[sectionId];
      return next;
    });
    setError(null);
    setFeedback(null);
  }

  function replaceOptionalAction(
    sectionId: string,
    action: { label: string; href: string } | undefined,
  ) {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId || (section.type !== "hero" && section.type !== "banner"))
          return section;
        if (action) return { ...section, action };
        const { action: _action, ...withoutAction } = section;
        return withoutAction;
      }),
    );
    setError(null);
    setFeedback(null);
  }

  function addSection(type: StorefrontSectionDefinition["type"]) {
    const section = newSection(type);
    setSections((current) => [...current, section]);
    setExpandedIds((current) => [...current, section.id]);
    setShowAddOptions(false);
    setError(null);
    setFeedback(null);
  }

  function moveSection(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
    setFeedback(null);
  }

  function saveRemoval() {
    if (!removeTarget) return;
    setSections((current) => current.filter((section) => section.id !== removeTarget));
    setExpandedIds((current) => current.filter((id) => id !== removeTarget));
    setSectionErrors((current) => {
      const next = { ...current };
      delete next[removeTarget];
      return next;
    });
    setRemoveTarget(null);
    setFeedback(null);
  }

  async function submitSections() {
    setError(null);
    setFeedback(null);
    const parsed = storefrontSectionsSchema.safeParse(sections);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const index = issue.path[0];
        if (typeof index === "number" && sections[index])
          nextErrors[sections[index]!.id] ??= issue.message;
      }
      setSectionErrors(nextErrors);
      setError("Revise os campos indicados antes de salvar.");
      return;
    }

    setSectionErrors({});
    setPending(true);
    try {
      await saveSections({
        data: { slug: storeSlug, id: pageId, sections: parsed.data },
      });
      await queryClient.invalidateQueries({ queryKey: ["website", storeSlug] });
      setFeedback("Seções salvas.");
    } catch (saveError) {
      setError(errorText(saveError));
    } finally {
      setPending(false);
    }
  }

  function sectionEditor(section: StorefrontSectionDefinition) {
    const textField = (
      label: string,
      value: string,
      onChange: (value: string) => void,
      help?: string,
    ) => (
      <Label>
        {label}
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
        {help ? <FormHelp>{help}</FormHelp> : null}
      </Label>
    );
    const descriptionField = (
      value: string | null | undefined,
      onChange: (value: string) => void,
    ) => (
      <Label>
        Descrição
        <Textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      </Label>
    );
    const actionFields = (
      action: { label: string; href: string } | undefined,
      onChange: (action: { label: string; href: string } | undefined) => void,
      required: boolean,
    ) => (
      <div className="grid gap-3">
        {!required ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!action}
              onChange={(event) =>
                onChange(event.target.checked ? { label: "", href: "" } : undefined)
              }
            />
            Incluir botão
          </label>
        ) : null}
        {action ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {textField("Texto do botão", action.label, (label) => onChange({ ...action, label }))}
            {textField(
              "Destino",
              action.href,
              (href) => onChange({ ...action, href }),
              "Use um caminho interno ou uma URL HTTP(S).",
            )}
          </div>
        ) : null}
      </div>
    );
    const mediaField = (imageMediaAssetId: string | null | undefined) => {
      const selectedAsset = mediaQuery.data?.find((asset) => asset.id === imageMediaAssetId);
      return (
        <div className="grid gap-2">
          <Label>Imagem</Label>
          <FormHelp>
            Selecione uma imagem da Biblioteca de mídia desta loja. O arquivo não será duplicado.
          </FormHelp>
          <div className="flex flex-wrap items-center gap-3">
            {selectedAsset ? (
              <div className="flex items-center gap-3">
                <img
                  src={selectedAsset.imageUrl}
                  alt=""
                  className="size-16 rounded border object-cover"
                />
                <div className="text-sm">
                  <p className="font-medium">{selectedAsset.filename}</p>
                  <p className="text-muted-foreground">
                    {selectedAsset.width && selectedAsset.height
                      ? `${selectedAsset.width} × ${selectedAsset.height}`
                      : "Dimensões indisponíveis"}
                  </p>
                  <p className="text-muted-foreground">
                    Texto alternativo: definido pela mídia selecionada.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {imageMediaAssetId
                  ? "Mídia não encontrada nesta loja."
                  : "Nenhuma mídia selecionada."}
              </p>
            )}
            <Button type="button" variant="outline" onClick={() => setMediaTarget(section.id)}>
              <ImagePlus aria-hidden="true" /> Selecionar mídia
            </Button>
            {imageMediaAssetId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Remover mídia selecionada"
                onClick={() => replaceSection(section.id, { imageMediaAssetId: null })}
              >
                <X aria-hidden="true" /> Remover mídia
              </Button>
            ) : null}
          </div>
        </div>
      );
    };

    switch (section.type) {
      case "hero":
        return (
          <div className="grid gap-4">
            <FormHelp>
              Apresentação principal da página. Título, descrição, imagem e botão são opcionais
              conforme a configuração.
            </FormHelp>
            {textField("Título", section.title, (title) => replaceSection(section.id, { title }))}
            {descriptionField(section.description, (description) =>
              replaceSection(section.id, { description }),
            )}
            {actionFields(
              section.action,
              (action) => replaceOptionalAction(section.id, action),
              false,
            )}
            {mediaField(section.imageMediaAssetId)}
          </div>
        );
      case "banner":
        return (
          <div className="grid gap-4">
            <FormHelp>Faixa de destaque com uma mensagem, imagem e ação opcionais.</FormHelp>
            {textField("Mensagem", section.message, (message) =>
              replaceSection(section.id, { message }),
            )}
            {actionFields(
              section.action,
              (action) => replaceOptionalAction(section.id, action),
              false,
            )}
            {mediaField(section.imageMediaAssetId)}
          </div>
        );
      case "categories":
        return (
          <div className="grid gap-4">
            <FormHelp>
              Selecione categorias desta loja para exibi-las nesta página. Os dados selecionados
              ficam armazenados na seção.
            </FormHelp>
            <FormHelp>
              Os dados selecionados são armazenados na seção da página e não são atualizados
              automaticamente quando a categoria muda.
            </FormHelp>
            {textField("Título (opcional)", section.title ?? "", (title) =>
              replaceSection(section.id, { title }),
            )}
            {catalogQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando categorias…</p>
            ) : null}
            {catalogQuery.isError ? (
              <p className="text-sm text-destructive">{errorText(catalogQuery.error)}</p>
            ) : null}
            {catalogQuery.data?.categories.map((category) => (
              <label key={category.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={section.categories.some((item) => item.id === category.id)}
                  onChange={(event) => {
                    const categories = event.target.checked
                      ? [
                          ...section.categories,
                          {
                            id: category.id,
                            name: category.name,
                            description: category.description,
                          },
                        ]
                      : section.categories.filter((item) => item.id !== category.id);
                    replaceSection(section.id, { categories });
                  }}
                />
                <span>{category.name}</span>
              </label>
            ))}
            {!catalogQuery.isPending && catalogQuery.data?.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta loja ainda não possui categorias.
              </p>
            ) : null}
          </div>
        );
      case "product-grid":
        return (
          <div className="grid gap-4">
            <FormHelp>
              Selecione produtos desta loja para exibi-los nesta página. Os dados selecionados ficam
              armazenados na seção.
            </FormHelp>
            <FormHelp>
              Os produtos são armazenados na seção como um retrato dos dados selecionados.
              Alterações posteriores no cadastro do produto não atualizam automaticamente esta
              seção.
            </FormHelp>
            {textField("Título (opcional)", section.title ?? "", (title) =>
              replaceSection(section.id, { title }),
            )}
            {catalogQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando produtos…</p>
            ) : null}
            {catalogQuery.isError ? (
              <p className="text-sm text-destructive">{errorText(catalogQuery.error)}</p>
            ) : null}
            {catalogQuery.data?.products.map((product) => (
              <label key={product.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={section.products.some((item) => item.id === product.id)}
                  onChange={(event) => {
                    const products = event.target.checked
                      ? [
                          ...section.products,
                          {
                            id: product.id,
                            name: product.name,
                            description: product.description,
                            price: product.price,
                          },
                        ]
                      : section.products.filter((item) => item.id !== product.id);
                    replaceSection(section.id, { products });
                  }}
                />
                <span>
                  {product.name} · {product.price.toFixed(2)}
                </span>
              </label>
            ))}
            {!catalogQuery.isPending && catalogQuery.data?.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Esta loja ainda não possui produtos.</p>
            ) : null}
          </div>
        );
      case "text-content":
        return (
          <div className="grid gap-4">
            <FormHelp>Use texto simples. HTML e Markdown não são interpretados.</FormHelp>
            {textField("Título (opcional)", section.title ?? "", (title) =>
              replaceSection(section.id, { title }),
            )}
            <Label>
              Conteúdo
              <Textarea
                value={section.content}
                onChange={(event) => replaceSection(section.id, { content: event.target.value })}
              />
            </Label>
          </div>
        );
      case "call-to-action":
        return (
          <div className="grid gap-4">
            <FormHelp>
              Use esta seção para destacar uma ação e direcionar o visitante para um destino.
            </FormHelp>
            {textField("Título", section.title, (title) => replaceSection(section.id, { title }))}
            {descriptionField(section.description, (description) =>
              replaceSection(section.id, { description }),
            )}
            {actionFields(
              section.action,
              (action) => {
                if (action) replaceSection(section.id, { action });
              },
              true,
            )}
          </div>
        );
    }
  }

  return (
    <section className="space-y-4 border-t pt-5" aria-label="Seções da página">
      <div>
        <h3 className="font-semibold">Seções</h3>
        <FormHelp>
          Os dados da página definem endereço, status e SEO. As seções definem o conteúdo visual.
        </FormHelp>
        <FormHelp>As seções aparecem na página na mesma ordem desta lista.</FormHelp>
      </div>
      {status === "published" ? (
        <FormHelp variant="callout">
          Salvar alterações em uma página publicada atualiza o conteúdo público imediatamente após a
          próxima leitura da página.
        </FormHelp>
      ) : null}
      {sections.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Esta página ainda não possui seções.
        </p>
      ) : null}
      <Accordion
        type="multiple"
        value={expandedIds}
        onValueChange={setExpandedIds}
        className="space-y-2"
      >
        {sections.map((section, index) => (
          <AccordionItem key={section.id} value={section.id} className="rounded-md border px-4">
            <div className="flex items-center gap-2">
              <AccordionTrigger className="min-w-0 py-3 hover:no-underline">
                <span className="truncate">
                  [{index + 1}] {sectionSummary(section)}
                </span>
              </AccordionTrigger>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Mover para cima"
                  title="Mover para cima"
                  disabled={index === 0}
                  onClick={() => moveSection(index, -1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Mover para baixo"
                  title="Mover para baixo"
                  disabled={index === sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remover seção"
                  title="Remover seção"
                  onClick={() => setRemoveTarget(section.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
            <AccordionContent className="grid gap-4 pt-2">
              {sectionEditor(section)}
              {sectionErrors[section.id] ? (
                <p className="text-sm text-destructive" role="alert">
                  {sectionErrors[section.id]}
                </p>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddOptions((shown) => !shown)}
        >
          <Plus aria-hidden="true" /> Adicionar seção
        </Button>
        <Button type="button" disabled={pending} onClick={submitSections}>
          <Save aria-hidden="true" /> {pending ? "Salvando…" : "Salvar seções"}
        </Button>
      </div>
      {showAddOptions ? (
        <div className="flex flex-wrap gap-2 rounded-md border p-3" aria-label="Tipos de seção">
          {sectionChoices.map(([type, label]) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => addSection(type)}
            >
              <Plus aria-hidden="true" /> {label}
            </Button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {feedback ? (
        <p className="text-sm text-emerald-700" role="status">
          {feedback}
        </p>
      ) : null}

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover seção?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover esta seção? Ela será retirada da página quando você salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={saveRemoval}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={mediaTarget !== null} onOpenChange={(open) => !open && setMediaTarget(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Biblioteca de mídia</DialogTitle>
            <DialogDescription>
              Selecione uma mídia da Biblioteca da loja. O arquivo não será duplicado.
            </DialogDescription>
          </DialogHeader>
          {mediaQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando mídias…</p>
          ) : null}
          {mediaQuery.isError ? (
            <p className="text-sm text-destructive">{errorText(mediaQuery.error)}</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {mediaQuery.data?.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="flex min-w-0 items-center gap-3 rounded-md border p-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  if (mediaTarget) replaceSection(mediaTarget, { imageMediaAssetId: asset.id });
                  setMediaTarget(null);
                }}
              >
                <img
                  src={asset.imageUrl}
                  alt=""
                  className="size-16 shrink-0 rounded border object-cover"
                />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium">{asset.filename}</span>
                  <span className="block text-muted-foreground">
                    {asset.width && asset.height
                      ? `${asset.width} × ${asset.height}`
                      : "Dimensões indisponíveis"}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {!mediaQuery.isPending && mediaQuery.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta loja ainda não possui mídias.</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
