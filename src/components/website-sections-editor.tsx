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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_STOREFRONT_COLORS, isValidStorefrontHexColor } from "@/domain/storefront-theme";
import {
  parseStorefrontSectionsForSave,
  STOREFRONT_TEXT_CONTENT_MAX_LENGTH,
} from "@/domain/storefront-sections.schema";
import {
  STOREFRONT_SECTION_CONTENT_ALIGNMENTS,
  STOREFRONT_SECTION_CONTENT_WIDTHS,
  STOREFRONT_SECTION_SPACINGS,
} from "@/domain/storefront";
import type { SectionLayoutDefinition, StorefrontSectionDefinition } from "@/domain/storefront";
import type { WebsitePage } from "@/domain/website";

const sectionChoices = [
  ["hero", "Hero"],
  ["banner", "Banner"],
  ["categories", "Categorias"],
  ["product-grid", "Produtos"],
  ["text-content", "Texto"],
  ["image-text", "Imagem com texto"],
  ["benefits", "Benefícios e diferenciais"],
  ["faq", "FAQ"],
  ["testimonials", "Depoimentos"],
  ["partner-brands", "Marcas parceiras"],
  ["editorial-gallery", "Galeria editorial"],
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
    case "image-text":
      return `Imagem com texto — ${section.title || "Sem título"}`;
    case "benefits":
      return `Benefícios — ${section.benefits.length} itens`;
    case "faq":
      return `FAQ — ${section.items.length} perguntas`;
    case "testimonials":
      return `Depoimentos — ${section.testimonials.length} itens`;
    case "partner-brands":
      return `Marcas parceiras — ${section.brands.length} marcas`;
    case "editorial-gallery":
      return `Galeria editorial — ${section.images.length} imagens`;
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
      return { id, type, content: "", contentFormat: "plain" };
    case "image-text":
      return { id, type, title: "", description: "", imagePosition: "left" };
    case "benefits":
      return { id, type, benefits: [] };
    case "faq":
      return { id, type, items: [] };
    case "testimonials":
      return { id, type, testimonials: [] };
    case "partner-brands":
      return { id, type, brands: [] };
    case "editorial-gallery":
      return { id, type, images: [] };
    case "call-to-action":
      return { id, type, title: "", description: "", action: { label: "", href: "" } };
  }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar as seções.";
}

function isEnumValue<const T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.some((option) => option === value);
}

export function WebsiteSectionsEditor({
  pageId,
  status,
  sections: initialSections,
  storeSlug,
  canManage,
}: {
  pageId: string;
  status: WebsitePage["status"];
  sections: StorefrontSectionDefinition[];
  storeSlug: string | null;
  canManage: boolean;
}) {
  const [sections, setSections] = useState<StorefrontSectionDefinition[]>(() =>
    structuredClone(initialSections),
  );
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [mediaTarget, setMediaTarget] = useState<{
    sectionId: string;
    brandIndex?: number;
    galleryIndex?: number;
  } | null>(null);
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
    (section) =>
      section.type === "hero" ||
      section.type === "banner" ||
      section.type === "image-text" ||
      section.type === "partner-brands" ||
      section.type === "editorial-gallery",
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

  function replaceSection(
    sectionId: string,
    patch: Partial<StorefrontSectionDefinition> | Partial<SectionLayoutDefinition>,
  ) {
    if (!canManage) return;
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

  function replaceSectionBackgroundColor(sectionId: string, backgroundColor?: string) {
    if (!canManage) return;
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        if (backgroundColor !== undefined) return { ...section, backgroundColor };
        const { backgroundColor: _backgroundColor, ...withoutBackgroundColor } = section;
        return withoutBackgroundColor;
      }),
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
    if (!canManage) return;
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
    if (!canManage) return;
    const section = newSection(type);
    setSections((current) => [...current, section]);
    setExpandedIds((current) => [...current, section.id]);
    setShowAddOptions(false);
    setError(null);
    setFeedback(null);
  }

  function moveSection(index: number, direction: -1 | 1) {
    if (!canManage) return;
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
    if (!canManage || !removeTarget) return;
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
    if (!canManage) return;
    setError(null);
    setFeedback(null);
    const parsed = parseStorefrontSectionsForSave(sections, initialSections);
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
    const backgroundColor = section.backgroundColor ?? "";
    const backgroundColorError =
      backgroundColor && !isValidStorefrontHexColor(backgroundColor)
        ? "Use uma cor hexadecimal no formato #RRGGBB."
        : undefined;
    const sectionBackgroundField = (
      <div className="grid gap-2">
        <Label htmlFor={`section-background-${section.id}`}>Cor de fundo individual</Label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            aria-label="Seletor visual: Cor de fundo individual"
            className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
            type="color"
            disabled={!canManage}
            value={
              isValidStorefrontHexColor(backgroundColor)
                ? backgroundColor
                : DEFAULT_STOREFRONT_COLORS.background
            }
            onChange={(event) =>
              replaceSection(section.id, { backgroundColor: event.target.value.toUpperCase() })
            }
          />
          <Input
            id={`section-background-${section.id}`}
            className="w-32 uppercase"
            disabled={!canManage}
            value={backgroundColor}
            maxLength={7}
            placeholder="Herdar"
            aria-invalid={Boolean(backgroundColorError)}
            aria-describedby={
              backgroundColorError ? `section-background-${section.id}-error` : undefined
            }
            onChange={(event) =>
              replaceSectionBackgroundColor(section.id, event.target.value || undefined)
            }
          />
          <span
            className="size-8 rounded border border-border"
            style={{
              backgroundColor: isValidStorefrontHexColor(backgroundColor)
                ? backgroundColor
                : "transparent",
            }}
            aria-label={
              isValidStorefrontHexColor(backgroundColor)
                ? `Amostra da cor de fundo: ${backgroundColor}`
                : "Amostra da cor de fundo herdada"
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canManage || !backgroundColor}
            onClick={() => replaceSectionBackgroundColor(section.id)}
          >
            Usar cor herdada
          </Button>
        </div>
        {backgroundColorError ? (
          <p
            id={`section-background-${section.id}-error`}
            className="text-sm text-destructive"
            role="alert"
          >
            {backgroundColorError}
          </p>
        ) : (
          <FormHelp>
            Opcional. Quando vazia, mantém a cor padrão da loja ou o fundo original da seção.
          </FormHelp>
        )}
      </div>
    );
    const sectionLayoutControls =
      section.type === "categories" ||
      section.type === "product-grid" ||
      section.type === "text-content" ||
      section.type === "image-text" ||
      section.type === "benefits" ||
      section.type === "faq" ||
      section.type === "testimonials" ||
      section.type === "partner-brands" ||
      section.type === "editorial-gallery" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Label>
            Espaçamento
            <Select
              value={section.sectionSpacing ?? "default"}
              onValueChange={(value) => {
                if (isEnumValue(STOREFRONT_SECTION_SPACINGS, value))
                  replaceSection(section.id, { sectionSpacing: value });
              }}
            >
              <SelectTrigger disabled={!canManage}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="default">Padrão</SelectItem>
                <SelectItem value="spacious">Amplo</SelectItem>
              </SelectContent>
            </Select>
          </Label>
          <Label>
            Largura do conteúdo
            <Select
              value={section.contentWidth ?? "default"}
              onValueChange={(value) => {
                if (isEnumValue(STOREFRONT_SECTION_CONTENT_WIDTHS, value))
                  replaceSection(section.id, { contentWidth: value });
              }}
            >
              <SelectTrigger disabled={!canManage}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Estreita</SelectItem>
                <SelectItem value="default">Padrão</SelectItem>
                <SelectItem value="wide">Ampla</SelectItem>
              </SelectContent>
            </Select>
          </Label>
          <Label>
            Alinhamento do conteúdo
            <Select
              value={section.contentAlignment ?? "left"}
              onValueChange={(value) => {
                if (isEnumValue(STOREFRONT_SECTION_CONTENT_ALIGNMENTS, value))
                  replaceSection(section.id, { contentAlignment: value });
              }}
            >
              <SelectTrigger disabled={!canManage}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </Label>
        </div>
      ) : null;
    const textField = (
      label: string,
      value: string,
      onChange: (value: string) => void,
      help?: string,
    ) => (
      <Label>
        {label}
        <Input
          value={value}
          disabled={!canManage}
          onChange={(event) => onChange(event.target.value)}
        />
        {help ? <FormHelp>{help}</FormHelp> : null}
      </Label>
    );
    const descriptionField = (
      value: string | null | undefined,
      onChange: (value: string) => void,
    ) => (
      <Label>
        Descrição
        <Textarea
          value={value ?? ""}
          disabled={!canManage}
          onChange={(event) => onChange(event.target.value)}
        />
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
              disabled={!canManage}
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
            <Button
              type="button"
              variant="outline"
              disabled={!canManage}
              title={
                !canManage ? "Seu perfil permite apenas visualizar estas informações." : undefined
              }
              onClick={() => setMediaTarget({ sectionId: section.id })}
            >
              <ImagePlus aria-hidden="true" /> Selecionar mídia
            </Button>
            {imageMediaAssetId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Remover mídia selecionada"
                disabled={!canManage}
                onClick={() => replaceSection(section.id, { imageMediaAssetId: null })}
              >
                <X aria-hidden="true" /> Remover mídia
              </Button>
            ) : null}
          </div>
        </div>
      );
    };

    const content = (() => {
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
                    disabled={!canManage}
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
                Selecione produtos desta loja para exibi-los nesta página. Os dados selecionados
                ficam armazenados na seção.
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
                    disabled={!canManage}
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
                <p className="text-sm text-muted-foreground">
                  Esta loja ainda não possui produtos.
                </p>
              ) : null}
            </div>
          );
        case "text-content":
          return (
            <div className="grid gap-4">
              {textField("Título (opcional)", section.title ?? "", (title) =>
                replaceSection(section.id, { title }),
              )}
              <Label>
                Formato
                <Select
                  value={section.contentFormat ?? "plain"}
                  onValueChange={(contentFormat) => {
                    if (contentFormat === "plain" || contentFormat === "markdown")
                      replaceSection(section.id, { contentFormat });
                  }}
                >
                  <SelectTrigger disabled={!canManage}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plain">Texto simples</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>
              </Label>
              {section.contentFormat === "markdown" ? (
                <>
                  <FormHelp>
                    Use Markdown para títulos, negrito, itálico, listas, citações e links.
                  </FormHelp>
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    {"## Título\n\nTexto com **destaque**.\n\n[Saiba mais](https://exemplo.com)"}
                  </pre>
                </>
              ) : (
                <FormHelp>Texto simples. Markdown não é interpretado.</FormHelp>
              )}
              <Label>
                Conteúdo
                <Textarea
                  maxLength={STOREFRONT_TEXT_CONTENT_MAX_LENGTH}
                  value={section.content}
                  disabled={!canManage}
                  onChange={(event) => replaceSection(section.id, { content: event.target.value })}
                />
              </Label>
            </div>
          );
        case "image-text":
          return (
            <div className="grid gap-4">
              <FormHelp>Combine uma imagem da Biblioteca de mídia com título e descrição.</FormHelp>
              {textField("Título", section.title, (title) => replaceSection(section.id, { title }))}
              {descriptionField(section.description, (description) =>
                replaceSection(section.id, { description }),
              )}
              {mediaField(section.imageMediaAssetId)}
              <Label>
                Texto alternativo da imagem
                <Input
                  value={section.imageAlt ?? ""}
                  disabled={!canManage}
                  onChange={(event) => replaceSection(section.id, { imageAlt: event.target.value })}
                />
              </Label>
              <Label>
                Posição da imagem
                <Select
                  value={section.imagePosition ?? "left"}
                  onValueChange={(imagePosition) => {
                    if (imagePosition === "left" || imagePosition === "right")
                      replaceSection(section.id, { imagePosition });
                  }}
                >
                  <SelectTrigger disabled={!canManage}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </Label>
            </div>
          );
        case "benefits":
          return (
            <div className="grid gap-4">
              {textField("Título da seção (opcional)", section.title ?? "", (title) =>
                replaceSection(section.id, { title }),
              )}
              {descriptionField(section.description, (description) =>
                replaceSection(section.id, { description }),
              )}
              <div className="grid gap-3">
                {section.benefits.map((benefit, index) => (
                  <fieldset key={index} className="grid gap-3 rounded-md border p-3">
                    <legend className="px-1 text-sm font-medium">Benefício {index + 1}</legend>
                    <Label>
                      Título
                      <Input
                        value={benefit.title}
                        disabled={!canManage}
                        onChange={(event) => {
                          const benefits = [...section.benefits];
                          benefits[index] = { ...benefit, title: event.target.value };
                          replaceSection(section.id, { benefits });
                        }}
                      />
                    </Label>
                    <Label>
                      Descrição
                      <Textarea
                        value={benefit.description}
                        disabled={!canManage}
                        onChange={(event) => {
                          const benefits = [...section.benefits];
                          benefits[index] = { ...benefit, description: event.target.value };
                          replaceSection(section.id, { benefits });
                        }}
                      />
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Mover benefício ${index + 1} para cima`}
                        disabled={!canManage || index === 0}
                        onClick={() => {
                          const benefits = [...section.benefits];
                          [benefits[index - 1], benefits[index]] = [
                            benefits[index]!,
                            benefits[index - 1]!,
                          ];
                          replaceSection(section.id, { benefits });
                        }}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Mover benefício ${index + 1} para baixo`}
                        disabled={!canManage || index === section.benefits.length - 1}
                        onClick={() => {
                          const benefits = [...section.benefits];
                          [benefits[index], benefits[index + 1]] = [
                            benefits[index + 1]!,
                            benefits[index]!,
                          ];
                          replaceSection(section.id, { benefits });
                        }}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() =>
                          replaceSection(section.id, {
                            benefits: section.benefits.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" /> Remover
                      </Button>
                    </div>
                  </fieldset>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canManage || section.benefits.length >= 50}
                  onClick={() =>
                    replaceSection(section.id, {
                      benefits: [...section.benefits, { title: "", description: "" }],
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Adicionar benefício
                </Button>
              </div>
            </div>
          );
        case "faq":
          return (
            <div className="grid gap-4">
              {textField("Título da seção (opcional)", section.title ?? "", (title) =>
                replaceSection(section.id, { title }),
              )}
              {descriptionField(section.description, (description) =>
                replaceSection(section.id, { description }),
              )}
              <div className="grid gap-3">
                {section.items.map((item, index) => (
                  <fieldset key={index} className="grid gap-3 rounded-md border p-3">
                    <legend className="px-1 text-sm font-medium">Pergunta {index + 1}</legend>
                    <Label>
                      Pergunta
                      <Input
                        value={item.question}
                        disabled={!canManage}
                        onChange={(event) => {
                          const items = [...section.items];
                          items[index] = { ...item, question: event.target.value };
                          replaceSection(section.id, { items });
                        }}
                      />
                    </Label>
                    <Label>
                      Resposta
                      <Textarea
                        value={item.answer}
                        disabled={!canManage}
                        onChange={(event) => {
                          const items = [...section.items];
                          items[index] = { ...item, answer: event.target.value };
                          replaceSection(section.id, { items });
                        }}
                      />
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Mover pergunta ${index + 1} para cima`}
                        disabled={!canManage || index === 0}
                        onClick={() => {
                          const items = [...section.items];
                          [items[index - 1], items[index]] = [items[index]!, items[index - 1]!];
                          replaceSection(section.id, { items });
                        }}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Mover pergunta ${index + 1} para baixo`}
                        disabled={!canManage || index === section.items.length - 1}
                        onClick={() => {
                          const items = [...section.items];
                          [items[index], items[index + 1]] = [items[index + 1]!, items[index]!];
                          replaceSection(section.id, { items });
                        }}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() =>
                          replaceSection(section.id, {
                            items: section.items.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" /> Remover
                      </Button>
                    </div>
                  </fieldset>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canManage || section.items.length >= 100}
                  onClick={() =>
                    replaceSection(section.id, {
                      items: [...section.items, { question: "", answer: "" }],
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Adicionar pergunta
                </Button>
              </div>
            </div>
          );
        case "testimonials":
          return (
            <div className="grid gap-4">
              {textField("Título da seção (opcional)", section.title ?? "", (title) =>
                replaceSection(section.id, { title }),
              )}
              {descriptionField(section.description, (description) =>
                replaceSection(section.id, { description }),
              )}
              <div className="grid gap-3">
                {section.testimonials.map((testimonial, index) => (
                  <fieldset key={index} className="grid gap-3 rounded-md border p-3">
                    <legend className="px-1 text-sm font-medium">Depoimento {index + 1}</legend>
                    <Label>
                      Depoimento
                      <Textarea
                        value={testimonial.quote}
                        disabled={!canManage}
                        onChange={(event) => {
                          const testimonials = [...section.testimonials];
                          testimonials[index] = { ...testimonial, quote: event.target.value };
                          replaceSection(section.id, { testimonials });
                        }}
                      />
                    </Label>
                    {textField("Nome", testimonial.name, (name) => {
                      const testimonials = [...section.testimonials];
                      testimonials[index] = { ...testimonial, name };
                      replaceSection(section.id, { testimonials });
                    })}
                    {textField("Cargo (opcional)", testimonial.role ?? "", (role) => {
                      const testimonials = [...section.testimonials];
                      testimonials[index] = { ...testimonial, role };
                      replaceSection(section.id, { testimonials });
                    })}
                    {textField("Empresa (opcional)", testimonial.company ?? "", (company) => {
                      const testimonials = [...section.testimonials];
                      testimonials[index] = { ...testimonial, company };
                      replaceSection(section.id, { testimonials });
                    })}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Mover depoimento ${index + 1} para cima`}
                        disabled={!canManage || index === 0}
                        onClick={() => {
                          const testimonials = [...section.testimonials];
                          [testimonials[index - 1], testimonials[index]] = [
                            testimonials[index]!,
                            testimonials[index - 1]!,
                          ];
                          replaceSection(section.id, { testimonials });
                        }}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Mover depoimento ${index + 1} para baixo`}
                        disabled={!canManage || index === section.testimonials.length - 1}
                        onClick={() => {
                          const testimonials = [...section.testimonials];
                          [testimonials[index], testimonials[index + 1]] = [
                            testimonials[index + 1]!,
                            testimonials[index]!,
                          ];
                          replaceSection(section.id, { testimonials });
                        }}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() =>
                          replaceSection(section.id, {
                            testimonials: section.testimonials.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" /> Remover
                      </Button>
                    </div>
                  </fieldset>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canManage || section.testimonials.length >= 100}
                  onClick={() =>
                    replaceSection(section.id, {
                      testimonials: [...section.testimonials, { quote: "", name: "" }],
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Adicionar depoimento
                </Button>
              </div>
            </div>
          );
        case "partner-brands":
          return (
            <div className="grid gap-4">
              {textField("Título (opcional)", section.title ?? "", (title) =>
                replaceSection(section.id, { title }),
              )}
              <div className="grid gap-3">
                {section.brands.map((brand, index) => {
                  const logo = mediaQuery.data?.find(
                    (asset) => asset.id === brand.logoMediaAssetId,
                  );
                  return (
                    <fieldset key={index} className="grid gap-3 rounded-md border p-3">
                      <legend className="px-1 text-sm font-medium">Marca {index + 1}</legend>
                      {textField("Nome da marca", brand.name, (name) => {
                        const brands = [...section.brands];
                        brands[index] = { ...brand, name };
                        replaceSection(section.id, { brands });
                      })}
                      <div className="grid gap-2">
                        <Label>Logo</Label>
                        {logo ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={logo.imageUrl}
                              alt=""
                              className="h-16 max-w-40 rounded border object-contain"
                            />
                            <span className="text-sm">{logo.filename}</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {brand.logoMediaAssetId
                              ? "Mídia não encontrada nesta loja."
                              : "Nenhum logo selecionado."}
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() =>
                            setMediaTarget({ sectionId: section.id, brandIndex: index })
                          }
                        >
                          <ImagePlus aria-hidden="true" /> Selecionar logo
                        </Button>
                      </div>
                      <Label>
                        Texto alternativo do logo
                        <Input
                          value={brand.logoAlt}
                          disabled={!canManage}
                          onChange={(event) => {
                            const brands = [...section.brands];
                            brands[index] = { ...brand, logoAlt: event.target.value };
                            replaceSection(section.id, { brands });
                          }}
                        />
                      </Label>
                      <Label>
                        URL de destino (opcional)
                        <Input
                          type="url"
                          value={brand.href ?? ""}
                          disabled={!canManage}
                          placeholder="https://exemplo.com"
                          onChange={(event) => {
                            const brands = [...section.brands];
                            const href = event.target.value;
                            if (href) brands[index] = { ...brand, href };
                            else {
                              const { href: _href, ...brandWithoutHref } = brand;
                              brands[index] = brandWithoutHref;
                            }
                            replaceSection(section.id, { brands });
                          }}
                        />
                        <FormHelp>Use um caminho interno ou uma URL HTTP(S) segura.</FormHelp>
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`Mover marca ${index + 1} para cima`}
                          disabled={!canManage || index === 0}
                          onClick={() => {
                            const brands = [...section.brands];
                            [brands[index - 1], brands[index]] = [
                              brands[index]!,
                              brands[index - 1]!,
                            ];
                            replaceSection(section.id, { brands });
                          }}
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`Mover marca ${index + 1} para baixo`}
                          disabled={!canManage || index === section.brands.length - 1}
                          onClick={() => {
                            const brands = [...section.brands];
                            [brands[index], brands[index + 1]] = [
                              brands[index + 1]!,
                              brands[index]!,
                            ];
                            replaceSection(section.id, { brands });
                          }}
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() =>
                            replaceSection(section.id, {
                              brands: section.brands.filter((_, itemIndex) => itemIndex !== index),
                            })
                          }
                        >
                          <Trash2 aria-hidden="true" /> Remover
                        </Button>
                      </div>
                    </fieldset>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canManage || section.brands.length >= 100}
                  onClick={() =>
                    replaceSection(section.id, {
                      brands: [...section.brands, { name: "", logoMediaAssetId: "", logoAlt: "" }],
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Adicionar marca
                </Button>
              </div>
            </div>
          );
        case "editorial-gallery":
          return (
            <div className="grid gap-4">
              {textField("Título (opcional)", section.title ?? "", (title) =>
                replaceSection(section.id, { title }),
              )}
              <div className="grid gap-3">
                {section.images.map((image, index) => {
                  const asset = mediaQuery.data?.find((item) => item.id === image.mediaAssetId);
                  return (
                    <fieldset key={index} className="grid gap-3 rounded-md border p-3">
                      <legend className="px-1 text-sm font-medium">Imagem {index + 1}</legend>
                      {asset ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={asset.imageUrl}
                            alt=""
                            className="size-20 rounded border object-contain"
                          />
                          <span className="text-sm">{asset.filename}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {image.mediaAssetId
                            ? "Mídia não encontrada nesta loja."
                            : "Nenhuma imagem selecionada."}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() =>
                          setMediaTarget({ sectionId: section.id, galleryIndex: index })
                        }
                      >
                        <ImagePlus aria-hidden="true" /> Selecionar imagem
                      </Button>
                      <Label>
                        Texto alternativo
                        <Input
                          value={image.alt}
                          disabled={!canManage}
                          onChange={(event) => {
                            const images = [...section.images];
                            images[index] = { ...image, alt: event.target.value };
                            replaceSection(section.id, { images });
                          }}
                        />
                      </Label>
                      <Label>
                        Legenda (opcional)
                        <Input
                          value={image.caption ?? ""}
                          disabled={!canManage}
                          onChange={(event) => {
                            const images = [...section.images];
                            const caption = event.target.value;
                            if (caption) images[index] = { ...image, caption };
                            else {
                              const { caption: _caption, ...imageWithoutCaption } = image;
                              images[index] = imageWithoutCaption;
                            }
                            replaceSection(section.id, { images });
                          }}
                        />
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`Mover imagem ${index + 1} para cima`}
                          disabled={!canManage || index === 0}
                          onClick={() => {
                            const images = [...section.images];
                            [images[index - 1], images[index]] = [
                              images[index]!,
                              images[index - 1]!,
                            ];
                            replaceSection(section.id, { images });
                          }}
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`Mover imagem ${index + 1} para baixo`}
                          disabled={!canManage || index === section.images.length - 1}
                          onClick={() => {
                            const images = [...section.images];
                            [images[index], images[index + 1]] = [
                              images[index + 1]!,
                              images[index]!,
                            ];
                            replaceSection(section.id, { images });
                          }}
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() =>
                            replaceSection(section.id, {
                              images: section.images.filter((_, itemIndex) => itemIndex !== index),
                            })
                          }
                        >
                          <Trash2 aria-hidden="true" /> Remover
                        </Button>
                      </div>
                    </fieldset>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canManage || section.images.length >= 100}
                  onClick={() =>
                    replaceSection(section.id, {
                      images: [...section.images, { mediaAssetId: "", alt: "" }],
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Adicionar imagem
                </Button>
              </div>
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
    })();

    return (
      <div className="grid gap-4">
        <fieldset className="grid gap-3 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Layout da seção</legend>
          {sectionBackgroundField}
          {sectionLayoutControls}
        </fieldset>
        {content}
      </div>
    );
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
                {canManage ? (
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
                ) : null}
                {canManage ? (
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
                ) : null}
                {canManage ? (
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
                ) : null}
              </div>
            </div>
            <AccordionContent className="grid gap-4 pt-2">
              <fieldset disabled={!canManage} className="contents">
                {sectionEditor(section)}
              </fieldset>
              {sectionErrors[section.id] ? (
                <p className="text-sm text-destructive" role="alert">
                  {sectionErrors[section.id]}
                </p>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {canManage ? (
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
      ) : null}
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
                  if (mediaTarget) {
                    const target = sections.find((section) => section.id === mediaTarget.sectionId);
                    if (target?.type === "partner-brands" && mediaTarget.brandIndex !== undefined) {
                      const brands = [...target.brands];
                      const brand = brands[mediaTarget.brandIndex];
                      if (brand) {
                        brands[mediaTarget.brandIndex] = {
                          ...brand,
                          logoMediaAssetId: asset.id,
                          logoAlt: asset.alt?.trim() ?? "",
                        };
                        replaceSection(target.id, { brands });
                      }
                    } else if (
                      target?.type === "editorial-gallery" &&
                      mediaTarget.galleryIndex !== undefined
                    ) {
                      const images = [...target.images];
                      const image = images[mediaTarget.galleryIndex];
                      if (image) {
                        images[mediaTarget.galleryIndex] = {
                          ...image,
                          mediaAssetId: asset.id,
                          alt: asset.alt?.trim() ?? "",
                        };
                        replaceSection(target.id, { images });
                      }
                    } else {
                      replaceSection(
                        mediaTarget.sectionId,
                        target?.type === "image-text"
                          ? { imageMediaAssetId: asset.id, imageAlt: asset.alt ?? "" }
                          : { imageMediaAssetId: asset.id },
                      );
                    }
                  }
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
