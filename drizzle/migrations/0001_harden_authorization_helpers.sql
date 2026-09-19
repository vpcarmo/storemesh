CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.has_store_access(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'store_admin'
        AND store_id = _store_id
    );
$$;

REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_store_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_store_access(uuid) TO authenticated, service_role;

ALTER POLICY "Users can read permitted profiles"
ON public.profiles
USING (id = auth.uid() OR private.is_super_admin());

ALTER POLICY "Users can read permitted stores"
ON public.stores
USING (private.has_store_access(id));

ALTER POLICY "Users can read their own roles"
ON public.user_roles
USING (user_id = auth.uid() OR private.is_super_admin());

ALTER FUNCTION public.is_super_admin() SECURITY INVOKER;
ALTER FUNCTION public.has_store_access(uuid) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_store_access(uuid) FROM PUBLIC, anon;