CREATE OR REPLACE FUNCTION private.is_unique_permission_array(_permissions text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT pg_catalog.cardinality(_permissions) = pg_catalog.cardinality(
    ARRAY(
      SELECT DISTINCT permission_key
      FROM pg_catalog.unnest(_permissions) AS permissions(permission_key)
    )
  );
$$;

REVOKE ALL ON FUNCTION private.is_unique_permission_array(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_unique_permission_array(text[]) TO service_role;

CREATE TABLE public.permission_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permission_profiles_name_not_blank
    CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT permission_profiles_permissions_allowed CHECK (
    permissions <@ ARRAY[
      'website.view',
      'website.manage',
      'catalog.view',
      'catalog.manage',
      'media.view',
    'media.manage',
    'settings.view',
    'settings.manage'
  ]::text[]
  AND private.is_unique_permission_array(permissions)
);

CREATE UNIQUE INDEX permission_profiles_name_unique
  ON public.permission_profiles (lower(btrim(name)));

CREATE TABLE public.user_permission_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_profile_id uuid NOT NULL
    REFERENCES public.permission_profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.permission_profiles, public.user_permission_profiles
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.permission_profiles, public.user_permission_profiles TO service_role;

ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER permission_profiles_set_updated_at
  BEFORE UPDATE ON public.permission_profiles
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER user_permission_profiles_set_updated_at
  BEFORE UPDATE ON public.user_permission_profiles
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE OR REPLACE FUNCTION private.has_permission(_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL
      OR _permission IS NULL
      OR pg_catalog.btrim(_permission) = ''
      OR _permission NOT IN (
      'website.view',
      'website.manage',
      'catalog.view',
      'catalog.manage',
      'media.view',
      'media.manage',
      'settings.view',
      'settings.manage'
    ) THEN false
    WHEN EXISTS (
      SELECT 1
      FROM public.user_roles AS roles
      WHERE roles.user_id = auth.uid()
        AND roles.role = 'super_admin'
    ) THEN true
    WHEN NOT EXISTS (
      SELECT 1
      FROM public.user_permission_profiles AS assignments
      WHERE assignments.user_id = auth.uid()
    ) THEN EXISTS (
      SELECT 1
      FROM public.user_roles AS roles
      WHERE roles.user_id = auth.uid()
        AND roles.role = 'store_admin'
    )
    ELSE EXISTS (
      SELECT 1
      FROM public.user_permission_profiles AS assignments
      INNER JOIN public.permission_profiles AS permission_profiles
        ON permission_profiles.id = assignments.permission_profile_id
      WHERE assignments.user_id = auth.uid()
        AND (
          permission_profiles.permissions @> ARRAY[_permission]::text[]
          OR (
            _permission IN (
              'website.view',
              'catalog.view',
              'media.view',
              'settings.view'
            )
            AND permission_profiles.permissions @> ARRAY[
              pg_catalog.replace(_permission, '.view', '.manage')
            ]::text[]
          )
        )
    )
  END;
$$;

REVOKE ALL ON FUNCTION private.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_permission(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_permissions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT ARRAY(
    SELECT permission_key
    FROM pg_catalog.unnest(ARRAY[
      'website.view',
      'website.manage',
      'catalog.view',
      'catalog.manage',
      'media.view',
      'media.manage',
      'settings.view',
      'settings.manage'
    ]::text[]) AS permissions(permission_key)
    WHERE private.has_permission(permission_key)
    ORDER BY permission_key
  );
$$;

REVOKE ALL ON FUNCTION public.current_permissions() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.current_permissions() TO authenticated;

CREATE OR REPLACE FUNCTION public.check_store_permission(
  _store_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.has_store_access(_store_id)
    AND private.has_permission(_permission);
$$;

REVOKE ALL ON FUNCTION public.check_store_permission(uuid, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.check_store_permission(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.cleanup_orphan_permission_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS roles
    WHERE roles.user_id = OLD.user_id
  ) THEN
    DELETE FROM public.user_permission_profiles AS assignments
    WHERE assignments.user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION private.cleanup_orphan_permission_profile() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER user_roles_cleanup_orphan_permission_profile
  AFTER DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION private.cleanup_orphan_permission_profile();

DROP POLICY IF EXISTS "Users can read permitted categories" ON public.categories;
DROP POLICY IF EXISTS "Users can create permitted categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update permitted categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete permitted categories" ON public.categories;
DROP POLICY IF EXISTS "Users can read permitted products" ON public.products;
DROP POLICY IF EXISTS "Users can create permitted products" ON public.products;
DROP POLICY IF EXISTS "Users can update permitted products" ON public.products;
DROP POLICY IF EXISTS "Users can delete permitted products" ON public.products;

CREATE POLICY "StoreMesh catalog read permission" ON public.categories
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.view'));
CREATE POLICY "StoreMesh catalog manage permission" ON public.categories
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('catalog.manage'));

CREATE POLICY "StoreMesh catalog read permission" ON public.products
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.view'));
CREATE POLICY "StoreMesh catalog manage permission" ON public.products
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('catalog.manage'));

DROP POLICY IF EXISTS "Users can manage permitted catalog attributes" ON public.catalog_attributes;
DROP POLICY IF EXISTS "Users can manage permitted catalog attribute values" ON public.catalog_attribute_values;
DROP POLICY IF EXISTS "Users can manage permitted product attribute values" ON public.product_attribute_values;
DROP POLICY IF EXISTS "Users can manage permitted product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users can manage permitted variant attribute values" ON public.variant_attribute_values;
DROP POLICY IF EXISTS "Users can manage permitted product images" ON public.product_images;

CREATE POLICY "StoreMesh catalog read permission" ON public.catalog_attributes
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.view'));
CREATE POLICY "StoreMesh catalog manage permission" ON public.catalog_attributes
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('catalog.manage'));

CREATE POLICY "StoreMesh catalog read permission" ON public.catalog_attribute_values
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.view'));
CREATE POLICY "StoreMesh catalog manage permission" ON public.catalog_attribute_values
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('catalog.manage'));

CREATE POLICY "StoreMesh catalog read permission" ON public.product_attribute_values
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.view'));
CREATE POLICY "StoreMesh catalog manage permission" ON public.product_attribute_values
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('catalog.manage'));

CREATE POLICY "StoreMesh catalog read permission" ON public.product_variants
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.view'));
CREATE POLICY "StoreMesh catalog manage permission" ON public.product_variants
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('catalog.manage'));

CREATE POLICY "StoreMesh catalog read permission" ON public.variant_attribute_values
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.view'));
CREATE POLICY "StoreMesh catalog manage permission" ON public.variant_attribute_values
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('catalog.manage'));

CREATE POLICY "StoreMesh catalog read permission" ON public.product_images
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.view'));
CREATE POLICY "StoreMesh catalog manage permission" ON public.product_images
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('catalog.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('catalog.manage'));

DROP POLICY IF EXISTS "Users can manage permitted pages" ON public.pages;
DROP POLICY IF EXISTS "Users can manage permitted navigation items" ON public.navigation_items;

CREATE POLICY "StoreMesh website read permission" ON public.pages
  FOR SELECT TO authenticated
  USING (
    private.has_store_access(store_id)
    AND (
      private.has_permission('website.view')
      OR (
        status = 'published'
        AND private.has_permission('settings.view')
      )
    )
  );
CREATE POLICY "StoreMesh website manage permission" ON public.pages
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('website.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('website.manage'));

CREATE POLICY "StoreMesh website read permission" ON public.navigation_items
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('website.view'));
CREATE POLICY "StoreMesh website manage permission" ON public.navigation_items
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('website.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('website.manage'));

DROP POLICY IF EXISTS "Users can manage permitted media assets" ON public.media_assets;
CREATE POLICY "StoreMesh media read permission" ON public.media_assets
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('media.view'));
CREATE POLICY "StoreMesh media manage permission" ON public.media_assets
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('media.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('media.manage'));

DROP POLICY IF EXISTS "Users can read permitted store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can create permitted store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can update permitted store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can delete permitted store settings" ON public.store_settings;
CREATE POLICY "StoreMesh settings read permission" ON public.store_settings
  FOR SELECT TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('settings.view'));
CREATE POLICY "StoreMesh settings manage permission" ON public.store_settings
  FOR ALL TO authenticated
  USING (private.has_store_access(store_id) AND private.has_permission('settings.manage'))
  WITH CHECK (private.has_store_access(store_id) AND private.has_permission('settings.manage'));

DROP POLICY IF EXISTS "Users can read permitted media objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload permitted media objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can update permitted media objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete permitted media objects" ON storage.objects;

CREATE POLICY "StoreMesh media object read permission" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
        AND private.has_permission('media.view')
      ELSE false
    END
  );
CREATE POLICY "StoreMesh media object upload permission" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
        AND private.has_permission('media.manage')
      ELSE false
    END
  );
CREATE POLICY "StoreMesh media object update permission" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
        AND private.has_permission('media.manage')
      ELSE false
    END
  )
  WITH CHECK (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
        AND private.has_permission('media.manage')
      ELSE false
    END
  );
CREATE POLICY "StoreMesh media object delete permission" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
        AND private.has_permission('media.manage')
      ELSE false
    END
  );

CREATE OR REPLACE FUNCTION public.save_product_variant_with_attribute_values(
  p_store_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_sku text,
  p_price numeric,
  p_compare_at_price numeric,
  p_is_active boolean,
  p_position integer,
  p_values jsonb
)
RETURNS public.product_variants
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  saved public.product_variants;
  value_item jsonb;
BEGIN
  IF NOT private.has_store_access(p_store_id)
    OR NOT private.has_permission('catalog.manage') THEN
    RAISE EXCEPTION 'Not authorized to manage catalog for this store'
      USING ERRCODE = '42501';
  END IF;

  IF p_variant_id IS NULL THEN
    INSERT INTO public.product_variants (
      store_id, product_id, sku, price, compare_at_price, is_active, position
    )
    VALUES (
      p_store_id, p_product_id, p_sku, p_price, p_compare_at_price, p_is_active, p_position
    )
    RETURNING * INTO saved;
  ELSE
    UPDATE public.product_variants
    SET product_id = p_product_id,
        sku = p_sku,
        price = p_price,
        compare_at_price = p_compare_at_price,
        is_active = p_is_active,
        position = p_position
    WHERE id = p_variant_id
      AND store_id = p_store_id
    RETURNING * INTO saved;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant does not belong to the authorized store';
    END IF;
  END IF;

  DELETE FROM public.variant_attribute_values
  WHERE variant_id = saved.id
    AND store_id = p_store_id;

  FOR value_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_values)
  LOOP
    INSERT INTO public.variant_attribute_values (
      store_id, variant_id, attribute_id, attribute_value_id
    )
    VALUES (
      p_store_id,
      saved.id,
      (value_item->>'attributeId')::uuid,
      (value_item->>'attributeValueId')::uuid
    );
  END LOOP;

  RETURN saved;
END;
$$;

REVOKE ALL ON FUNCTION public.save_product_variant_with_attribute_values(
  uuid, uuid, uuid, text, numeric, numeric, boolean, integer, jsonb
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_product_variant_with_attribute_values(
  uuid, uuid, uuid, text, numeric, numeric, boolean, integer, jsonb
) TO authenticated;
