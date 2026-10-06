import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoreSettings } from "@/domain/store-settings";
import { parseStorefrontDesignSettings } from "@/domain/storefront-design.schema";
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
    density: settings.density,
    radius: settings.radius,
    shadow: settings.shadow,
    container: settings.container,
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

export interface StoreSettingsUpdate {
  displayName: string | null;
  shortDescription: string | null;
  contactEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  textColor: string | null;
  backgroundColor: string | null;
  designSettings: StoreSettings["designSettings"];
}

export async function saveStoreSettings(
  client: AppClient,
  storeId: string,
  settings: StoreSettingsUpdate,
): Promise<StoreSettings> {
  const values: StoreSettingsTable["Insert"] & {
    design_settings: Json;
  } = {
    store_id: storeId,
    display_name: settings.displayName,
    short_description: settings.shortDescription,
    contact_email: settings.contactEmail,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    logo_url: settings.logoUrl,
    favicon_url: settings.faviconUrl,
    primary_color: settings.primaryColor,
    secondary_color: settings.secondaryColor,
    text_color: settings.textColor,
    background_color: settings.backgroundColor,
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
