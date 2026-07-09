GRANT EXECUTE ON FUNCTION public.household_edit_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_household(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_household_ids(uuid) TO authenticated;