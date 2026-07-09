
-- Create private schema hidden from the exposed API
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Recreate the SECURITY DEFINER helpers in the private schema
CREATE OR REPLACE FUNCTION private.user_household_ids(_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT household_id FROM public.household_members
  WHERE user_id = _uid AND _uid = auth.uid()
$$;

CREATE OR REPLACE FUNCTION private.shares_household(_owner uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN _viewer <> auth.uid() THEN false ELSE EXISTS (
    SELECT 1 FROM public.household_members a
    JOIN public.household_members b ON a.household_id = b.household_id
    WHERE a.user_id = _owner AND b.user_id = _viewer
  ) END
$$;

CREATE OR REPLACE FUNCTION private.household_edit_access(_owner uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN _viewer <> auth.uid() THEN false ELSE EXISTS (
    SELECT 1 FROM public.household_members a
    JOIN public.household_members b ON a.household_id = b.household_id
    WHERE a.user_id = _owner AND b.user_id = _viewer AND b.role IN ('owner','editor')
  ) END
$$;

REVOKE ALL ON FUNCTION private.user_household_ids(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.shares_household(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.household_edit_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.user_household_ids(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.shares_household(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.household_edit_access(uuid, uuid) TO authenticated, service_role;

-- Rewrite policies to reference the private helpers
DROP POLICY IF EXISTS "Members view households" ON public.households;
CREATE POLICY "Members view households" ON public.households FOR SELECT
USING ((auth.uid() = owner_id) OR (id IN (SELECT private.user_household_ids(auth.uid()))));

DROP POLICY IF EXISTS "Members view membership" ON public.household_members;
CREATE POLICY "Members view membership" ON public.household_members FOR SELECT
USING ((user_id = auth.uid()) OR (household_id IN (SELECT private.user_household_ids(auth.uid()))));

DROP POLICY IF EXISTS "Owner or editor manages items" ON public.items;
CREATE POLICY "Owner or editor manages items" ON public.items FOR ALL
USING ((auth.uid() = user_id) OR private.household_edit_access(user_id, auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR private.household_edit_access(user_id, auth.uid()));

DROP POLICY IF EXISTS "Household views items" ON public.items;
CREATE POLICY "Household views items" ON public.items FOR SELECT
USING ((auth.uid() = user_id) OR private.shares_household(user_id, auth.uid()));

DROP POLICY IF EXISTS "Owner or editor manages documents" ON public.item_documents;
CREATE POLICY "Owner or editor manages documents" ON public.item_documents FOR ALL
USING ((auth.uid() = user_id) OR private.household_edit_access(user_id, auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR private.household_edit_access(user_id, auth.uid()));

DROP POLICY IF EXISTS "Household views documents" ON public.item_documents;
CREATE POLICY "Household views documents" ON public.item_documents FOR SELECT
USING ((auth.uid() = user_id) OR private.shares_household(user_id, auth.uid()));

DROP POLICY IF EXISTS "Owner or editor manages maintenance" ON public.maintenance_tasks;
CREATE POLICY "Owner or editor manages maintenance" ON public.maintenance_tasks FOR ALL
USING ((auth.uid() = user_id) OR private.household_edit_access(user_id, auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR private.household_edit_access(user_id, auth.uid()));

DROP POLICY IF EXISTS "Household views maintenance" ON public.maintenance_tasks;
CREATE POLICY "Household views maintenance" ON public.maintenance_tasks FOR SELECT
USING ((auth.uid() = user_id) OR private.shares_household(user_id, auth.uid()));

-- Now safe to drop the public copies
DROP FUNCTION IF EXISTS public.user_household_ids(uuid);
DROP FUNCTION IF EXISTS public.shares_household(uuid, uuid);
DROP FUNCTION IF EXISTS public.household_edit_access(uuid, uuid);
