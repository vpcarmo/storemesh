import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuthorizedStore } from "@/auth/authorized-store";
import { resolveMediaReferences } from "@/data/media.repository";
import { readStoreSettings, saveStoreSettings } from "@/data/store-settings.repository";
import { readPublishedFooterPages } from "@/data/website.repository";
import { StorefrontDesignSettingsSchema } from "@/domain/storefront-design.schema";
import { normalizeDisplayName } from "@/domain/store-settings";
import { isValidHttpUrl, isValidStorefrontHexColor } from "@/domain/storefront-theme";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const storeSelectionInput = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .optional(),
});

const optionalText = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .transform((value) => value.trim() || null);

const optionalContactText = (maxLength: number) =>
  z
    .string()
    .transform((value) => value.trim() || null)
    .refine(
      (value) => value === null || value.length <= maxLength,
      `Use no máximo ${maxLength} caracteres.`,
    );

const optionalFormattedAddress = z
  .string()
  .max(280, "Use no máximo 280 caracteres.")
  .transform((value) => value.trim() || null);

const optionalContactEmail = z
  .string()
  .transform((value) => value.trim() || null)
  .refine(
    (value) => value === null || (value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)),
    "Informe um e-mail válido com até 254 caracteres.",
  );

const optionalHttpUrl = z
  .string()
  .max(2048)
  .transform((value) => value.trim() || null)
  .refine((value) => value === null || isValidHttpUrl(value), "Informe uma URL HTTP(S) válida.");

const optionalHexColor = z
  .string()
  .transform((value) => value.trim() || null)
  .refine(
    (value) => value === null || isValidStorefrontHexColor(value),
    "Use uma cor hexadecimal no formato #RRGGBB.",
  );

const socialLinksInput = z
  .array(
    z.object({
      label: z
        .string()
        .trim()
        .min(1, "Informe o nome da rede social.")
        .max(60)
        .regex(/^[^<>\r\n]+$/, "Use um rótulo de texto simples."),
      url: z.string().trim().max(2048).refine(isValidHttpUrl, "Informe uma URL HTTP(S) válida."),
    }),
  )
  .superRefine((links, context) => {
    const labels = new Set<string>();
    for (const [index, link] of links.entries()) {
      const normalized = link.label.toLowerCase();
      if (labels.has(normalized)) {
        context.addIssue({
          code: "custom",
          message: "Os nomes das redes sociais não podem se repetir.",
          path: [index, "label"],
        });
      }
      labels.add(normalized);
    }
  });

const updateStoreSettingsInput = storeSelectionInput.extend({
  displayName: z.string().max(120),
  shortDescription: optionalText(280),
  contactEmail: optionalContactEmail,
  phone: optionalContactText(40),
  whatsapp: optionalContactText(40),
  addressFormatted: optionalFormattedAddress,
  logoUrl: optionalHttpUrl,
  faviconUrl: optionalHttpUrl,
  primaryColor: optionalHexColor,
  secondaryColor: optionalHexColor,
  textColor: optionalHexColor,
  backgroundColor: optionalHexColor,
  socialLinks: socialLinksInput,
  designSettings: StorefrontDesignSettingsSchema,
});

function emailFromClaims(claims: Record<string, unknown>): string | null {
  return typeof claims["email"] === "string" ? claims["email"] : null;
}

export const getCurrentStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => storeSelectionInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const store = await requireAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      "settings.view",
      data.slug,
    );

    const [settings, footerPages] = await Promise.all([
      readStoreSettings(context.supabase, store.id),
      readPublishedFooterPages(context.supabase, store.id),
    ]);
    return { store, settings, footerPages };
  });

export const updateCurrentStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => updateStoreSettingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const store = await requireAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      "settings.manage",
      data.slug,
    );

    const selectedPageIds = [
      ...new Set([
        ...data.designSettings.footer.helpPages,
        ...data.designSettings.footer.institutionalPages,
      ]),
    ];
    const selectedPages = await readPublishedFooterPages(
      context.supabase,
      store.id,
      selectedPageIds,
    );
    if (new Set(selectedPages.map((page) => page.id)).size !== selectedPageIds.length) {
      throw new Error("Selecione somente páginas publicadas da loja autorizada.");
    }

    if (
      data.designSettings.background.type === "image" &&
      data.designSettings.background.mediaAssetId
    ) {
      const media = await resolveMediaReferences(context.supabase, store.id, [
        data.designSettings.background.mediaAssetId,
      ]);
      if (!media.has(data.designSettings.background.mediaAssetId)) {
        throw new Error("A imagem de fundo não pertence à loja autorizada.");
      }
    }

    return saveStoreSettings(context.supabase, store.id, {
      displayName: normalizeDisplayName(data.displayName),
      shortDescription: data.shortDescription,
      contactEmail: data.contactEmail,
      phone: data.phone,
      whatsapp: data.whatsapp,
      addressFormatted: data.addressFormatted,
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      textColor: data.textColor,
      backgroundColor: data.backgroundColor,
      socialLinks: Object.fromEntries(data.socialLinks.map(({ label, url }) => [label, url])),
      designSettings: data.designSettings,
    });
  });
