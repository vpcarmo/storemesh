CREATE OR REPLACE FUNCTION public.manage_platform_user_access(
  p_user_id uuid,
  p_is_super_admin boolean,
  p_store_ids uuid[],
  p_full_name text,
  p_revoke_access boolean,
  p_update_profile boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_is_super_admin boolean;
  super_admin_count bigint;
  matching_store_count bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can manage platform users'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_is_super_admin IS NULL OR p_store_ids IS NULL
    OR p_revoke_access IS NULL OR p_update_profile IS NULL THEN
    RAISE EXCEPTION 'User management input is incomplete'
      USING ERRCODE = '22023';
  END IF;

  IF p_revoke_access AND (
    p_is_super_admin
    OR pg_catalog.cardinality(p_store_ids) <> 0
    OR (p_update_profile AND p_full_name IS DISTINCT FROM '')
  ) THEN
    RAISE EXCEPTION 'Revocation cannot include role assignments or a profile update'
      USING ERRCODE = '22023';
  END IF;

  IF NOT p_revoke_access AND NOT p_update_profile THEN
    RAISE EXCEPTION 'Profile update must be explicitly requested'
      USING ERRCODE = '22023';
  END IF;

  IF p_update_profile AND p_full_name IS NOT NULL AND pg_catalog.length(p_full_name) > 120 THEN
    RAISE EXCEPTION 'Full name must contain at most 120 characters'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.cardinality(p_store_ids) <> (
    SELECT pg_catalog.count(DISTINCT selected.store_id)::integer
    FROM pg_catalog.unnest(p_store_ids) AS selected(store_id)
  ) THEN
    RAISE EXCEPTION 'Duplicate store assignment'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(1550741007, 10);

  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super_admin can manage platform users'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (p_revoke_access AND p_update_profile) AND NOT EXISTS (
    SELECT 1 FROM auth.users AS users WHERE users.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User does not exist'
      USING ERRCODE = '22023';
  END IF;

  IF p_revoke_access AND p_update_profile AND p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot delete their own account'
      USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS roles
    WHERE roles.user_id = p_user_id
      AND roles.role = 'super_admin'
  ) INTO target_is_super_admin;

  IF target_is_super_admin AND NOT p_is_super_admin
    AND EXISTS (SELECT 1 FROM auth.users AS users WHERE users.id = p_user_id) THEN
    IF NOT p_revoke_access AND pg_catalog.cardinality(p_store_ids) = 0 THEN
      RAISE EXCEPTION 'Assign at least one store before downgrading a super_admin'
        USING ERRCODE = '22023';
    END IF;

    SELECT pg_catalog.count(*) INTO super_admin_count
    FROM public.user_roles AS roles
    WHERE roles.role = 'super_admin';
    IF super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last super_admin'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_revoke_access THEN
    DELETE FROM public.user_roles AS roles
    WHERE roles.user_id = p_user_id;
    IF p_update_profile THEN
      DELETE FROM public.profiles AS profiles
      WHERE profiles.id = p_user_id;
    END IF;
    RETURN;
  END IF;

  IF p_update_profile THEN
    INSERT INTO public.profiles (id, full_name)
    VALUES (p_user_id, NULLIF(pg_catalog.btrim(p_full_name), ''))
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          updated_at = pg_catalog.now();
  END IF;

  INSERT INTO public.user_roles (user_id, role, store_id)
  SELECT p_user_id, 'store_admin', selected.store_id
  FROM pg_catalog.unnest(p_store_ids) AS selected(store_id)
  ON CONFLICT (user_id, store_id) WHERE role = 'store_admin' DO NOTHING;

  IF p_is_super_admin AND NOT target_is_super_admin THEN
    INSERT INTO public.user_roles (user_id, role, store_id)
    VALUES (p_user_id, 'super_admin', NULL)
    ON CONFLICT (user_id) WHERE role = 'super_admin' DO NOTHING;
  END IF;

  DELETE FROM public.user_roles AS roles
  WHERE roles.user_id = p_user_id
    AND roles.role = 'store_admin'
    AND NOT (roles.store_id = ANY(p_store_ids));

  IF NOT p_is_super_admin THEN
    DELETE FROM public.user_roles AS roles
    WHERE roles.user_id = p_user_id
      AND roles.role = 'super_admin';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_platform_user_access(uuid, boolean, uuid[], text, boolean, boolean)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.manage_platform_user_access(uuid, boolean, uuid[], text, boolean, boolean)
  TO authenticated;
