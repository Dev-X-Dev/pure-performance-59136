import { EducationalScraperService } from "@/services/educationalScraperService";

export interface CrawlResult {
  source: string;
  topic: string;
  content: string;
  url: string;
  crawled_at: string;
}

export class CrawlerService {
  static async crawlTopic(topic: string, sources?: string[]): Promise<CrawlResult[]> {
    try {
      return await EducationalScraperService.crawlTopic(topic, sources);
    } catch (error) {
      console.error('Crawler service error:', error);
      throw error;
    }
  }

  static async getCrawledContent(topic: string): Promise<CrawlResult[]> {
    try {
      const notes = await EducationalScraperService.getCrawledContent(topic);
      return notes.map(note => ({
        source: 'Educational AI Content',
        topic: note.topic,
        content: note.condensed_notes,
        url: `#/notes/${note.id}`,
        crawled_at: note.created_at
      }));
    } catch (error) {
      console.error('Error getting crawled content:', error);
      return [];
    }
  }
}