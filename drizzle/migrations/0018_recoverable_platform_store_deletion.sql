CREATE TABLE IF NOT EXISTS public.platform_store_deletion_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  store_slug text NOT NULL,
  requested_by uuid NOT NULL,
  phase text NOT NULL CHECK (phase IN ('storage_cleanup', 'storage_cleaned')),
  cleanup_not_before timestamptz,
  storage_cleaned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT platform_store_deletion_phase_timestamp CHECK (
    (phase = 'storage_cleanup' AND storage_cleaned_at IS NULL)
    OR (phase = 'storage_cleaned' AND storage_cleaned_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_store_deletion_one_pending_per_store
  ON public.platform_store_deletion_operations (store_id);

ALTER TABLE public.platform_store_deletion_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_store_deletion_operations
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.authorize_store_media_upload(_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(1550741007, 11);

  RETURN private.has_store_access(_store_id)
    AND private.has_permission('media.manage')
    AND NOT EXISTS (
      SELECT 1
      FROM public.platform_store_deletion_operations AS operations
      WHERE operations.store_id = _store_id
    );
END;
$$;

REVOKE ALL ON FUNCTION private.authorize_store_media_upload(uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION private.authorize_store_media_upload(uuid)
  TO authenticated;

DROP POLICY IF EXISTS "StoreMesh media object upload permission" ON storage.objects;
CREATE POLICY "StoreMesh media object upload permission" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.authorize_store_media_upload(((storage.foldername(name))[1])::uuid)
      ELSE false
    END
  );

CREATE OR REPLACE FUNCTION private.prevent_store_update_during_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.platform_store_deletion_operations AS operations
    WHERE operations.store_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Store has a pending deletion operation'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_store_update_during_deletion()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS stores_prevent_update_during_deletion ON public.stores;
CREATE TRIGGER stores_prevent_update_during_deletion
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION private.prevent_store_update_during_deletion();

DROP FUNCTION IF EXISTS public.prepare_platform_store_deletion(uuid, text);
CREATE FUNCTION public.begin_platform_store_deletion(
  p_store_id uuid,
  p_confirmation_slug text
)
RETURNS TABLE (
  operation_id uuid,
  cleanup_not_before timestamptz,
  phase text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_slug text;
  existing_operation public.platform_store_deletion_operations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can delete platform stores'
      USING ERRCODE = '42501';
  END IF;

  IF p_store_id IS NULL OR p_confirmation_slug IS NULL THEN
    RAISE EXCEPTION 'Store deletion input is incomplete'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(1550741007, 10);
  PERFORM pg_catalog.pg_advisory_xact_lock(1550741007, 11);

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

  SELECT operations.*
  INTO existing_operation
  FROM public.platform_store_deletion_operations AS operations
  WHERE operations.store_id = p_store_id
  FOR UPDATE;

  IF FOUND THEN
    IF existing_operation.store_slug IS DISTINCT FROM p_confirmation_slug THEN
      RAISE EXCEPTION 'Pending deletion belongs to a different store slug'
        USING ERRCODE = '22023';
    END IF;

    RETURN QUERY SELECT
      existing_operation.id,
      existing_operation.cleanup_not_before,
      existing_operation.phase;
    RETURN;
  END IF;

  UPDATE public.stores
  SET status = 'inactive', updated_at = pg_catalog.now()
  WHERE id = p_store_id;

  INSERT INTO public.platform_store_deletion_operations (
    store_id,
    store_slug,
    requested_by,
    phase,
    cleanup_not_before
  )
  VALUES (
    p_store_id,
    current_slug,
    auth.uid(),
    'storage_cleanup',
    NULL
  )
  RETURNING id, platform_store_deletion_operations.cleanup_not_before,
    platform_store_deletion_operations.phase
  INTO operation_id, cleanup_not_before, phase;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_platform_store_deletion(uuid, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.begin_platform_store_deletion(uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_platform_store_deletions()
RETURNS TABLE (
  store_id uuid,
  phase text,
  cleanup_not_before timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can list platform store deletions'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT operations.store_id, operations.phase, operations.cleanup_not_before
  FROM public.platform_store_deletion_operations AS operations
  ORDER BY operations.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_platform_store_deletions()
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_platform_store_deletions()
  TO authenticated;

CREATE OR REPLACE FUNCTION public.schedule_platform_store_storage_cleanup(
  p_operation_id uuid,
  p_store_id uuid,
  p_store_slug text,
  p_max_upload_url_age_seconds integer
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  operation public.platform_store_deletion_operations%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the trusted server can schedule Storage cleanup'
      USING ERRCODE = '42501';
  END IF;

  IF p_max_upload_url_age_seconds IS NULL
    OR p_max_upload_url_age_seconds < 1
    OR p_max_upload_url_age_seconds > 31536000 THEN
    RAISE EXCEPTION 'The configured signed upload URL age is invalid'
      USING ERRCODE = '22023';
  END IF;

  SELECT operations.*
  INTO operation
  FROM public.platform_store_deletion_operations AS operations
  WHERE operations.id = p_operation_id
    AND operations.store_id = p_store_id
    AND operations.store_slug = p_store_slug
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store deletion operation does not exist'
      USING ERRCODE = '22023';
  END IF;

  IF operation.cleanup_not_before IS NULL THEN
    UPDATE public.platform_store_deletion_operations
    SET cleanup_not_before = operation.created_at
      + interval '1 second' * (p_max_upload_url_age_seconds + 300)
    WHERE id = operation.id
    RETURNING cleanup_not_before INTO operation.cleanup_not_before;
  END IF;

  RETURN operation.cleanup_not_before;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_platform_store_storage_cleanup(uuid, uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_platform_store_storage_cleanup(uuid, uuid, text, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.mark_platform_store_storage_cleaned(
  p_operation_id uuid,
  p_store_id uuid,
  p_store_slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  operation public.platform_store_deletion_operations%ROWTYPE;
  current_slug text;
  current_status public.store_status;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the trusted server can attest Storage cleanup'
      USING ERRCODE = '42501';
  END IF;

  SELECT operations.*
  INTO operation
  FROM public.platform_store_deletion_operations AS operations
  WHERE operations.id = p_operation_id
    AND operations.store_id = p_store_id
    AND operations.store_slug = p_store_slug
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store deletion operation does not exist'
      USING ERRCODE = '22023';
  END IF;

  SELECT stores.slug, stores.status
  INTO current_slug, current_status
  FROM public.stores AS stores
  WHERE stores.id = operation.store_id
  FOR UPDATE;

  IF NOT FOUND
    OR current_slug IS DISTINCT FROM operation.store_slug
    OR current_status IS DISTINCT FROM 'inactive'::public.store_status THEN
    RAISE EXCEPTION 'Store identity or state changed during deletion'
      USING ERRCODE = '55000';
  END IF;

  IF operation.cleanup_not_before IS NULL
    OR pg_catalog.clock_timestamp() < operation.cleanup_not_before THEN
    RAISE EXCEPTION 'Signed upload URLs may still be valid'
      USING ERRCODE = '55000';
  END IF;

  IF operation.phase = 'storage_cleanup' THEN
    UPDATE public.platform_store_deletion_operations
    SET phase = 'storage_cleaned',
        storage_cleaned_at = pg_catalog.clock_timestamp()
    WHERE id = operation.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_platform_store_storage_cleaned(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_platform_store_storage_cleaned(uuid, uuid, text)
  TO service_role;

DROP FUNCTION IF EXISTS public.delete_platform_store(uuid, text);
CREATE FUNCTION public.delete_platform_store(p_operation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  operation public.platform_store_deletion_operations%ROWTYPE;
  current_slug text;
  current_status public.store_status;
  deleted_store_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can delete platform stores'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(1550741007, 10);

  SELECT operations.*
  INTO operation
  FROM public.platform_store_deletion_operations AS operations
  WHERE operations.id = p_operation_id
  FOR UPDATE;

  IF NOT FOUND OR operation.phase IS DISTINCT FROM 'storage_cleaned' THEN
    RAISE EXCEPTION 'Storage cleanup has not been confirmed for this operation'
      USING ERRCODE = '55000';
  END IF;

  IF operation.cleanup_not_before IS NULL
    OR pg_catalog.clock_timestamp() < operation.cleanup_not_before THEN
    RAISE EXCEPTION 'Signed upload URLs may still be valid'
      USING ERRCODE = '55000';
  END IF;

  SELECT stores.slug, stores.status
  INTO current_slug, current_status
  FROM public.stores AS stores
  WHERE stores.id = operation.store_id
  FOR UPDATE;

  IF NOT FOUND
    OR current_slug IS DISTINCT FROM operation.store_slug
    OR current_status IS DISTINCT FROM 'inactive'::public.store_status THEN
    RAISE EXCEPTION 'Store identity or state changed during deletion'
      USING ERRCODE = '55000';
  END IF;

  PERFORM pg_catalog.set_config(
    'storemesh.preserve_permission_profile_on_store_delete',
    'on',
    true
  );

  DELETE FROM public.product_images
  WHERE store_id = operation.store_id;

  DELETE FROM public.products
  WHERE store_id = operation.store_id;

  DELETE FROM public.categories
  WHERE store_id = operation.store_id;

  DELETE FROM public.stores
  WHERE id = operation.store_id
    AND slug = operation.store_slug
  RETURNING id INTO deleted_store_id;

  IF deleted_store_id IS NULL THEN
    RAISE EXCEPTION 'Store could not be deleted'
      USING ERRCODE = '22023';
  END IF;

  RETURN deleted_store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_platform_store(uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.delete_platform_store(uuid)
  TO authenticated;
