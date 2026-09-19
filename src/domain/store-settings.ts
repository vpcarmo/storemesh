import type { Json } from "@/integrations/supabase/types";

export interface StoreSettings {
  storeId: string;
  displayName: string | null;
  shortDescription: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  contactEmail: string | null;
  address: Json;
  businessHours: Json;
  socialLinks: Json;
  institutionalText: string | null;
  privacyPolicy: string | null;
  returnPolicy: string | null;
  termsOfUse: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  textColor: string | null;
  backgroundColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeDisplayName(value: string): string | null {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}
