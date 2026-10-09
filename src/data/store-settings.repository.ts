import type { SupabaseClient } from "@supabase/supabase-js";

import type { PublicStorefrontSettings, StoreSettings } from "@/domain/store-settings";
import {
  DEFAULT_STOREFRONT_DESIGN_SETTINGS,
  parseStorefrontDesignSettings,
  type StorefrontDesignSettings,
} from "@/domain/storefront-design.schema";
import type { Database, Json, Tables } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type StoreSettingsRow = Tables<"store_settings">;
type StoreSettingsTable = Database["public"]["Tables"]["store_settings"];
// Keep the new column typed locally until the generated Supabase schema is refreshed.
type DesignSettingsDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<Database["public"]["Tables"], "store_settings"> & {
      store_settings: Omit<StoreSettingsTable, "Row" | "Insert" | "Update"> & {
        Row: StoreSettingsTable["Row"] & { design_settings: Json | null };
        Insert: StoreSettingsTable["Insert"] & { design_settings?: Json | null };
        Update: StoreSettingsTable["Update"] & { design_settings?: Json | null };
      };
    };
  };
};

function designSettingsJson(settings: StoreSettings["designSettings"]): Json {
  const background =
    settings.background.type === "solid"
      ? { type: "solid" }
      : settings.background.type === "gradient"
        ? {
            type: "gradient",
            startColor: settings.background.startColor,
            endColor: settings.background.endColor,
            direction: settings.background.direction,
          }
        : {
            type: "image",
            mediaAssetId: settings.background.mediaAssetId,
            position: settings.background.position,
            size: settings.background.size,
            overlay: settings.background.overlay,
          };
  return {
    typographyPreset: settings.typographyPreset,
    ...(settings.titleFontFamily ? { titleFontFamily: settings.titleFontFamily } : {}),
    ...(settings.bodyFontFamily ? { bodyFontFamily: settings.bodyFontFamily } : {}),
    ...(settings.titleFontScale ? { titleFontScale: settings.titleFontScale } : {}),
    ...(settings.bodyFontScale ? { bodyFontScale: settings.bodyFontScale } : {}),
    ...(settings.titleLineHeight ? { titleLineHeight: settings.titleLineHeight } : {}),
    ...(settings.bodyLineHeight ? { bodyLineHeight: settings.bodyLineHeight } : {}),
    ...(settings.titleLetterSpacing ? { titleLetterSpacing: settings.titleLetterSpacing } : {}),
    ...(settings.bodyLetterSpacing ? { bodyLetterSpacing: settings.bodyLetterSpacing } : {}),
    ...(settings.titleFontWeight ? { titleFontWeight: settings.titleFontWeight } : {}),
    ...(settings.bodyFontWeight ? { bodyFontWeight: settings.bodyFontWeight } : {}),
    density: settings.density,
    radius: settings.radius,
    shadow: settings.shadow,
    container: settings.container,
    ...(settings.linkColor ? { linkColor: settings.linkColor } : {}),
    ...(settings.mutedTextColor ? { mutedTextColor: settings.mutedTextColor } : {}),
    ...(settings.surfaceColor ? { surfaceColor: settings.surfaceColor } : {}),
    ...(settings.sectionBackgroundColor
      ? { sectionBackgroundColor: settings.sectionBackgroundColor }
      : {}),
    background,
    header: settings.header,
    footer: settings.footer,
  };
}

function toDomain(row: StoreSettingsRow): StoreSettings {
  const designSettings = "design_settings" in row ? row.design_settings : null;
  return {
    storeId: row.store_id,
    displayName: row.display_name,
    shortDescription: row.short_description,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    phone: row.phone,
    whatsapp: row.whatsapp,
    contactEmail: row.contact_email,
    address: row.address,
    businessHours: row.business_hours,
    socialLinks: row.social_links,
    institutionalText: row.institutional_text,
    privacyPolicy: row.privacy_policy,
    returnPolicy: row.return_policy,
    termsOfUse: row.terms_of_use,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    textColor: row.text_color,
    backgroundColor: row.background_color,
    designSettings: parseStorefrontDesignSettings(designSettings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function readStoreSettings(
  client: AppClient,
  storeId: string,
): Promise<StoreSettings | null> {
  const { data, error } = await client
    .from("store_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) throw error;
  return data ? toDomain(data) : null;
}

export async function readPublicStorefrontSettings(
  client: AppClient,
  storeId: string,
): Promise<PublicStorefrontSettings | null> {
  const publicClient = client as SupabaseClient<DesignSettingsDatabase>;
  const { data, error } = await publicClient
    .from("store_settings")
    .select(
      "display_name, short_description, logo_url, favicon_url, phone, whatsapp, contact_email, address, social_links, primary_color, secondary_color, accent_color, text_color, background_color, design_settings",
    )
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    displayName: data.display_name,
    shortDescription: data.short_description,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    phone: data.phone,
    whatsapp: data.whatsapp,
    contactEmail: data.contact_email,
    address: data.address,
    socialLinks: data.social_links,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    accentColor: data.accent_color,
    textColor: data.text_color,
    backgroundColor: data.background_color,
    designSettings: parseStorefrontDesignSettings(data.design_settings),
  };
}

export interface StoreSettingsUpdate {
  displayName: string | null;
  shortDescription: string | null;
  contactEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressFormatted: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  textColor: string | null;
  backgroundColor: string | null;
  socialLinks: Json;
  designSettings: StoreSettings["designSettings"];
}

function addressWithFormatted(
  address: StoreSettings["address"],
  formatted: string | null,
): StoreSettings["address"] {
  const existingAddress =
    address !== null && typeof address === "object" && !Array.isArray(address) ? address : {};
  const nextAddress: Record<string, Json | undefined> = { ...existingAddress };

  if (formatted) nextAddress["formatted"] = formatted;
  else delete nextAddress["formatted"];

  return nextAddress;
}

export async function saveStoreSettings(
  client: AppClient,
  storeId: string,
  settings: StoreSettingsUpdate,
): Promise<StoreSettings> {
  const { data: currentSettings, error: readError } = await client
    .from("store_settings")
    .select("address")
    .eq("store_id", storeId)
    .maybeSingle();

  if (readError) throw readError;

  const values: StoreSettingsTable["Insert"] & {
    design_settings: Json;
  } = {
    store_id: storeId,
    display_name: settings.displayName,
    short_description: settings.shortDescription,
    contact_email: settings.contactEmail,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    address: addressWithFormatted(currentSettings?.address ?? null, settings.addressFormatted),
    logo_url: settings.logoUrl,
    favicon_url: settings.faviconUrl,
    primary_color: settings.primaryColor,
    secondary_color: settings.secondaryColor,
    accent_color: settings.accentColor,
    text_color: settings.textColor,
    background_color: settings.backgroundColor,
    social_links: settings.socialLinks,
    design_settings: designSettingsJson(settings.designSettings),
  };
  const designSettingsClient = client as SupabaseClient<DesignSettingsDatabase>;
  const { data, error } = await designSettingsClient
    .from("store_settings")
    .upsert(values, { onConflict: "store_id" })
    .select("*")
    .single();

  if (error) throw error;
  return toDomain(data);
}

export async function updateStoreFooterNavigation(
  client: AppClient,
  storeId: string,
  footerNavigation: Pick<StorefrontDesignSettings["footer"], "helpPages" | "institutionalPages">,
): Promise<StoreSettings> {
  const designSettingsClient = client as SupabaseClient<DesignSettingsDatabase>;
  const { data: current, error: readError } = await designSettingsClient
    .from("store_settings")
    .select("design_settings")
    .eq("store_id", storeId)
    .maybeSingle();

  if (readError) throw readError;

  const currentDesignSettings = parseStorefrontDesignSettings(
    current?.design_settings ?? DEFAULT_STOREFRONT_DESIGN_SETTINGS,
  );
  const designSettings = {
    ...currentDesignSettings,
    footer: {
      ...currentDesignSettings.footer,
      ...footerNavigation,
    },
  };

  const { data, error } = current
    ? await designSettingsClient
        .from("store_settings")
        .update({ design_settings: designSettingsJson(designSettings) })
        .eq("store_id", storeId)
        .select("*")
        .single()
    : await designSettingsClient
        .from("store_settings")
        .upsert(
          { store_id: storeId, design_settings: designSettingsJson(designSettings) },
          { onConflict: "store_id" },
        )
        .select("*")
        .single();

  if (error) throw error;
  return toDomain(data);
}
