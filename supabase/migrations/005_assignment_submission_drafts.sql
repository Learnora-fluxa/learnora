ALTER TABLE public.assignment_submissions
DROP CONSTRAINT IF EXISTS assignment_submissions_status_check;

ALTER TABLE public.assignment_submissions
ADD CONSTRAINT assignment_submissions_status_check
CHECK (status IN ('draft', 'pending', 'submitted', 'graded', 'late'));
