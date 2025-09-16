import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Search, ExternalLink, BookOpen } from "lucide-react";
import { store } from "@/lib/store";

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    
    // Add to recent topics
    const recents = store.get<string[]>("recent:topics", []);
    const next = [searchQuery, ...recents.filter((x) => x !== searchQuery)].slice(0, 8);
    store.set("recent:topics", next);
    
    // Update URL
    setParams({ q: searchQuery });
    
    // Simulate API call - in real app, this would call your AI/search service
    setTimeout(() => {
      setResults([
        {
          title: `Understanding ${searchQuery}`,
          snippet: `Learn the fundamentals and key concepts of ${searchQuery}. This comprehensive guide covers all essential aspects you need to know.`,
          source: "Study Guide",
          url: "#"
        },
        {
          title: `${searchQuery} - Practice Problems`,
          snippet: `Interactive exercises and practice problems to test your knowledge of ${searchQuery}. Improve your understanding through hands-on practice.`,
          source: "Practice Hub",
          url: "#"
        },
        {
          title: `Advanced ${searchQuery} Techniques`,
          snippet: `Dive deeper into advanced concepts and techniques related to ${searchQuery}. Perfect for students looking to expand their knowledge.`,
          source: "Advanced Learning",
          url: "#"
        }
      ]);
      setLoading(false);
    }, 1000);
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
                          {result.title}
                        </CardTitle>
                        <CardDescription className="text-sm text-primary">
                          {result.source}
                        </CardDescription>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {result.snippet}
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