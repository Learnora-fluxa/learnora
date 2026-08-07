DROP POLICY IF EXISTS "invitations_admin_all" ON public.invitations;

CREATE POLICY "invitations_admin_all"
ON public.invitations
FOR ALL
USING (school_id = get_my_school_id())
WITH CHECK (school_id = get_my_school_id());
