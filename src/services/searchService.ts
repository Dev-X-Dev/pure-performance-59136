import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  note_type: string;
  sources: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  rank: number;
}

export class SearchService {
  static async searchAllContent(searchTerm: string): Promise<SearchResult[]> {
    try {
      const { data, error } = await supabase.rpc('search_all_content', {
        search_term: searchTerm
      });

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Search service error:', error);
      return [];
    }
  }

  static async getRecentTopics(limit: number = 10): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc('get_recent_topics', {
        limit_count: limit
      });

      if (error) {
        console.error('Recent topics error:', error);
        return [];
      }

      return (data || []).map((item: any) => item.topic);
    } catch (error) {
      console.error('Recent topics service error:', error);
      return [];
    }
  }

  static async trackRecentTopic(topic: string, topicType: string = 'search'): Promise<void> {
    try {
      await supabase.rpc('track_recent_topic', {
        topic_text: topic,
        topic_type_text: topicType
      });
    } catch (error) {
      console.error('Track topic error:', error);
    }
  }
}
