-- ================================
-- EDUCATIONAL SCRAPER DATABASE SETUP
-- ================================
-- Copy and paste this SQL into your Supabase SQL Editor to set up the database

-- 1. CREATE TABLES
-- ================================

-- Table for storing scraped educational notes
CREATE TABLE IF NOT EXISTS scraped_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic VARCHAR(255) NOT NULL,
  key_points TEXT[],
  sources TEXT[],
  condensed_notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', topic), 'A') ||
    setweight(to_tsvector('english', coalesce(condensed_notes, '')), 'B')
  ) STORED
);

-- Table for tracking scraping jobs and status
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic VARCHAR(255) NOT NULL,
  sources TEXT[],
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  error_message TEXT,
  result_id UUID REFERENCES scraped_notes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for user preferences and settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_sources TEXT[] DEFAULT ARRAY['educational'],
  ai_summary_length VARCHAR(20) DEFAULT 'medium',
  auto_save BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for caching search results to avoid re-scraping
CREATE TABLE IF NOT EXISTS search_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_hash VARCHAR(64) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  sources TEXT[],
  result_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES
-- ================================

CREATE INDEX IF NOT EXISTS idx_scraped_notes_topic ON scraped_notes(topic);
CREATE INDEX IF NOT EXISTS idx_scraped_notes_user_id ON scraped_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_scraped_notes_created_at ON scraped_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_notes_search ON scraped_notes USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_user_id ON scraping_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_cache_topic_hash ON search_cache(topic_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);

-- 3. ENABLE ROW LEVEL SECURITY
-- ================================

ALTER TABLE scraped_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- ================================

-- Users can only access their own scraped notes
CREATE POLICY "Users can view own scraped_notes" ON scraped_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scraped_notes" ON scraped_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scraped_notes" ON scraped_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scraped_notes" ON scraped_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Users can manage their own scraping jobs
CREATE POLICY "Users can manage own scraping_jobs" ON scraping_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own preferences
CREATE POLICY "Users can manage own user_preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Search cache can be shared for better performance
CREATE POLICY "Anyone can read search_cache" ON search_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can insert search_cache" ON search_cache
  FOR INSERT TO authenticated WITH CHECK (true);

-- 5. CREATE FUNCTIONS
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_scraped_notes_updated_at
  BEFORE UPDATE ON scraped_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function for full-text search across scraped notes
CREATE OR REPLACE FUNCTION search_scraped_notes(search_term TEXT)
RETURNS TABLE (
  id UUID,
  topic VARCHAR(255),
  key_points TEXT[],
  sources TEXT[],
  condensed_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sn.id,
    sn.topic,
    sn.key_points,
    sn.sources,
    sn.condensed_notes,
    sn.created_at,
    ts_rank(sn.search_vector, plainto_tsquery('english', search_term)) as rank
  FROM scraped_notes sn
  WHERE sn.search_vector @@ plainto_tsquery('english', search_term)
    AND sn.user_id = auth.uid()
  ORDER BY rank DESC, sn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search both regular notes and scraped notes
CREATE OR REPLACE FUNCTION search_all_notes(search_term TEXT)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  content TEXT,
  note_type VARCHAR(50),
  sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  -- Search regular notes
  SELECT 
    n.id,
    n.title,
    n.content,
    'regular'::VARCHAR(50) as note_type,
    ARRAY['User Notes']::TEXT[] as sources,
    n.created_at,
    ts_rank(to_tsvector('english', n.title || ' ' || n.content), plainto_tsquery('english', search_term)) as rank
  FROM notes n
  WHERE (to_tsvector('english', n.title || ' ' || n.content) @@ plainto_tsquery('english', search_term))
    AND n.user_id = auth.uid()
  
  UNION ALL
  
  -- Search scraped notes
  SELECT 
    sn.id,
    sn.topic as title,
    sn.condensed_notes as content,
    'scraped'::VARCHAR(50) as note_type,
    sn.sources,
    sn.created_at,
    ts_rank(sn.search_vector, plainto_tsquery('english', search_term)) as rank
  FROM scraped_notes sn
  WHERE sn.search_vector @@ plainto_tsquery('english', search_term)
    AND sn.user_id = auth.uid()
  
  ORDER BY rank DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM search_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create user preferences
CREATE OR REPLACE FUNCTION get_user_preferences()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  preferred_sources TEXT[],
  ai_summary_length VARCHAR(20),
  auto_save BOOLEAN,
  email_notifications BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Try to get existing preferences
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.preferred_sources,
    up.ai_summary_length,
    up.auto_save,
    up.email_notifications,
    up.created_at,
    up.updated_at
  FROM user_preferences up
  WHERE up.user_id = auth.uid();
  
  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO user_preferences (user_id) VALUES (auth.uid());
    
    RETURN QUERY
    SELECT 
      up.id,
      up.user_id,
      up.preferred_sources,
      up.ai_summary_length,
      up.auto_save,
      up.email_notifications,
      up.created_at,
      up.updated_at
    FROM user_preferences up
    WHERE up.user_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION search_scraped_notes(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_all_notes(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferences() TO authenticated;

-- ================================
-- SETUP COMPLETE
-- ================================
-- After running this SQL, your database will be ready for the educational scraper system!