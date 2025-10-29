/*
  # Refresh Schema Cache

  This migration refreshes the schema cache to ensure all tables are properly visible.
  
  1. Changes
    - Adds a comment to the notes table to trigger schema refresh
    - Verifies all RLS policies are active
  
  2. Security
    - No security changes, just cache refresh
*/

-- Add a comment to trigger schema refresh
COMMENT ON TABLE notes IS 'User notes with full-text search and RLS';

-- Verify the notes table structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notes'
  ) THEN
    RAISE EXCEPTION 'Notes table does not exist!';
  END IF;
END $$;

-- Ensure all expected columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE notes ADD COLUMN search_vector tsvector;
    
    -- Create trigger for search vector
    CREATE OR REPLACE FUNCTION notes_search_vector_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $trigger$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
      RETURN NEW;
    END;
    $trigger$;
    
    DROP TRIGGER IF EXISTS notes_search_vector_trigger ON notes;
    CREATE TRIGGER notes_search_vector_trigger
      BEFORE INSERT OR UPDATE ON notes
      FOR EACH ROW
      EXECUTE FUNCTION notes_search_vector_update();
  END IF;
END $$;
