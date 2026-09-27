-- Stage 9B: store-scoped CMS pages and single-level navigation.
CREATE TYPE public.page_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  status public.page_status NOT NULL DEFAULT 'draft',
  seo_title text,
  seo_description text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pages_title_not_blank CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  CONSTRAINT pages_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT pages_seo_title_length CHECK (seo_title IS NULL OR length(seo_title) <= 160),
  CONSTRAINT pages_seo_description_length CHECK (seo_description IS NULL OR length(seo_description) <= 320),
  CONSTRAINT pages_sections_is_array CHECK (jsonb_typeof(sections) = 'array'),
  CONSTRAINT pages_store_slug_unique UNIQUE (store_id, slug),
  CONSTRAINT pages_id_store_unique UNIQUE (id, store_id)
);

CREATE TABLE public.navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  label text NOT NULL,
  page_id uuid,
  external_url text,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT navigation_items_label_not_blank CHECK (length(btrim(label)) BETWEEN 1 AND 120),
  CONSTRAINT navigation_items_position_nonnegative CHECK (position >= 0),
  CONSTRAINT navigation_items_exactly_one_destination CHECK (
    (page_id IS NOT NULL AND external_url IS NULL) OR (page_id IS NULL AND external_url IS NOT NULL)
  ),
  CONSTRAINT navigation_items_external_url_format CHECK (
    external_url IS NULL OR external_url ~ '^https?://[^[:space:]]+$'
  ),
  CONSTRAINT navigation_items_page_same_store FOREIGN KEY (page_id, store_id)
    REFERENCES public.pages(id, store_id) ON DELETE CASCADE
);
CREATE INDEX navigation_items_store_position_idx ON public.navigation_items (store_id, position, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages, public.navigation_items TO authenticated;
GRANT ALL ON public.pages, public.navigation_items TO service_role;
REVOKE ALL ON public.pages, public.navigation_items FROM PUBLIC, anon;

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage permitted pages" ON public.pages FOR ALL TO authenticated
  USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));
CREATE POLICY "Users can manage permitted navigation items" ON public.navigation_items FOR ALL TO authenticated
  USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));

CREATE TRIGGER pages_set_updated_at BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER navigation_items_set_updated_at BEFORE UPDATE ON public.navigation_items
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
