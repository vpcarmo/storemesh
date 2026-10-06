import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import {
  getCurrentStoreSettings,
  updateCurrentStoreSettings,
} from "@/auth/store-settings.functions";
import { getCurrentStoreMedia } from "@/auth/media.functions";
import { FormHelp } from "@/components/admin/form-help";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoreSettings } from "@/domain/store-settings";
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
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  designSettings: StorefrontDesignSettings;
};

type SettingsField = keyof SettingsForm;
type FormErrors = Partial<Record<SettingsField, string>>;
type GradientBackground = Extract<StorefrontDesignSettings["background"], { type: "gradient" }>;
type ImageBackground = Extract<StorefrontDesignSettings["background"], { type: "image" }>;

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
    name: "textColor",
    label: "Cor do texto",
    defaultValue: DEFAULT_STOREFRONT_COLORS.text,
    help: "Cor padrão dos textos da vitrine.",
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

function formFromSettings(settings: StoreSettings | null): SettingsForm {
  return {
    displayName: settings?.displayName ?? "",
    shortDescription: settings?.shortDescription ?? "",
    contactEmail: settings?.contactEmail ?? "",
    phone: settings?.phone ?? "",
    whatsapp: settings?.whatsapp ?? "",
    logoUrl: settings?.logoUrl ?? "",
    faviconUrl: settings?.faviconUrl ?? "",
    primaryColor: settings?.primaryColor ?? "",
    secondaryColor: settings?.secondaryColor ?? "",
    textColor: settings?.textColor ?? "",
    backgroundColor: settings?.backgroundColor ?? "",
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

  return errors;
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
}: {
  name: SettingsField;
  label: string;
  defaultValue: string;
  help: string;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
  onRestore: () => void;
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
          value={colorPickerValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <Input
          id={id}
          className="w-32 uppercase"
          value={value}
          maxLength={7}
          placeholder={defaultValue}
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
          Atual: {value.trim() || `${defaultValue} (padrão)`}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onRestore}>
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
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFeedback(null);
  }

  function updateDesignSettings(value: StorefrontDesignSettings) {
    setForm((current) => ({ ...current, designSettings: value }));
    setFeedback(null);
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
          logoUrl: form.logoUrl,
          faviconUrl: form.faviconUrl,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          textColor: form.textColor,
          backgroundColor: form.backgroundColor,
          designSettings: form.designSettings,
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
                  value={form[color.name]}
                  error={errors[color.name]}
                  onChange={(value) => updateField(color.name, value)}
                  onRestore={() => updateField(color.name, color.defaultValue)}
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

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
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
