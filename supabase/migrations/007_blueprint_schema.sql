-- Blueprint Schema Migration
-- Adds schema versioning to distinguish between legacy markdown and blueprint format

-- ===========================================
-- ADD SCHEMA VERSION COLUMN
-- ===========================================

-- Add schema_version column to course_catalog
-- 1 = legacy markdown format (sections with markdown content)
-- 2 = blueprint format (steps with structured content)
ALTER TABLE public.course_catalog
ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;

-- Create index for efficient queries by schema version
CREATE INDEX IF NOT EXISTS idx_course_catalog_schema_version
ON public.course_catalog(schema_version);

-- ===========================================
-- UPDATE COLUMN COMMENTS
-- ===========================================

COMMENT ON COLUMN public.course_catalog.content IS
'Course content in JSONB format.
Schema v1 (legacy): { sections: [{ id, title, content (markdown), estimatedMinutes }], totalEstimatedMinutes, generatedAt }
Schema v2 (blueprint): { version: 2, topic, depth, steps: [{ id, title, hook, keyIdea, example, quickCheck?, nextMoves? }], totalEstimatedMinutes, generatedAt }';

COMMENT ON COLUMN public.course_catalog.schema_version IS
'Content schema version. 1 = legacy markdown sections, 2 = structured blueprint steps';

-- ===========================================
-- HELPER FUNCTION
-- ===========================================

-- Function to check if a course uses the blueprint schema
CREATE OR REPLACE FUNCTION public.is_blueprint_course(course_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(schema_version, 1) >= 2
  FROM public.course_catalog
  WHERE id = course_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_blueprint_course(UUID) TO authenticated;

-- ===========================================
-- UPDATE RLS POLICY (if needed)
-- ===========================================

-- Ensure the new column is included in existing policies
-- (No changes needed - existing policies use row-level access)
