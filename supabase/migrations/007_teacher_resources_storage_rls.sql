INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-resources', 'teacher-resources', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "teacher_resources_authenticated_read" ON storage.objects;
CREATE POLICY "teacher_resources_authenticated_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-resources'
  AND split_part(name, '/', 1) = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "teacher_resources_authenticated_insert" ON storage.objects;
CREATE POLICY "teacher_resources_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-resources'
  AND split_part(name, '/', 1) = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "teacher_resources_authenticated_update" ON storage.objects;
CREATE POLICY "teacher_resources_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'teacher-resources'
  AND split_part(name, '/', 1) = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'teacher-resources'
  AND split_part(name, '/', 1) = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "teacher_resources_authenticated_delete" ON storage.objects;
CREATE POLICY "teacher_resources_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'teacher-resources'
  AND split_part(name, '/', 1) = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);
