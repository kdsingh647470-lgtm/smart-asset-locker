CREATE OR REPLACE FUNCTION public.shares_household(_owner uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN _viewer <> auth.uid() THEN false ELSE EXISTS (
    SELECT 1 FROM public.household_members a
    JOIN public.household_members b ON a.household_id = b.household_id
    WHERE a.user_id = _owner AND b.user_id = _viewer
  ) END
$$;

CREATE OR REPLACE FUNCTION public.household_edit_access(_owner uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN _viewer <> auth.uid() THEN false ELSE EXISTS (
    SELECT 1 FROM public.household_members a
    JOIN public.household_members b ON a.household_id = b.household_id
    WHERE a.user_id = _owner AND b.user_id = _viewer AND b.role IN ('owner','editor')
  ) END
$$;

CREATE OR REPLACE FUNCTION public.user_household_ids(_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT household_id FROM public.household_members
  WHERE user_id = _uid AND _uid = auth.uid()
$$;