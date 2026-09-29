CREATE OR REPLACE FUNCTION public.save_platform_store(
  p_store_id uuid,
  p_name text,
  p_slug text,
  p_status public.store_status,
  p_store_admin_user_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  saved_store_id uuid;
  selected_admin_ids uuid[] := COALESCE(p_store_admin_user_ids, ARRAY[]::uuid[]);
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can manage platform stores'
      USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Store name is required' USING ERRCODE = '22023';
  END IF;

  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Store slug is invalid' USING ERRCODE = '23514';
  END IF;

  IF cardinality(selected_admin_ids) <> (
    SELECT count(DISTINCT selected.user_id)::integer
    FROM unnest(selected_admin_ids) AS selected(user_id)
  ) THEN
    RAISE EXCEPTION 'Duplicate store administrator' USING ERRCODE = '22023';
  END IF;

  IF p_store_id IS NULL THEN
    INSERT INTO public.stores (name, slug, status)
    VALUES (btrim(p_name), p_slug, p_status)
    RETURNING id INTO saved_store_id;
  ELSE
    UPDATE public.stores
    SET name = btrim(p_name), slug = p_slug, status = p_status, updated_at = now()
    WHERE id = p_store_id
    RETURNING id INTO saved_store_id;

    IF saved_store_id IS NULL THEN
      RAISE EXCEPTION 'Store does not exist' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(selected_admin_ids) AS selected(user_id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_roles AS current_assignment
      WHERE current_assignment.user_id = selected.user_id
        AND current_assignment.store_id = saved_store_id
        AND current_assignment.role = 'store_admin'
    )
    AND (
      NOT EXISTS (
        SELECT 1
        FROM auth.users AS existing_user
        INNER JOIN public.profiles AS existing_profile ON existing_profile.id = existing_user.id
        WHERE existing_user.id = selected.user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = selected.user_id
          AND role = 'super_admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Only existing non-super_admin profiles can be assigned'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.user_roles
  WHERE store_id = saved_store_id
    AND role = 'store_admin'
    AND NOT (user_id = ANY(selected_admin_ids));

  INSERT INTO public.user_roles (user_id, role, store_id)
  SELECT selected.user_id, 'store_admin', saved_store_id
  FROM unnest(selected_admin_ids) AS selected(user_id)
  ON CONFLICT (user_id, store_id) WHERE role = 'store_admin' DO NOTHING;

  RETURN saved_store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_platform_store(uuid, text, text, public.store_status, uuid[])
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_platform_store(uuid, text, text, public.store_status, uuid[])
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_platform_store_users()
RETURNS TABLE (user_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can list platform users'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT profiles.id, profiles.full_name
  FROM auth.users AS users
  INNER JOIN public.profiles AS profiles ON profiles.id = users.id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS roles
    WHERE roles.user_id = users.id
      AND roles.role = 'super_admin'
  )
  ORDER BY profiles.full_name NULLS LAST, profiles.id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_platform_store_users() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_platform_store_users() TO authenticated;