ALTER TABLE public.lessons
DROP CONSTRAINT IF EXISTS lessons_type_check;

ALTER TABLE public.lessons
ADD CONSTRAINT lessons_type_check
CHECK (type IN ('video', 'pdf', 'audio', 'document', 'text', 'quiz'));
