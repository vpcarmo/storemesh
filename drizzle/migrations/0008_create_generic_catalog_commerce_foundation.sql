-- Stage 7: generic, store-scoped catalog attributes, variants, and images.
CREATE TYPE public.catalog_attribute_display_type AS ENUM ('text', 'swatch');

ALTER TABLE public.products
  ADD CONSTRAINT products_id_store_unique UNIQUE (id, store_id);

CREATE TABLE public.catalog_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  display_type public.catalog_attribute_display_type NOT NULL DEFAULT 'text',
  is_filterable boolean NOT NULL DEFAULT false,
  is_variant_axis boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_attributes_name_length CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT catalog_attributes_code_format CHECK (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  CONSTRAINT catalog_attributes_position_nonnegative CHECK (position >= 0),
  CONSTRAINT catalog_attributes_store_code_unique UNIQUE (store_id, code),
  CONSTRAINT catalog_attributes_id_store_unique UNIQUE (id, store_id)
);

CREATE TABLE public.catalog_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  swatch_value text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_attribute_values_value_not_blank CHECK (length(btrim(value)) BETWEEN 1 AND 160),
  CONSTRAINT catalog_attribute_values_label_not_blank CHECK (length(btrim(label)) BETWEEN 1 AND 160),
  CONSTRAINT catalog_attribute_values_position_nonnegative CHECK (position >= 0),
  CONSTRAINT catalog_attribute_values_attribute_value_unique UNIQUE (attribute_id, value),
  CONSTRAINT catalog_attribute_values_attribute_same_store FOREIGN KEY (attribute_id, store_id)
    REFERENCES public.catalog_attributes(id, store_id) ON DELETE CASCADE,
  CONSTRAINT catalog_attribute_values_id_store_unique UNIQUE (id, store_id),
  CONSTRAINT catalog_attribute_values_id_attribute_unique UNIQUE (id, attribute_id)
);

CREATE TABLE public.product_attribute_values (
  product_id uuid NOT NULL,
  attribute_value_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, attribute_value_id),
  CONSTRAINT product_attribute_values_product_same_store FOREIGN KEY (product_id, store_id)
    REFERENCES public.products(id, store_id) ON DELETE CASCADE,
  CONSTRAINT product_attribute_values_value_same_store FOREIGN KEY (attribute_value_id, store_id)
    REFERENCES public.catalog_attribute_values(id, store_id) ON DELETE CASCADE
);

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  sku text,
  price numeric(12,2) NOT NULL,
  compare_at_price numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_product_same_store FOREIGN KEY (product_id, store_id)
    REFERENCES public.products(id, store_id) ON DELETE CASCADE,
  CONSTRAINT product_variants_sku_not_blank CHECK (sku IS NULL OR length(btrim(sku)) BETWEEN 1 AND 160),
  CONSTRAINT product_variants_price_nonnegative CHECK (price >= 0),
  CONSTRAINT product_variants_compare_at_price_nonnegative CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  CONSTRAINT product_variants_position_nonnegative CHECK (position >= 0),
  CONSTRAINT product_variants_id_store_unique UNIQUE (id, store_id)
);
CREATE UNIQUE INDEX product_variants_store_sku_unique ON public.product_variants (store_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX product_variants_store_product_idx ON public.product_variants (store_id, product_id);

CREATE TABLE public.variant_attribute_values (
  variant_id uuid NOT NULL,
  attribute_value_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL,
  PRIMARY KEY (variant_id, attribute_value_id),
  CONSTRAINT variant_attribute_values_variant_same_store FOREIGN KEY (variant_id, store_id)
    REFERENCES public.product_variants(id, store_id) ON DELETE CASCADE,
  CONSTRAINT variant_attribute_values_value_same_store FOREIGN KEY (attribute_value_id, store_id)
    REFERENCES public.catalog_attribute_values(id, store_id) ON DELETE CASCADE,
  CONSTRAINT variant_attribute_values_value_attribute FOREIGN KEY (attribute_value_id, attribute_id)
    REFERENCES public.catalog_attribute_values(id, attribute_id) ON DELETE CASCADE,
  CONSTRAINT variant_attribute_values_one_value_per_attribute UNIQUE (variant_id, attribute_id)
);

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  url text NOT NULL,
  alt_text text,
  position integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_images_product_same_store FOREIGN KEY (product_id, store_id)
    REFERENCES public.products(id, store_id) ON DELETE CASCADE,
  CONSTRAINT product_images_url_not_blank CHECK (length(btrim(url)) BETWEEN 1 AND 2000),
  CONSTRAINT product_images_alt_text_length CHECK (alt_text IS NULL OR length(alt_text) <= 500),
  CONSTRAINT product_images_position_nonnegative CHECK (position >= 0)
);
CREATE INDEX product_images_store_product_position_idx ON public.product_images (store_id, product_id, position);
CREATE UNIQUE INDEX product_images_one_primary_per_product ON public.product_images (product_id) WHERE is_primary;

CREATE OR REPLACE FUNCTION private.validate_variant_attribute_value()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.catalog_attributes attribute
    WHERE attribute.id = NEW.attribute_id
      AND attribute.store_id = NEW.store_id
      AND attribute.is_variant_axis
  ) THEN
    RAISE EXCEPTION 'Variant attribute values must use a variant-axis attribute.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER variant_attribute_values_validate_axis
BEFORE INSERT OR UPDATE ON public.variant_attribute_values
FOR EACH ROW EXECUTE FUNCTION private.validate_variant_attribute_value();

CREATE OR REPLACE FUNCTION private.prevent_duplicate_variant_combination()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  affected_product_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'product_variants' THEN
    affected_product_id := COALESCE(NEW.product_id, OLD.product_id);
  ELSE
    SELECT product_id INTO affected_product_id
    FROM public.product_variants WHERE id = COALESCE(NEW.variant_id, OLD.variant_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.product_variants first_variant
    JOIN public.product_variants second_variant
      ON second_variant.product_id = first_variant.product_id AND second_variant.id > first_variant.id
    WHERE first_variant.product_id = affected_product_id
      AND ARRAY(SELECT attribute_value_id FROM public.variant_attribute_values WHERE variant_id = first_variant.id ORDER BY attribute_value_id)
        = ARRAY(SELECT attribute_value_id FROM public.variant_attribute_values WHERE variant_id = second_variant.id ORDER BY attribute_value_id)
  ) THEN
    RAISE EXCEPTION 'A product cannot have duplicate variant attribute combinations.';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER variant_attribute_values_prevent_duplicate_combination
AFTER INSERT OR UPDATE OR DELETE ON public.variant_attribute_values
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.prevent_duplicate_variant_combination();

CREATE CONSTRAINT TRIGGER product_variants_prevent_duplicate_combination
AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.prevent_duplicate_variant_combination();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_attributes, public.catalog_attribute_values,
  public.product_attribute_values, public.product_variants, public.variant_attribute_values, public.product_images TO authenticated;
GRANT ALL ON public.catalog_attributes, public.catalog_attribute_values, public.product_attribute_values,
  public.product_variants, public.variant_attribute_values, public.product_images TO service_role;
REVOKE ALL ON public.catalog_attributes, public.catalog_attribute_values, public.product_attribute_values,
  public.product_variants, public.variant_attribute_values, public.product_images FROM PUBLIC, anon;

ALTER TABLE public.catalog_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage permitted catalog attributes" ON public.catalog_attributes FOR ALL TO authenticated
USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));
CREATE POLICY "Users can manage permitted catalog attribute values" ON public.catalog_attribute_values FOR ALL TO authenticated
USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));
CREATE POLICY "Users can manage permitted product attribute values" ON public.product_attribute_values FOR ALL TO authenticated
USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));
CREATE POLICY "Users can manage permitted product variants" ON public.product_variants FOR ALL TO authenticated
USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));
CREATE POLICY "Users can manage permitted variant attribute values" ON public.variant_attribute_values FOR ALL TO authenticated
USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));
CREATE POLICY "Users can manage permitted product images" ON public.product_images FOR ALL TO authenticated
USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));

CREATE TRIGGER catalog_attributes_set_updated_at BEFORE UPDATE ON public.catalog_attributes FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER catalog_attribute_values_set_updated_at BEFORE UPDATE ON public.catalog_attribute_values FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER product_images_set_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
