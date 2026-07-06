
-- 1) Tighten household_members INSERT: prevent privilege escalation
DROP POLICY IF EXISTS "Owner adds members or self" ON public.household_members;

CREATE POLICY "Owner adds members"
ON public.household_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = household_members.household_id AND h.owner_id = auth.uid()
  )
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.household_invites i
      WHERE i.household_id = household_members.household_id
        AND i.role = household_members.role
        AND i.accepted_at IS NULL
        AND i.expires_at > now()
        AND lower(i.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  )
);

-- 2) Remove client-side SELECT of invite rows (which exposes plaintext tokens).
-- Accept flow runs server-side with admin client and re-validates the invitee email.
DROP POLICY IF EXISTS "Invitee sees own invite by email" ON public.household_invites;

-- 3) Lock down SECURITY DEFINER trigger function from being called directly by clients.
REVOKE ALL ON FUNCTION public.add_owner_as_member() FROM PUBLIC, anon, authenticated;
