CREATE POLICY "profiles_update_super_admin"
ON public.profiles
FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());
