
-- Household roles enum
CREATE TYPE public.household_role AS ENUM ('owner','editor','viewer');

-- Households
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Household',
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Members
CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.household_role NOT NULL DEFAULT 'viewer',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Invites
CREATE TABLE public.household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.household_role NOT NULL DEFAULT 'viewer',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX household_invites_email_idx ON public.household_invites (lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_invites TO authenticated;
GRANT ALL ON public.household_invites TO service_role;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.user_household_ids(_uid uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT household_id FROM public.household_members WHERE user_id = _uid
$$;

CREATE OR REPLACE FUNCTION public.shares_household(_owner uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members a
    JOIN public.household_members b ON a.household_id = b.household_id
    WHERE a.user_id = _owner AND b.user_id = _viewer
  )
$$;

CREATE OR REPLACE FUNCTION public.household_edit_access(_owner uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members a
    JOIN public.household_members b ON a.household_id = b.household_id
    WHERE a.user_id = _owner AND b.user_id = _viewer AND b.role IN ('owner','editor')
  )
$$;

-- Auto-add owner as owner-member
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.household_members(household_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (household_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER add_owner_as_member_trg AFTER INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

CREATE TRIGGER households_set_updated BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Households policies
CREATE POLICY "Members view households" ON public.households FOR SELECT
  USING (auth.uid() = owner_id OR id IN (SELECT public.user_household_ids(auth.uid())));
CREATE POLICY "Owner creates household" ON public.households FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner updates household" ON public.households FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner deletes household" ON public.households FOR DELETE
  USING (auth.uid() = owner_id);

-- Members policies
CREATE POLICY "Members view membership" ON public.household_members FOR SELECT
  USING (user_id = auth.uid() OR household_id IN (SELECT public.user_household_ids(auth.uid())));
CREATE POLICY "Owner adds members or self" ON public.household_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Owner updates member roles" ON public.household_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid()));
CREATE POLICY "Owner or self removes member" ON public.household_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Invites policies (owner manages; invited email can view their own by email)
CREATE POLICY "Owner manages invites" ON public.household_invites FOR ALL
  USING (EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid()));
CREATE POLICY "Invitee sees own invite by email" ON public.household_invites FOR SELECT
  USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));

-- Update RLS on shared data tables so household members can access
DROP POLICY IF EXISTS "Users manage own items" ON public.items;
CREATE POLICY "Owner or editor manages items" ON public.items FOR ALL
  USING (auth.uid() = user_id OR public.household_edit_access(user_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.household_edit_access(user_id, auth.uid()));
CREATE POLICY "Household views items" ON public.items FOR SELECT
  USING (auth.uid() = user_id OR public.shares_household(user_id, auth.uid()));

DROP POLICY IF EXISTS "Users manage own documents" ON public.item_documents;
CREATE POLICY "Owner or editor manages documents" ON public.item_documents FOR ALL
  USING (auth.uid() = user_id OR public.household_edit_access(user_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.household_edit_access(user_id, auth.uid()));
CREATE POLICY "Household views documents" ON public.item_documents FOR SELECT
  USING (auth.uid() = user_id OR public.shares_household(user_id, auth.uid()));

DROP POLICY IF EXISTS "Users manage own maintenance tasks" ON public.maintenance_tasks;
CREATE POLICY "Owner or editor manages maintenance" ON public.maintenance_tasks FOR ALL
  USING (auth.uid() = user_id OR public.household_edit_access(user_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.household_edit_access(user_id, auth.uid()));
CREATE POLICY "Household views maintenance" ON public.maintenance_tasks FOR SELECT
  USING (auth.uid() = user_id OR public.shares_household(user_id, auth.uid()));
