CREATE TABLE public.store_settings (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  display_name text CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 120),
  short_description text CHECK (short_description IS NULL OR length(short_description) <= 280),
  logo_url text CHECK (logo_url IS NULL OR (length(logo_url) <= 2048 AND logo_url ~* '^https?://[^[:space:]]+$')),
  favicon_url text CHECK (favicon_url IS NULL OR (length(favicon_url) <= 2048 AND favicon_url ~* '^https?://[^[:space:]]+$')),
  phone text CHECK (phone IS NULL OR length(phone) <= 40),
  whatsapp text CHECK (whatsapp IS NULL OR length(whatsapp) <= 40),
  contact_email text CHECK (contact_email IS NULL OR (length(contact_email) <= 254 AND contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  address jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(address) = 'object'),
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(business_hours) = 'object'),
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(social_links) = 'object'),
  institutional_text text CHECK (institutional_text IS NULL OR length(institutional_text) <= 20000),
  privacy_policy text CHECK (privacy_policy IS NULL OR length(privacy_policy) <= 30000),
  return_policy text CHECK (return_policy IS NULL OR length(return_policy) <= 30000),
  terms_of_use text CHECK (terms_of_use IS NULL OR length(terms_of_use) <= 30000),
  primary_color text CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text CHECK (text_color IS NULL OR text_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text CHECK (background_color IS NULL OR background_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read permitted store settings"
ON public.store_settings
FOR SELECT
TO authenticated
USING (private.has_store_access(store_id));

CREATE POLICY "Users can create permitted store settings"
ON public.store_settings
FOR INSERT
TO authenticated
WITH CHECK (private.has_store_access(store_id));

CREATE POLICY "Users can update permitted store settings"
ON public.store_settings
FOR UPDATE
TO authenticated
USING (private.has_store_access(store_id))
WITH CHECK (private.has_store_access(store_id));

CREATE POLICY "Users can delete permitted store settings"
ON public.store_settings
FOR DELETE
TO authenticated
USING (private.has_store_access(store_id));