import { supabase } from "@/integrations/supabase/client";

export interface ScrapedNote {
  id: string;
  topic: string;
  key_points: string[];
  sources: string[];
  condensed_notes: string;
  raw_data: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ScrapingJob {
  id: string;
  topic: string;
  sources: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_items: number;
  error_message?: string;
  result_id?: string;
  created_at: string;
  completed_at?: string;
  user_id: string;
}

export class EducationalScraperService {
  static async searchNotes(searchTerm: string): Promise<ScrapedNote[]> {
    // For now, search in existing notes table until new tables are created
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform notes to scraped notes format
    return (data || []).map(note => ({
      id: note.id,
      topic: note.title,
      key_points: [],
      sources: ['User Notes'],
      condensed_notes: note.content,
      raw_data: note,
      created_at: note.created_at,
      updated_at: note.updated_at,
      user_id: note.user_id
    }));
  }

  static async startScraping(topic: string, sources: string[] = ['educational']): Promise<{ result: ScrapedNote }> {
    // Call the educational scraper edge function directly
    const { data, error } = await supabase.functions.invoke('educational-scraper', {
      body: { topic, sources }
    });

    if (error) throw error;

    return {
      result: data.data
    };
  }

  static async fetchSavedNotes(limit: number = 50): Promise<ScrapedNote[]> {
    // Use existing notes table for now
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Transform to scraped notes format
    return (data || []).map(note => ({
      id: note.id,
      topic: note.title,
      key_points: [],
      sources: ['User Notes'],
      condensed_notes: note.content,
      raw_data: note,
      created_at: note.created_at,
      updated_at: note.updated_at,
      user_id: note.user_id
    }));
  }

  static async fetchScrapingJobs(): Promise<ScrapingJob[]> {
    // Return empty array for now until scraping_jobs table is created
    return [];
  }

  static async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  }

  static async getJobStatus(jobId: string): Promise<ScrapingJob | null> {
    // Return null for now until scraping_jobs table is created
    return null;
  }

  // For backward compatibility with existing Explore page
  static async crawlTopic(topic: string, sources?: string[]): Promise<any[]> {
    try {
      const result = await this.startScraping(topic, sources);
      
      // Return data in the format expected by the Explore page
      return [{
        source: 'Educational AI Generator',
        topic: topic,
        content: result.result.condensed_notes,
        url: `https://educational-content.ai/${topic.toLowerCase().replace(/\s+/g, '-')}`,
        crawled_at: result.result.created_at
      }];
    } catch (error) {
      console.error('Error in crawlTopic:', error);
      throw error;
    }
  }

  static async getCrawledContent(topic: string): Promise<ScrapedNote[]> {
    // Use existing notes table for now
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .ilike('title', `%${topic}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    
    // Transform to scraped notes format
    return (data || []).map(note => ({
      id: note.id,
      topic: note.title,
      key_points: [],
      sources: ['User Notes'],
      condensed_notes: note.content,
      raw_data: note,
      created_at: note.created_at,
      updated_at: note.updated_at,
      user_id: note.user_id
    }));
  }
}