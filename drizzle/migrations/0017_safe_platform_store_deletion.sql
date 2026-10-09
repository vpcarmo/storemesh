CREATE OR REPLACE FUNCTION private.cleanup_orphan_permission_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.current_setting(
    'storemesh.preserve_permission_profile_on_store_delete',
    true
  ) = 'on' THEN
    RETURN OLD;
  END IF;

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

CREATE OR REPLACE FUNCTION public.prepare_platform_store_deletion(
  p_store_id uuid,
  p_confirmation_slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_slug text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can delete platform stores'
      USING ERRCODE = '42501';
  END IF;

  IF p_store_id IS NULL OR p_confirmation_slug IS NULL THEN
    RAISE EXCEPTION 'Store deletion input is incomplete'
      USING ERRCODE = '22023';
  END IF;

  SELECT stores.slug
  INTO current_slug
  FROM public.stores AS stores
  WHERE stores.id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store does not exist'
      USING ERRCODE = '22023';
  END IF;

  IF current_slug IS DISTINCT FROM p_confirmation_slug THEN
    RAISE EXCEPTION 'Store confirmation slug does not match'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.stores
  SET status = 'inactive', updated_at = pg_catalog.now()
  WHERE id = p_store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_platform_store_deletion(uuid, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.prepare_platform_store_deletion(uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_platform_store(
  p_store_id uuid,
  p_confirmation_slug text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_slug text;
  current_status public.store_status;
  deleted_store_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can delete platform stores'
      USING ERRCODE = '42501';
  END IF;

  IF p_store_id IS NULL OR p_confirmation_slug IS NULL THEN
    RAISE EXCEPTION 'Store deletion input is incomplete'
      USING ERRCODE = '22023';
  END IF;

  SELECT stores.slug, stores.status
  INTO current_slug, current_status
  FROM public.stores AS stores
  WHERE stores.id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store does not exist'
      USING ERRCODE = '22023';
  END IF;

  IF current_slug IS DISTINCT FROM p_confirmation_slug THEN
    RAISE EXCEPTION 'Store confirmation slug does not match'
      USING ERRCODE = '22023';
  END IF;

  IF current_status IS DISTINCT FROM 'inactive'::public.store_status THEN
    RAISE EXCEPTION 'Store must be inactive before deletion'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.set_config(
    'storemesh.preserve_permission_profile_on_store_delete',
    'on',
    true
  );

  DELETE FROM public.product_images
  WHERE store_id = p_store_id;

  DELETE FROM public.products
  WHERE store_id = p_store_id;

  DELETE FROM public.categories
  WHERE store_id = p_store_id;

  DELETE FROM public.stores
  WHERE id = p_store_id
    AND slug = p_confirmation_slug
  RETURNING id INTO deleted_store_id;

  IF deleted_store_id IS NULL THEN
    RAISE EXCEPTION 'Store could not be deleted'
      USING ERRCODE = '22023';
  END IF;

  RETURN deleted_store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_platform_store(uuid, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.delete_platform_store(uuid, text)
  TO authenticated;
