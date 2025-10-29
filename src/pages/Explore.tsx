import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Search, ExternalLink, BookOpen, Sparkles, Download } from "lucide-react";
import { store } from "@/lib/store";
import { CrawlerService, CrawlResult } from "@/services/crawlerService";
import { supabase } from "@/integrations/supabase/client";
import { AIService } from "@/services/aiService";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { NoteEditor } from "@/components/NoteEditor";
import { Note } from "@/types";

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState<CrawlResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [condensedContent, setCondensedContent] = useState<string>("");
  const [condensing, setCondensing] = useState(false);
  const [studyingResult, setStudyingResult] = useState<CrawlResult | null>(null);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setCondensedContent("");

    try {
      // Track recent topic in database
      if (user) {
        await supabase.rpc('track_recent_topic', {
          topic_text: searchQuery,
          topic_type_text: 'search'
        });
      }

      // Also store locally for non-authenticated users
      const recents = store.get<string[]>("recent:topics", []);
      const next = [searchQuery, ...recents.filter((x) => x !== searchQuery)].slice(0, 8);
      store.set("recent:topics", next);

      // Update URL
      setParams({ q: searchQuery });

      // Try the multi-source web scraper first for real educational content
      try {
        const { data, error: scraperError } = await supabase.functions.invoke('web-scraper', {
          body: { topic: searchQuery }
        });

        if (!scraperError && data?.results?.length > 0) {
          console.log('Web scraper found', data.results.length, 'sources');
          const webResults = data.results.map((result: any) => ({
            source: result.source,
            topic: searchQuery,
            content: result.content,
            url: result.url,
            crawled_at: new Date().toISOString()
          }));
          setResults(webResults);
        } else {
          console.log('Web scraper returned no results, using AI fallback');
          const crawlResults = await CrawlerService.crawlTopic(searchQuery);
          setResults(crawlResults);
        }
      } catch (scraperErr) {
        console.error('Web scraper error, using AI fallback:', scraperErr);
        const crawlResults = await CrawlerService.crawlTopic(searchQuery);
        setResults(crawlResults);
      }

      if (results.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different search term or check back later.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Content found!",
          description: `Found educational resources from multiple sources`
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "There was an error searching for content. Please try again.",
        variant: "destructive"
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCondenseContent = async () => {
    if (results.length === 0) return;

    setCondensing(true);
    try {
      const allContent = results.map(r => r.content).join('\n\n');
      const condensed = await AIService.condenseNotes(allContent);
      setCondensedContent(condensed);

      toast({
        title: "Content condensed!",
        description: "AI has summarized the key points from all sources."
      });
    } catch (error) {
      console.error("Condensing error:", error);
      toast({
        title: "Condensing failed",
        description: "There was an error condensing the content.",
        variant: "destructive"
      });
    } finally {
      setCondensing(false);
    }
  };

  const handleStudyThis = (result: CrawlResult) => {
    setStudyingResult(result);
  };

  const handleSaveToNotes = async (result: CrawlResult) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save notes.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: `${result.topic} - ${result.source}`,
          content: result.content,
          tags: [result.topic, result.source]
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Note saved!",
        description: "Content has been saved to your notes."
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: "There was an error saving the note.",
        variant: "destructive"
      });
    }
  };

  const handleSaveCondensed = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save notes.",
        variant: "destructive"
      });
      return;
    }

    if (!condensedContent) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: `${params.get("q")} - AI Summary`,
          content: condensedContent,
          tags: [params.get("q") || 'summary', 'ai-condensed']
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Summary saved!",
        description: "AI summary has been saved to your notes."
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: "There was an error saving the summary.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const initialQuery = params.get("q");
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [params]);

  useEffect(() => {
    const loadRecentTopics = async () => {
      if (user) {
        try {
          const { data, error } = await supabase.rpc('get_recent_topics', { limit_count: 8 });
          if (!error && data) {
            setRecentTopics(data.map((item: any) => item.topic));
          }
        } catch (error) {
          console.error('Error loading recent topics:', error);
        }
      }

      const localRecents = store.get<string[]>("recent:topics", []);
      if (!user && localRecents.length > 0) {
        setRecentTopics(localRecents);
      }
    };

    loadRecentTopics();
  }, [user]);

  if (studyingResult) {
    const noteForStudying: Note = {
      id: 'temp-' + Date.now(),
      title: `${studyingResult.topic} - ${studyingResult.source}`,
      content: studyingResult.content,
      tags: [studyingResult.topic, studyingResult.source],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user?.id || '',
      source: { name: studyingResult.source, url: studyingResult.url }
    };

    return (
      <AppLayout>
        <NoteEditor
          note={noteForStudying}
          onClose={() => setStudyingResult(null)}
          onSave={async (noteData) => {
            if (!user) {
              toast({
                title: "Authentication required",
                description: "Please sign in to save notes.",
                variant: "destructive"
              });
              return;
            }

            try {
              const { error } = await supabase
                .from('notes')
                .insert({
                  user_id: user.id,
                  ...noteData
                });

              if (error) throw error;

              toast({
                title: "Note saved!",
                description: "Your study note has been saved."
              });
              setStudyingResult(null);
            } catch (error) {
              console.error("Save error:", error);
              toast({
                title: "Save failed",
                description: "There was an error saving the note.",
                variant: "destructive"
              });
            }
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Explore Topics</h1>
          <p className="text-muted-foreground">
            Search any topic to find AI-generated summaries, study materials, and resources
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Topic Search
            </CardTitle>
            <CardDescription>
              Enter any topic you want to learn about
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(query);
              }}
              className="flex gap-2"
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try 'Photosynthesis', 'World War II', 'Calculus'..."
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">
              Results for "{params.get("q")}"
            </h2>
            
            <div className="grid gap-4">
              {results.map((result, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {result.topic} - {result.source}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          <Badge variant="secondary">{result.source}</Badge>
                        </CardDescription>
                      </div>
                      {result.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => window.open(result.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {result.content.substring(0, 200)}...
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStudyThis(result)}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Study This
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSaveToNotes(result)}
                      >
                        Save to Notes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* AI Condensing Section */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Content Summary
                  </CardTitle>
                  <CardDescription>
                    Get AI-powered condensed notes from all sources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleCondenseContent} 
                    disabled={condensing}
                    className="w-full"
                  >
                    {condensing ? "Condensing with AI..." : "Condense All Content with AI"}
                  </Button>
                  
                  {condensedContent && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Condensed Study Notes:</h4>
                      <Textarea
                        value={condensedContent}
                        readOnly
                        className="min-h-[200px] bg-muted"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSaveCondensed}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Save as Note
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleSaveCondensed();
                            navigate('/notes');
                          }}
                        >
                          Generate Flashcards
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleSaveCondensed();
                            navigate('/notes?quiz=true');
                          }}
                        >
                          Create Quiz
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !params.get("q") && (
          <div className="space-y-4">
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">Explore Any Topic</h3>
              <p className="text-muted-foreground mb-6">
                Search for any subject and get AI-powered study materials, summaries, and resources
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Photosynthesis", "Machine Learning", "World History", "Calculus", "Chemistry"].map((topic) => (
                  <Button
                    key={topic}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(topic);
                      handleSearch(topic);
                    }}
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </Card>

            {recentTopics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Searches</CardTitle>
                  <CardDescription>
                    Quick access to your recent topics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {recentTopics.map((topic, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => {
                          setQuery(topic);
                          handleSearch(topic);
                        }}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}