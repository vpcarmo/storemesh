import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveAuthorizedStore } from "@/auth/authorized-store";
import { resolveMediaReferences } from "@/data/media.repository";
import { readStoreSettings, saveStoreSettings } from "@/data/store-settings.repository";
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
  designSettings: StorefrontDesignSettingsSchema,
});

function emailFromClaims(claims: Record<string, unknown>): string | null {
  return typeof claims["email"] === "string" ? claims["email"] : null;
}

export const getCurrentStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => storeSelectionInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const store = await resolveAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      data.slug,
    );

    if (!store) return { store: null, settings: null };

    return {
      store,
      settings: await readStoreSettings(context.supabase, store.id),
    };
  });

export const updateCurrentStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => updateStoreSettingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const store = await resolveAuthorizedStore(
      context.supabase,
      context.userId,
      emailFromClaims(context.claims),
      data.slug,
    );

    if (!store) throw new Error("Nenhuma loja autorizada foi selecionada.");

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
      designSettings: data.designSettings,
    });
  });
