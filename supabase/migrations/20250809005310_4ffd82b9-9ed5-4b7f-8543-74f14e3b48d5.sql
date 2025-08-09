-- Add index to speed up category queries
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions (category);

-- Ensure list_categories function is up-to-date and efficient
CREATE OR REPLACE FUNCTION public.list_categories()
RETURNS TABLE(category text, question_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(category, 'General') AS category,
         COUNT(*)::bigint AS question_count
  FROM public.questions
  GROUP BY 1
  ORDER BY question_count DESC;
$function$;