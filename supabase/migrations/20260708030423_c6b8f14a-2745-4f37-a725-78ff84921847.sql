REVOKE EXECUTE ON FUNCTION public.shares_household(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.household_edit_access(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_household_ids(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_owner_as_member() FROM PUBLIC, anon, authenticated;