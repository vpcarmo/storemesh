import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoreSettings } from "@/domain/store-settings";
import type { Database, Tables } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type StoreSettingsRow = Tables<"store_settings">;

function toDomain(row: StoreSettingsRow): StoreSettings {
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

export async function saveStoreDisplayName(
  client: AppClient,
  storeId: string,
  displayName: string | null,
): Promise<StoreSettings> {
  const { data, error } = await client
    .from("store_settings")
    .upsert(
      { store_id: storeId, display_name: displayName, updated_at: new Date().toISOString() },
      { onConflict: "store_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return toDomain(data);
}