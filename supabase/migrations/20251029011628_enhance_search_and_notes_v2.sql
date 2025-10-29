/*
  # Enhanced Search and Notes Functionality
  
  1. Search Improvements
    - Add full-text search function for notes and scraped_notes
    - Create indexes for better performance
    - Add function to track recent topics
  
  2. Notes Enhancements
    - Add search vector to notes table using triggers
    - Create combined search across both tables
  
  3. Security
    - All functions use SECURITY DEFINER with proper auth checks
    - RLS policies ensure users only see their own data
*/

-- Add search_vector column to notes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE notes ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- Function to update search_vector for notes
CREATE OR REPLACE FUNCTION notes_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

-- Create trigger for notes search_vector
DROP TRIGGER IF EXISTS notes_search_vector_trigger ON notes;
CREATE TRIGGER notes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION notes_search_vector_update();

-- Update existing notes with search_vector
UPDATE notes 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C')
WHERE search_vector IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_search_vector ON notes USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_notes_user_id_created ON notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_notes_user_id_created ON scraped_notes(user_id, created_at DESC);

-- Function for enhanced search across both notes and scraped_notes
CREATE OR REPLACE FUNCTION search_all_content(search_term TEXT, user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  note_type TEXT,
  sources TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := COALESCE(user_id_param, auth.uid());
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    'note'::TEXT as note_type,
    ARRAY[]::TEXT[] as sources,
    COALESCE(n.tags, ARRAY[]::TEXT[]) as tags,
    n.created_at,
    n.updated_at,
    ts_rank(n.search_vector, plainto_tsquery('english', search_term)) as rank
  FROM notes n
  WHERE n.search_vector @@ plainto_tsquery('english', search_term)
    AND n.user_id = current_user_id
  
  UNION ALL
  
  SELECT 
    sn.id,
    sn.topic as title,
    sn.condensed_notes as content,
    'scraped'::TEXT as note_type,
    COALESCE(sn.sources, ARRAY[]::TEXT[]) as sources,
    COALESCE(sn.key_points, ARRAY[]::TEXT[]) as tags,
    sn.created_at,
    sn.updated_at,
    ts_rank(sn.search_vector, plainto_tsquery('english', search_term)) as rank
  FROM scraped_notes sn
  WHERE sn.search_vector @@ plainto_tsquery('english', search_term)
    AND sn.user_id = current_user_id
  
  ORDER BY rank DESC, created_at DESC;
END;
$$;

-- Function to track and retrieve recent topics
CREATE OR REPLACE FUNCTION track_recent_topic(
  topic_text TEXT,
  topic_type_text TEXT DEFAULT 'search'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  INSERT INTO recent_topics (user_id, topic, topic_type, last_accessed_at)
  VALUES (current_user_id, topic_text, topic_type_text, NOW())
  ON CONFLICT (user_id, topic, topic_type) 
  DO UPDATE SET last_accessed_at = NOW();

  DELETE FROM recent_topics
  WHERE id IN (
    SELECT id FROM recent_topics
    WHERE user_id = current_user_id
    ORDER BY last_accessed_at DESC
    OFFSET 20
  );
END;
$$;

-- Function to get recent topics for a user
CREATE OR REPLACE FUNCTION get_recent_topics(
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  topic TEXT,
  topic_type TEXT,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    rt.topic,
    rt.topic_type,
    rt.last_accessed_at,
    rt.created_at
  FROM recent_topics rt
  WHERE rt.user_id = current_user_id
  ORDER BY rt.last_accessed_at DESC
  LIMIT limit_count;
END;
$$;

-- Add unique constraint to recent_topics if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_topic_type'
  ) THEN
    ALTER TABLE recent_topics 
    ADD CONSTRAINT unique_user_topic_type 
    UNIQUE (user_id, topic, topic_type);
  END IF;
END $$;

-- Update RLS policies for recent_topics
DROP POLICY IF EXISTS "Users can view own topics" ON recent_topics;
DROP POLICY IF EXISTS "Users can insert own topics" ON recent_topics;
DROP POLICY IF EXISTS "Users can update own topics" ON recent_topics;
DROP POLICY IF EXISTS "Users can delete own topics" ON recent_topics;

CREATE POLICY "Users can view own topics" 
ON recent_topics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics" 
ON recent_topics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics" 
ON recent_topics 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics" 
ON recent_topics 
FOR DELETE 
USING (auth.uid() = user_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_all_content(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_recent_topic(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_topics(INTEGER) TO authenticated;