import { supabase } from "@/integrations/supabase/client";

export interface CrawlResult {
  source: string;
  topic: string;
  content: string;
  url: string;
  crawled_at: string;
}

export class CrawlerService {
  static async crawlTopic(topic: string, sources?: string[]): Promise<CrawlResult[]> {
    const { data, error } = await supabase.functions.invoke('web-crawler', {
      body: { topic, sources }
    });

    if (error) throw error;
    return data.results || [];
  }

  static async getCrawledContent(topic: string): Promise<CrawlResult[]> {
    // For now, return empty array until crawled_content table is created
    // This will be replaced once the Supabase migration is run
    return [];
  }
}