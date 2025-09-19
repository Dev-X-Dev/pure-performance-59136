import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { EducationalScraperService, ScrapedNote, ScrapingJob } from '@/services/educationalScraperService';
import { useToast } from "@/components/ui/use-toast";

export function useEducationalScraper() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScrapedNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scrapingJobs, setScrapingJobs] = useState<ScrapingJob[]>([]);
  const { toast } = useToast();

  // Search existing notes
  const searchNotes = useCallback(async (searchTerm: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await EducationalScraperService.searchNotes(searchTerm);
      setResults(data);
      
      toast({
        title: "Search completed",
        description: `Found ${data.length} notes`,
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Search failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Start a new scraping job
  const startScraping = useCallback(async (topic: string, sources: string[] = ['educational']) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const result = await EducationalScraperService.startScraping(topic, sources);
      
      // Add the new result to our results
      setResults(prev => [result.result, ...prev]);
      
      toast({
        title: "Scraping completed",
        description: `Educational content for "${topic}" has been generated`,
      });
      
      return result;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Scraping failed",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch user's scraping jobs
  const fetchScrapingJobs = useCallback(async () => {
    try {
      const data = await EducationalScraperService.fetchScrapingJobs();
      setScrapingJobs(data);
    } catch (err: any) {
      console.error('Error fetching scraping jobs:', err);
    }
  }, []);

  // Fetch user's saved notes
  const fetchSavedNotes = useCallback(async (limit: number = 50) => {
    try {
      setIsLoading(true);
      const data = await EducationalScraperService.fetchSavedNotes(limit);
      setResults(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Failed to fetch notes",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await EducationalScraperService.deleteNote(noteId);
      
      // Update local state
      setResults(prev => prev.filter(note => note.id !== noteId));
      
      toast({
        title: "Note deleted",
        description: "The note has been successfully deleted",
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Subscribe to real-time updates for scraping jobs
  useEffect(() => {
    fetchScrapingJobs();

    const channel = supabase
      .channel('scraping_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraping_jobs'
        },
        (payload) => {
          console.log('Scraping job updated:', payload);
          fetchScrapingJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchScrapingJobs]);

  return {
    isLoading,
    results,
    error,
    scrapingJobs,
    searchNotes,
    startScraping,
    fetchSavedNotes,
    deleteNote,
    fetchScrapingJobs
  };
}