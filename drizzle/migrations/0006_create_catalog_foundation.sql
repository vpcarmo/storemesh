CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_length CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT categories_description_length CHECK (description IS NULL OR length(description) <= 2000),
  CONSTRAINT categories_store_slug_unique UNIQUE (store_id, slug),
  CONSTRAINT categories_id_store_unique UNIQUE (id, store_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
REVOKE ALL ON public.categories FROM PUBLIC, anon;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read permitted categories"
ON public.categories FOR SELECT TO authenticated
USING (private.has_store_access(store_id));

CREATE POLICY "Users can create permitted categories"
ON public.categories FOR INSERT TO authenticated
WITH CHECK (private.has_store_access(store_id));

CREATE POLICY "Users can update permitted categories"
ON public.categories FOR UPDATE TO authenticated
USING (private.has_store_access(store_id))
WITH CHECK (private.has_store_access(store_id));

CREATE POLICY "Users can delete permitted categories"
ON public.categories FOR DELETE TO authenticated
USING (private.has_store_access(store_id));

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL,
  price numeric(12,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_name_length CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  CONSTRAINT products_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT products_description_length CHECK (length(description) <= 20000),
  CONSTRAINT products_price_nonnegative CHECK (price >= 0),
  CONSTRAINT products_store_slug_unique UNIQUE (store_id, slug),
  CONSTRAINT products_category_same_store FOREIGN KEY (category_id, store_id)
    REFERENCES public.categories(id, store_id) ON DELETE RESTRICT
);

CREATE INDEX products_store_category_idx ON public.products (store_id, category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
REVOKE ALL ON public.products FROM PUBLIC, anon;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read permitted products"
ON public.products FOR SELECT TO authenticated
USING (private.has_store_access(store_id));

CREATE POLICY "Users can create permitted products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (private.has_store_access(store_id));

CREATE POLICY "Users can update permitted products"
ON public.products FOR UPDATE TO authenticated
USING (private.has_store_access(store_id))
WITH CHECK (private.has_store_access(store_id));

CREATE POLICY "Users can delete permitted products"
ON public.products FOR DELETE TO authenticated
USING (private.has_store_access(store_id));

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();