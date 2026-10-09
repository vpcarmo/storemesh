import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import {
  getCurrentStoreSettings,
  updateCurrentStoreSettings,
} from "@/auth/store-settings.functions";
import { getCurrentStoreMedia } from "@/auth/media.functions";
import { useAdminStore } from "@/components/admin/admin-store-context";
import { AdminReadOnlyNotice } from "@/components/admin/admin-read-only-notice";
import { FormHelp } from "@/components/admin/form-help";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { StoreSettings } from "@/domain/store-settings";
import type { StorefrontFooterPage } from "@/domain/storefront-footer";
import {
  DEFAULT_STOREFRONT_DESIGN_SETTINGS,
  type StorefrontDesignSettings,
} from "@/domain/storefront-design.schema";
import { hideBrokenImage } from "@/lib/image";
import {
  DEFAULT_STOREFRONT_COLORS,
  isValidHttpUrl,
  isValidStorefrontHexColor,
} from "@/domain/storefront-theme";

const settingsQueryKey = ["store", "current", "settings"] as const;
const storefrontQueryKey = ["store", "current", "storefront-foundation"] as const;

type SettingsForm = {
  displayName: string;
  shortDescription: string;
  contactEmail: string;
  phone: string;
  whatsapp: string;
  addressFormatted: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  mutedTextColor: string;
  socialLinks: SocialLinkForm[];
  designSettings: StorefrontDesignSettings;
};

type SocialLinkForm = { label: string; url: string };
type SettingsField = keyof SettingsForm;
type FormErrors = Partial<Record<SettingsField, string>>;
type GradientBackground = Extract<StorefrontDesignSettings["background"], { type: "gradient" }>;
type ImageBackground = Extract<StorefrontDesignSettings["background"], { type: "image" }>;
type HeaderSettings = StorefrontDesignSettings["header"];
type FooterSettings = StorefrontDesignSettings["footer"];

const colorFields = [
  {
    name: "primaryColor",
    label: "Cor primária",
    defaultValue: DEFAULT_STOREFRONT_COLORS.primary,
    help: "Usada nos principais elementos da vitrine.",
  },
  {
    name: "secondaryColor",
    label: "Cor secundária",
    defaultValue: DEFAULT_STOREFRONT_COLORS.secondary,
    help: "Usada em áreas e elementos de apoio.",
  },
  {
    name: "accentColor",
    label: "Cor de destaque",
    help: "Usada apenas no botão CTA. Se ficar vazia, usa a cor primária.",
  },
  {
    name: "textColor",
    label: "Cor do texto",
    defaultValue: DEFAULT_STOREFRONT_COLORS.text,
    help: "Cor padrão dos textos da vitrine.",
  },
  {
    name: "mutedTextColor",
    label: "Cor do texto secundário",
    defaultValue: DEFAULT_STOREFRONT_COLORS.text,
    emptyValueLabel: "Automático",
    placeholder: "Automático",
    help: "Quando vazia, mantém o tom atual derivado da cor do texto.",
  },
  {
    name: "backgroundColor",
    label: "Cor do fundo",
    defaultValue: DEFAULT_STOREFRONT_COLORS.background,
    help: "Cor de fundo principal da vitrine.",
  },
] as const;

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível salvar as configurações.";
}

function socialLinksFromSettings(value: StoreSettings["socialLinks"]): SocialLinkForm[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([label, url]) =>
    typeof url === "string" ? [{ label, url }] : [],
  );
}

function formFromSettings(settings: StoreSettings | null): SettingsForm {
  return {
    displayName: settings?.displayName ?? "",
    shortDescription: settings?.shortDescription ?? "",
    contactEmail: settings?.contactEmail ?? "",
    phone: settings?.phone ?? "",
    whatsapp: settings?.whatsapp ?? "",
    addressFormatted:
      settings?.address && typeof settings.address === "object" && !Array.isArray(settings.address)
        ? typeof settings.address["formatted"] === "string"
          ? settings.address["formatted"]
          : ""
        : "",
    logoUrl: settings?.logoUrl ?? "",
    faviconUrl: settings?.faviconUrl ?? "",
    primaryColor: settings?.primaryColor ?? "",
    secondaryColor: settings?.secondaryColor ?? "",
    accentColor: settings?.accentColor ?? "",
    textColor: settings?.textColor ?? "",
    backgroundColor: settings?.backgroundColor ?? "",
    mutedTextColor: settings?.designSettings.mutedTextColor ?? "",
    socialLinks: socialLinksFromSettings(settings?.socialLinks ?? null),
    designSettings: settings?.designSettings ?? DEFAULT_STOREFRONT_DESIGN_SETTINGS,
  };
}

function validateForm(form: SettingsForm): FormErrors {
  const errors: FormErrors = {};
  if (form.displayName.length > 120) errors.displayName = "Use no máximo 120 caracteres.";
  if (form.shortDescription.length > 280) {
    errors.shortDescription = "Use no máximo 280 caracteres.";
  }
  const contactEmail = form.contactEmail.trim();
  if (contactEmail.length > 254) {
    errors.contactEmail = "Use no máximo 254 caracteres.";
  } else if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    errors.contactEmail = "Informe um e-mail válido.";
  }
  if (form.phone.trim().length > 40) errors.phone = "Use no máximo 40 caracteres.";
  if (form.whatsapp.trim().length > 40) errors.whatsapp = "Use no máximo 40 caracteres.";
  if (form.addressFormatted.length > 280) {
    errors.addressFormatted = "Use no máximo 280 caracteres.";
  }

  for (const [name, value] of [
    ["logoUrl", form.logoUrl],
    ["faviconUrl", form.faviconUrl],
  ] as const) {
    if (value.length > 2048) errors[name] = "Use no máximo 2048 caracteres.";
    else if (value.trim() && !isValidHttpUrl(value.trim())) {
      errors[name] = "Informe uma URL HTTP(S) válida.";
    }
  }

  for (const color of colorFields) {
    const value = form[color.name].trim();
    if (value && !isValidStorefrontHexColor(value)) {
      errors[color.name] = "Use o formato hexadecimal #RRGGBB.";
    }
  }

  const labels = new Set<string>();
  for (const [index, link] of form.socialLinks.entries()) {
    const label = link.label.trim();
    const url = link.url.trim();
    if (!label) errors.socialLinks = "Informe o nome de todas as redes sociais.";
    else if (label.length > 60 || /[<>\r\n]/.test(label)) {
      errors.socialLinks = "Use rótulos de texto simples com até 60 caracteres.";
    } else if (labels.has(label.toLowerCase())) {
      errors.socialLinks = "Os nomes das redes sociais não podem se repetir.";
    }
    labels.add(label.toLowerCase());
    if (!url || url.length > 2048 || !isValidHttpUrl(url)) {
      errors.socialLinks = `Informe uma URL HTTP(S) válida para a rede ${index + 1}.`;
    }
  }

  return errors;
}

function FooterPageGroup({
  idPrefix,
  title,
  pages,
  selectedIds,
  onChange,
  disabled,
}: {
  idPrefix: string;
  title: string;
  pages: StorefrontFooterPage[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  function movePage(index: number, offset: -1 | 1) {
    if (disabled) return;
    const next = [...selectedIds];
    const target = index + offset;
    const movedPage = next[index];
    if (!movedPage) return;
    next.splice(index, 1);
    next.splice(target, 0, movedPage);
    onChange(next);
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">{title}</legend>
      {pages.length ? (
        <div className="grid gap-2">
          {pages.map((page) => {
            const id = `${idPrefix}-${page.id}`;
            return (
              <label key={page.id} htmlFor={id} className="flex items-center gap-2 text-sm">
                <input
                  id={id}
                  type="checkbox"
                  disabled={disabled}
                  checked={selectedIds.includes(page.id)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selectedIds, page.id]
                        : selectedIds.filter((selectedId) => selectedId !== page.id),
                    )
                  }
                />
                {page.title}
              </label>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Não há páginas publicadas nesta loja.</p>
      )}
      {selectedIds.length ? (
        <ol className="grid gap-2">
          {selectedIds.map((pageId, index) => {
            const page = pages.find(({ id }) => id === pageId);
            if (!page) {
              return (
                <li
                  key={pageId}
                  className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
                >
                  <span>Página indisponível</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() =>
                      onChange(selectedIds.filter((selectedId) => selectedId !== pageId))
                    }
                  >
                    Remover referência
                  </Button>
                </li>
              );
            }
            return (
              <li key={pageId} className="flex items-center justify-between gap-3 text-sm">
                <span>{page.title}</span>
                <span className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Mover ${page.title} para cima em ${title}`}
                    disabled={disabled || index === 0}
                    onClick={() => movePage(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Mover ${page.title} para baixo em ${title}`}
                    disabled={disabled || index === selectedIds.length - 1}
                    onClick={() => movePage(index, 1)}
                  >
                    ↓
                  </Button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      <FormHelp>A ordem desta lista define a ordem visual dos links no Footer.</FormHelp>
    </fieldset>
  );
}

function effectiveColor(value: string, defaultValue: string): string {
  const normalized = value.trim();
  return isValidStorefrontHexColor(normalized) ? normalized : defaultValue;
}

function brightness(hexColor: string): number {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000;
}

function ColorField({
  name,
  label,
  defaultValue,
  help,
  value,
  error,
  onChange,
  onRestore,
  disabled,
  emptyValueLabel = `${defaultValue} (padrão)`,
  placeholder = defaultValue,
}: {
  name: SettingsField;
  label: string;
  defaultValue: string;
  emptyValueLabel?: string;
  placeholder?: string;
  help: string;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
  onRestore: () => void;
  disabled: boolean;
}) {
  const id = `store-setting-${name}`;
  const colorPickerValue = effectiveColor(value, defaultValue);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label={`Seletor visual: ${label}`}
          className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
          type="color"
          disabled={disabled}
          value={colorPickerValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <Input
          id={id}
          className="w-32 uppercase"
          disabled={disabled}
          value={value}
          maxLength={7}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <span
          className="size-8 rounded border border-border"
          style={{ backgroundColor: colorPickerValue }}
          aria-label={`Amostra de ${label}: ${colorPickerValue}`}
          title={colorPickerValue}
        />
        <span className="text-xs text-muted-foreground">
          Atual: {value.trim() || emptyValueLabel}
        </span>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRestore}>
          Restaurar padrão
        </Button>
      </div>
      <FormHelp>{help}</FormHelp>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StoreSettingsPanel({ storeSlug }: { storeSlug?: string | null }) {
  const { hasPermission } = useAdminStore();
  const canManage = hasPermission("settings.manage");
  const queryClient = useQueryClient();
  const loadSettings = useServerFn(getCurrentStoreSettings);
  const saveSettings = useServerFn(updateCurrentStoreSettings);
  const loadMedia = useServerFn(getCurrentStoreMedia);
  const [form, setForm] = useState<SettingsForm>(() => formFromSettings(null));
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const settingsQuery = useQuery({
    queryKey: [...settingsQueryKey, storeSlug],
    queryFn: () => loadSettings({ data: { slug: storeSlug } }),
  });
  const mediaQuery = useQuery({
    queryKey: ["store", "current", "media", storeSlug ?? null],
    queryFn: () => loadMedia({ data: { slug: storeSlug } }),
    enabled: Boolean(settingsQuery.data?.store),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(formFromSettings(settingsQuery.data.settings));
      setErrors({});
    }
  }, [settingsQuery.data]);

  function updateField<K extends SettingsField>(name: K, value: SettingsForm[K]) {
    if (!canManage) return;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFeedback(null);
  }

  function updateDesignSettings(value: StorefrontDesignSettings) {
    if (!canManage) return;
    setForm((current) => ({ ...current, designSettings: value }));
    setFeedback(null);
  }

  function updateHeaderSettings(value: Partial<HeaderSettings>) {
    updateDesignSettings({
      ...form.designSettings,
      header: { ...form.designSettings.header, ...value },
    });
  }

  function updateFooterSettings(value: Partial<FooterSettings>) {
    updateDesignSettings({
      ...form.designSettings,
      footer: { ...form.designSettings.footer, ...value },
    });
  }

  function updateGradientBackground(
    update: (background: GradientBackground) => GradientBackground,
  ) {
    const background = form.designSettings.background;
    if (background.type !== "gradient") return;
    updateDesignSettings({ ...form.designSettings, background: update(background) });
  }

  function updateImageBackground(update: (background: ImageBackground) => ImageBackground) {
    const background = form.designSettings.background;
    if (background.type !== "image") return;
    updateDesignSettings({ ...form.designSettings, background: update(background) });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setFeedback(null);
    if (Object.keys(validationErrors).length > 0) return;

    setPending(true);
    try {
      await saveSettings({
        data: {
          slug: storeSlug,
          displayName: form.displayName,
          shortDescription: form.shortDescription,
          contactEmail: form.contactEmail,
          phone: form.phone,
          whatsapp: form.whatsapp,
          addressFormatted: form.addressFormatted.trim(),
          logoUrl: form.logoUrl,
          faviconUrl: form.faviconUrl,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          textColor: form.textColor,
          backgroundColor: form.backgroundColor,
          socialLinks: form.socialLinks,
          designSettings: {
            ...form.designSettings,
            mutedTextColor: form.mutedTextColor.trim() || undefined,
          },
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...settingsQueryKey, storeSlug] }),
        queryClient.invalidateQueries({ queryKey: [...storefrontQueryKey, storeSlug] }),
        queryClient.invalidateQueries({ queryKey: ["admin-page-preview", storeSlug] }),
      ]);
      setFeedback("Configurações salvas.");
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

  const effectiveTextColor = effectiveColor(form.textColor, DEFAULT_STOREFRONT_COLORS.text);
  const effectiveBackgroundColor = effectiveColor(
    form.backgroundColor,
    DEFAULT_STOREFRONT_COLORS.background,
  );
  const lowTextContrast =
    Math.abs(brightness(effectiveTextColor) - brightness(effectiveBackgroundColor)) < 60;
  const selectedBackgroundMediaId =
    form.designSettings.background.type === "image"
      ? form.designSettings.background.mediaAssetId
      : null;
  const selectedBackgroundMedia = mediaQuery.data?.find(
    (asset) => asset.id === selectedBackgroundMediaId,
  );

  return (
    <section className="mt-6 w-full max-w-3xl" aria-label="Configurações da loja">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Configurações da loja</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize a identidade e a aparência da loja selecionada.
        </p>
        <p className="mt-2 text-sm font-medium">{settingsQuery.data.store.name}</p>
      </header>

      <div className="mb-6">
        <AdminReadOnlyNotice permission="settings.manage" />
      </div>

      <form className="grid gap-6" onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Identidade</CardTitle>
            <CardDescription>Informações que identificam a loja na vitrine.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="store-display-name">Nome de exibição</Label>
              <Input
                id="store-display-name"
                disabled={!canManage}
                value={form.displayName}
                onChange={(event) => updateField("displayName", event.target.value)}
                maxLength={120}
                placeholder={settingsQuery.data.store.name}
                aria-invalid={Boolean(errors.displayName)}
              />
              <FormHelp tooltip="Nome público da loja; não muda seu cadastro administrativo.">
                Nome mostrado aos visitantes. Se ficar vazio, usaremos o nome cadastrado da loja.
              </FormHelp>
              {errors.displayName ? (
                <p className="text-sm text-destructive">{errors.displayName}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store-short-description">Descrição curta</Label>
              <Textarea
                id="store-short-description"
                disabled={!canManage}
                value={form.shortDescription}
                onChange={(event) => updateField("shortDescription", event.target.value)}
                maxLength={280}
                placeholder="Peças e acessórios para o dia a dia."
                aria-invalid={Boolean(errors.shortDescription)}
              />
              <div className="flex items-start justify-between gap-3">
                <FormHelp>
                  Resumo breve da loja. Hoje este texto pode aparecer no rodapé e em conteúdos
                  estruturais da vitrine.
                </FormHelp>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {form.shortDescription.length}/280
                </span>
              </div>
              {errors.shortDescription ? (
                <p className="text-sm text-destructive">{errors.shortDescription}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store-logo-url">Logo da loja</Label>
              <Input
                id="store-logo-url"
                disabled={!canManage}
                value={form.logoUrl}
                onChange={(event) => updateField("logoUrl", event.target.value)}
                maxLength={2048}
                placeholder="https://exemplo.com/imagens/logo.png"
                aria-invalid={Boolean(errors.logoUrl)}
              />
              <FormHelp tooltip="Use uma URL pública HTTP(S) de uma imagem.">
                Imagem exibida junto ao nome da loja no cabeçalho da vitrine.
              </FormHelp>
              <p className="text-xs text-muted-foreground">
                Uploads privados da Biblioteca de Mídia ainda não são vinculados diretamente a este
                campo.
              </p>
              {form.logoUrl.trim() && isValidHttpUrl(form.logoUrl.trim()) ? (
                <div className="flex min-h-16 items-center rounded-md border border-border p-3">
                  <img
                    key={form.logoUrl.trim()}
                    src={form.logoUrl.trim()}
                    alt="Prévia do logo da loja"
                    className="max-h-16 max-w-48 object-contain"
                    onError={hideBrokenImage}
                  />
                </div>
              ) : null}
              {errors.logoUrl ? <p className="text-sm text-destructive">{errors.logoUrl}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store-favicon-url">Favicon</Label>
              <Input
                id="store-favicon-url"
                disabled={!canManage}
                value={form.faviconUrl}
                onChange={(event) => updateField("faviconUrl", event.target.value)}
                maxLength={2048}
                placeholder="https://exemplo.com/imagens/favicon.png"
                aria-invalid={Boolean(errors.faviconUrl)}
              />
              <FormHelp tooltip="Use uma URL pública HTTP(S) de um ícone da loja.">
                Ícone exibido na aba do navegador quando o visitante acessa a loja.
              </FormHelp>
              {form.faviconUrl.trim() && isValidHttpUrl(form.faviconUrl.trim()) ? (
                <div className="flex items-center gap-3 rounded-md border border-border p-3">
                  <img
                    src={form.faviconUrl.trim()}
                    alt="Prévia do favicon"
                    className="size-8 object-contain"
                  />
                  <span className="text-xs text-muted-foreground">Prévia do favicon</span>
                </div>
              ) : null}
              {errors.faviconUrl ? (
                <p className="text-sm text-destructive">{errors.faviconUrl}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="store-contact-email">E-mail</Label>
              <Input
                id="store-contact-email"
                disabled={!canManage}
                type="email"
                value={form.contactEmail}
                onChange={(event) => updateField("contactEmail", event.target.value)}
                aria-invalid={Boolean(errors.contactEmail)}
                aria-describedby={errors.contactEmail ? "store-contact-email-error" : undefined}
              />
              <FormHelp>E-mail de contato exibido no rodapé da loja.</FormHelp>
              {errors.contactEmail ? (
                <p id="store-contact-email-error" className="text-sm text-destructive">
                  {errors.contactEmail}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="store-contact-phone">Telefone</Label>
              <Input
                id="store-contact-phone"
                disabled={!canManage}
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "store-contact-phone-error" : undefined}
              />
              <FormHelp>Telefone de contato exibido no rodapé da loja.</FormHelp>
              {errors.phone ? (
                <p id="store-contact-phone-error" className="text-sm text-destructive">
                  {errors.phone}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="store-contact-whatsapp">WhatsApp</Label>
              <Input
                id="store-contact-whatsapp"
                disabled={!canManage}
                value={form.whatsapp}
                onChange={(event) => updateField("whatsapp", event.target.value)}
                aria-invalid={Boolean(errors.whatsapp)}
                aria-describedby={errors.whatsapp ? "store-contact-whatsapp-error" : undefined}
              />
              <FormHelp>Número de WhatsApp exibido no rodapé da loja.</FormHelp>
              {errors.whatsapp ? (
                <p id="store-contact-whatsapp-error" className="text-sm text-destructive">
                  {errors.whatsapp}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="store-contact-address">Endereço</Label>
              <Input
                id="store-contact-address"
                disabled={!canManage}
                value={form.addressFormatted}
                onChange={(event) => updateField("addressFormatted", event.target.value)}
                maxLength={280}
                aria-invalid={Boolean(errors.addressFormatted)}
                aria-describedby={
                  errors.addressFormatted ? "store-contact-address-error" : undefined
                }
              />
              <FormHelp>Endereço exibido no rodapé da loja.</FormHelp>
              {errors.addressFormatted ? (
                <p id="store-contact-address-error" className="text-sm text-destructive">
                  {errors.addressFormatted}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>Personalize as cores usadas no tema da vitrine.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {colorFields
              .filter((color) => color.name !== "backgroundColor")
              .map((color) => (
                <ColorField
                  key={color.name}
                  {...color}
                  defaultValue={
                    color.name === "accentColor"
                      ? effectiveColor(form.primaryColor, DEFAULT_STOREFRONT_COLORS.primary)
                      : color.name === "mutedTextColor"
                        ? effectiveColor(form.textColor, DEFAULT_STOREFRONT_COLORS.text)
                        : color.defaultValue
                  }
                  value={form[color.name]}
                  error={errors[color.name]}
                  disabled={!canManage}
                  onChange={(value) => updateField(color.name, value)}
                  onRestore={() =>
                    updateField(color.name, color.name === "accentColor" ? "" : color.defaultValue)
                  }
                />
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Design da loja</CardTitle>
            <CardDescription>
              Essas opções definem a linguagem visual padrão de toda a loja.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="store-design-typography">Tipografia</Label>
              <select
                id="store-design-typography"
                disabled={!canManage}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.designSettings.typographyPreset}
                onChange={(event) =>
                  updateDesignSettings({
                    ...form.designSettings,
                    typographyPreset: event.target
                      .value as StorefrontDesignSettings["typographyPreset"],
                  })
                }
              >
                <option value="modern">Moderna</option>
                <option value="editorial">Editorial</option>
                <option value="neutral">Neutra</option>
              </select>
              <FormHelp>
                Escolha uma combinação de fontes pré-configurada. Não é necessário configurar CSS ou
                fontes manualmente.
              </FormHelp>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store-design-density">Densidade</Label>
              <select
                id="store-design-density"
                disabled={!canManage}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.designSettings.density}
                onChange={(event) =>
                  updateDesignSettings({
                    ...form.designSettings,
                    density: event.target.value as StorefrontDesignSettings["density"],
                  })
                }
              >
                <option value="compact">Compacta</option>
                <option value="comfortable">Confortável</option>
                <option value="spacious">Espaçosa</option>
              </select>
              <FormHelp>Controla o espaço geral entre conteúdos e seções.</FormHelp>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store-design-radius">Cantos</Label>
              <select
                id="store-design-radius"
                disabled={!canManage}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.designSettings.radius}
                onChange={(event) =>
                  updateDesignSettings({
                    ...form.designSettings,
                    radius: event.target.value as StorefrontDesignSettings["radius"],
                  })
                }
              >
                <option value="sharp">Retos</option>
                <option value="soft">Suaves</option>
                <option value="rounded">Arredondados</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store-design-shadow">Sombras</Label>
              <select
                id="store-design-shadow"
                disabled={!canManage}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.designSettings.shadow}
                onChange={(event) =>
                  updateDesignSettings({
                    ...form.designSettings,
                    shadow: event.target.value as StorefrontDesignSettings["shadow"],
                  })
                }
              >
                <option value="none">Nenhuma</option>
                <option value="subtle">Sutil</option>
                <option value="strong">Forte</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store-design-container">Largura do conteúdo</Label>
              <select
                id="store-design-container"
                disabled={!canManage}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.designSettings.container}
                onChange={(event) =>
                  updateDesignSettings({
                    ...form.designSettings,
                    container: event.target.value as StorefrontDesignSettings["container"],
                  })
                }
              >
                <option value="narrow">Estreita</option>
                <option value="standard">Padrão</option>
                <option value="wide">Ampla</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store-design-background">Fundo</Label>
              <select
                id="store-design-background"
                disabled={!canManage}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.designSettings.background.type}
                onChange={(event) => {
                  const type = event.target.value;
                  if (type === "gradient") {
                    updateDesignSettings({
                      ...form.designSettings,
                      background: {
                        type,
                        startColor: "#24303F",
                        endColor: "#FFFFFF",
                        direction: "bottom-right",
                      },
                    });
                  } else if (type === "image") {
                    updateDesignSettings({
                      ...form.designSettings,
                      background: {
                        type,
                        mediaAssetId: null,
                        position: "center",
                        size: "cover",
                        overlay: "none",
                      },
                    });
                  } else {
                    updateDesignSettings({
                      ...form.designSettings,
                      background: { type: "solid" },
                    });
                  }
                }}
              >
                <option value="solid">Cor</option>
                <option value="gradient">Degradê</option>
                <option value="image">Imagem</option>
              </select>
              <FormHelp>
                Define o fundo global da vitrine. As seções poderão ganhar estilos próprios em uma
                etapa futura.
              </FormHelp>
            </div>

            {form.designSettings.background.type === "solid" ? (
              <>
                <ColorField
                  name="backgroundColor"
                  label="Cor do fundo"
                  defaultValue={DEFAULT_STOREFRONT_COLORS.background}
                  help="Cor de fundo principal da vitrine."
                  value={form.backgroundColor}
                  error={errors.backgroundColor}
                  disabled={!canManage}
                  onChange={(value) => updateField("backgroundColor", value)}
                  onRestore={() =>
                    updateField("backgroundColor", DEFAULT_STOREFRONT_COLORS.background)
                  }
                />
                {lowTextContrast ? (
                  <p className="text-sm text-amber-700" role="status">
                    As cores de texto e fundo estão muito próximas e podem dificultar a leitura.
                  </p>
                ) : null}
              </>
            ) : null}

            {form.designSettings.background.type === "gradient" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="store-design-gradient-start">Cor inicial</Label>
                  <input
                    id="store-design-gradient-start"
                    className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background p-1"
                    type="color"
                    disabled={!canManage}
                    value={form.designSettings.background.startColor}
                    onChange={(event) =>
                      updateGradientBackground((background) => ({
                        ...background,
                        startColor: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="store-design-gradient-end">Cor final</Label>
                  <input
                    id="store-design-gradient-end"
                    className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background p-1"
                    type="color"
                    disabled={!canManage}
                    value={form.designSettings.background.endColor}
                    onChange={(event) =>
                      updateGradientBackground((background) => ({
                        ...background,
                        endColor: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="store-design-gradient-direction">Direção</Label>
                  <select
                    id="store-design-gradient-direction"
                    disabled={!canManage}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.designSettings.background.direction}
                    onChange={(event) =>
                      updateGradientBackground((background) => ({
                        ...background,
                        direction: event.target.value as GradientBackground["direction"],
                      }))
                    }
                  >
                    <option value="right">Direita</option>
                    <option value="bottom">Baixo</option>
                    <option value="bottom-right">Diagonal inferior direita</option>
                    <option value="left">Esquerda</option>
                    <option value="top">Cima</option>
                  </select>
                </div>
              </>
            ) : null}

            {form.designSettings.background.type === "image" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="store-design-background-media">
                    Imagem da Biblioteca de mídia
                  </Label>
                  <select
                    id="store-design-background-media"
                    disabled={!canManage}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.designSettings.background.mediaAssetId ?? ""}
                    onChange={(event) =>
                      updateImageBackground((background) => ({
                        ...background,
                        mediaAssetId: event.target.value || null,
                      }))
                    }
                  >
                    <option value="">Selecione uma imagem</option>
                    {mediaQuery.data?.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.filename}
                      </option>
                    ))}
                  </select>
                  <FormHelp>
                    Use uma imagem da Biblioteca de mídia desta loja. O arquivo não será duplicado.
                  </FormHelp>
                  {mediaQuery.isError ? (
                    <p className="text-sm text-destructive">{messageFrom(mediaQuery.error)}</p>
                  ) : null}
                  {selectedBackgroundMedia ? (
                    <img
                      src={selectedBackgroundMedia.imageUrl}
                      alt={selectedBackgroundMedia.alt ?? ""}
                      className="max-h-48 w-fit rounded-md border object-contain"
                    />
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="store-design-background-position">Posição</Label>
                  <select
                    id="store-design-background-position"
                    disabled={!canManage}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.designSettings.background.position}
                    onChange={(event) =>
                      updateImageBackground((background) => ({
                        ...background,
                        position: event.target.value as ImageBackground["position"],
                      }))
                    }
                  >
                    <option value="center">Centro</option>
                    <option value="top">Topo</option>
                    <option value="bottom">Base</option>
                    <option value="left">Esquerda</option>
                    <option value="right">Direita</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="store-design-background-size">Ajuste</Label>
                  <select
                    id="store-design-background-size"
                    disabled={!canManage}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.designSettings.background.size}
                    onChange={(event) =>
                      updateImageBackground((background) => ({
                        ...background,
                        size: event.target.value as ImageBackground["size"],
                      }))
                    }
                  >
                    <option value="cover">Preencher (cover)</option>
                    <option value="contain">Conter (contain)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="store-design-background-overlay">Sobreposição</Label>
                  <select
                    id="store-design-background-overlay"
                    disabled={!canManage}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.designSettings.background.overlay}
                    onChange={(event) =>
                      updateImageBackground((background) => ({
                        ...background,
                        overlay: event.target.value as ImageBackground["overlay"],
                      }))
                    }
                  >
                    <option value="none">Nenhuma</option>
                    <option value="light">Leve</option>
                    <option value="medium">Média</option>
                    <option value="strong">Forte</option>
                  </select>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Header e Footer</CardTitle>
            <CardDescription>
              Configure a estrutura e o espaçamento do cabeçalho e rodapé da loja.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            <section className="grid gap-5" aria-labelledby="store-header-settings-title">
              <h2 id="store-header-settings-title" className="text-base font-semibold">
                Header
              </h2>
              <div className="grid gap-2">
                <Label htmlFor="store-header-layout">Layout</Label>
                <select
                  id="store-header-layout"
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.designSettings.header.layout}
                  onChange={(event) =>
                    updateHeaderSettings({
                      layout: event.target.value as HeaderSettings["layout"],
                    })
                  }
                >
                  <option value="stacked">Empilhado</option>
                  <option value="inline">Em linha</option>
                </select>
                <FormHelp>Escolha se a navegação fica abaixo da marca ou na mesma linha.</FormHelp>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store-header-navigation-alignment">Alinhamento da navegação</Label>
                <select
                  id="store-header-navigation-alignment"
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.designSettings.header.navigationAlignment}
                  onChange={(event) =>
                    updateHeaderSettings({
                      navigationAlignment: event.target
                        .value as HeaderSettings["navigationAlignment"],
                    })
                  }
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
                <FormHelp>Define o alinhamento dos links da navegação no desktop.</FormHelp>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="store-header-show-name">Exibir nome da loja</Label>
                  <Switch
                    id="store-header-show-name"
                    disabled={!canManage}
                    checked={form.designSettings.header.showStoreName}
                    onCheckedChange={(showStoreName) => updateHeaderSettings({ showStoreName })}
                  />
                </div>
                <FormHelp>
                  Mostra ou oculta o nome ao lado da logo. Sem logo válida, o nome permanece como
                  identificação da loja.
                </FormHelp>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store-header-logo-size">Tamanho da logo</Label>
                <select
                  id="store-header-logo-size"
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.designSettings.header.logoSize}
                  onChange={(event) =>
                    updateHeaderSettings({
                      logoSize: event.target.value as HeaderSettings["logoSize"],
                    })
                  }
                >
                  <option value="small">Pequena</option>
                  <option value="medium">Média</option>
                  <option value="large">Grande</option>
                </select>
                <FormHelp>Define um tamanho predefinido para a logo no cabeçalho.</FormHelp>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store-header-navigation-gap">Espaçamento da navegação</Label>
                <select
                  id="store-header-navigation-gap"
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.designSettings.header.navigationGap}
                  onChange={(event) =>
                    updateHeaderSettings({
                      navigationGap: event.target.value as HeaderSettings["navigationGap"],
                    })
                  }
                >
                  <option value="compact">Compacto</option>
                  <option value="comfortable">Confortável</option>
                  <option value="spacious">Amplo</option>
                </select>
                <FormHelp>Controla a distância entre os links da Navbar.</FormHelp>
              </div>
            </section>

            <section className="grid gap-5" aria-labelledby="store-footer-settings-title">
              <h2 id="store-footer-settings-title" className="text-base font-semibold">
                Footer
              </h2>
              <div className="grid gap-2">
                <Label htmlFor="store-footer-columns">Número de colunas</Label>
                <select
                  id="store-footer-columns"
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.designSettings.footer.columns}
                  onChange={(event) =>
                    updateFooterSettings({
                      columns: event.target.value as FooterSettings["columns"],
                    })
                  }
                >
                  <option value="auto">Automático</option>
                  <option value="1">1 coluna</option>
                  <option value="2">2 colunas</option>
                  <option value="3">3 colunas</option>
                  <option value="4">4 colunas</option>
                </select>
                <FormHelp>
                  Define quantas colunas o rodapé pode usar quando houver conteúdo suficiente.
                </FormHelp>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store-footer-alignment">Alinhamento</Label>
                <select
                  id="store-footer-alignment"
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.designSettings.footer.alignment}
                  onChange={(event) =>
                    updateFooterSettings({
                      alignment: event.target.value as FooterSettings["alignment"],
                    })
                  }
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                </select>
                <FormHelp>Define o alinhamento dos conteúdos do rodapé.</FormHelp>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="store-footer-show-logo">Exibir logo</Label>
                  <Switch
                    id="store-footer-show-logo"
                    disabled={!canManage}
                    checked={form.designSettings.footer.showLogo}
                    onCheckedChange={(showLogo) => updateFooterSettings({ showLogo })}
                  />
                </div>
                <FormHelp>Mostra a logo da loja no rodapé quando configurada.</FormHelp>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="store-footer-show-description">Exibir descrição</Label>
                  <Switch
                    id="store-footer-show-description"
                    disabled={!canManage}
                    checked={form.designSettings.footer.showDescription}
                    onCheckedChange={(showDescription) => updateFooterSettings({ showDescription })}
                  />
                </div>
                <FormHelp>Mostra ou oculta a descrição curta da loja no rodapé.</FormHelp>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store-footer-spacing">Espaçamento</Label>
                <select
                  id="store-footer-spacing"
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.designSettings.footer.spacing}
                  onChange={(event) =>
                    updateFooterSettings({
                      spacing: event.target.value as FooterSettings["spacing"],
                    })
                  }
                >
                  <option value="compact">Compacto</option>
                  <option value="comfortable">Confortável</option>
                  <option value="spacious">Amplo</option>
                </select>
                <FormHelp>Controla o espaço entre os blocos e a área interna do rodapé.</FormHelp>
              </div>
              <FooterPageGroup
                idPrefix="store-footer-help-page"
                title="AJUDA"
                pages={settingsQuery.data.footerPages}
                selectedIds={form.designSettings.footer.helpPages}
                onChange={(helpPages) => updateFooterSettings({ helpPages })}
                disabled={!canManage}
              />
              <FooterPageGroup
                idPrefix="store-footer-institutional-page"
                title="INSTITUCIONAL"
                pages={settingsQuery.data.footerPages}
                selectedIds={form.designSettings.footer.institutionalPages}
                onChange={(institutionalPages) => updateFooterSettings({ institutionalPages })}
                disabled={!canManage}
              />
              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium">SIGA A LOJA</legend>
                {form.socialLinks.map((link, index) => (
                  <div key={index} className="grid gap-2 rounded-md border p-3">
                    <div className="grid gap-2">
                      <Label htmlFor={`store-social-label-${index}`}>Nome/rótulo</Label>
                      <Input
                        id={`store-social-label-${index}`}
                        disabled={!canManage}
                        value={link.label}
                        maxLength={60}
                        onChange={(event) =>
                          updateField(
                            "socialLinks",
                            form.socialLinks.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, label: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`store-social-url-${index}`}>URL</Label>
                      <Input
                        id={`store-social-url-${index}`}
                        disabled={!canManage}
                        type="url"
                        value={link.url}
                        maxLength={2048}
                        placeholder="https://"
                        onChange={(event) =>
                          updateField(
                            "socialLinks",
                            form.socialLinks.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, url: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="justify-self-start"
                      disabled={!canManage}
                      onClick={() =>
                        updateField(
                          "socialLinks",
                          form.socialLinks.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Remover rede social
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="justify-self-start"
                  disabled={!canManage}
                  onClick={() =>
                    updateField("socialLinks", [...form.socialLinks, { label: "", url: "" }])
                  }
                >
                  Adicionar rede social
                </Button>
                {errors.socialLinks ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.socialLinks}
                  </p>
                ) : null}
              </fieldset>
            </section>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!canManage || pending} hidden={!canManage}>
            <Save aria-hidden="true" />
            {pending ? "Salvando…" : "Salvar alterações"}
          </Button>
          {feedback ? (
            <p
              className={`text-sm ${feedback === "Configurações salvas." ? "text-muted-foreground" : "text-destructive"}`}
              role="status"
            >
              {feedback}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
