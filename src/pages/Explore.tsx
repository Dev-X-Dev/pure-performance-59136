import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Search, ExternalLink, BookOpen, Sparkles, Download } from "lucide-react";
import { store } from "@/lib/store";
import { CrawlerService, CrawlResult } from "@/services/crawlerService";
import { AIService } from "@/services/aiService";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState<CrawlResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [condensedContent, setCondensedContent] = useState<string>("");
  const [condensing, setCondensing] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setCondensedContent("");
    
    try {
      // Add to recent topics
      const recents = store.get<string[]>("recent:topics", []);
      const next = [searchQuery, ...recents.filter((x) => x !== searchQuery)].slice(0, 8);
      store.set("recent:topics", next);
      
      // Update URL
      setParams({ q: searchQuery });
      
      // Crawl educational sites for real content
      const crawlResults = await CrawlerService.crawlTopic(searchQuery);
      setResults(crawlResults);
      
      if (crawlResults.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different search term or check back later.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Content found!",
          description: `Found ${crawlResults.length} educational resources on ${searchQuery}`
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

  useEffect(() => {
    const initialQuery = params.get("q");
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [params]);

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
                      <div>
                        <CardTitle className="text-lg mb-1">
                          {result.topic} - {result.source}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          <Badge variant="secondary">{result.source}</Badge>
                        </CardDescription>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {result.content.substring(0, 200)}...
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Study This
                      </Button>
                      <Button size="sm" variant="ghost">
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
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Save as Note
                        </Button>
                        <Button size="sm" variant="outline">
                          Generate Flashcards
                        </Button>
                        <Button size="sm" variant="outline">
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
        )}
      </div>
    </AppLayout>
  );
}