import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, Brain, FileText } from 'lucide-react';
import { useEducationalScraper } from '@/hooks/useEducationalScraper';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function EducationalScraperDemo() {
  const [topic, setTopic] = useState('');
  const { isLoading, results, startScraping, searchNotes, error } = useEducationalScraper();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    try {
      await startScraping(topic);
      setTopic('');
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleSearch = async () => {
    if (!topic.trim()) return;
    
    try {
      await searchNotes(topic);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Educational Content Generator
          </CardTitle>
          <CardDescription>
            Generate comprehensive educational content using AI or search your existing notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a topic (e.g., 'photosynthesis', 'calculus derivatives')"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={isLoading}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={isLoading || !topic.trim()}
              className="min-w-[100px]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleSearch} 
              disabled={isLoading || !topic.trim()}
            >
              Search
            </Button>
          </div>
          
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              Error: {error}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Content ({results.length})
          </h3>
          
          <div className="grid gap-4">
            {results.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {note.topic}
                    </span>
                    <div className="flex gap-1">
                      {note.sources.map((source) => (
                        <Badge key={source} variant="secondary" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Created {new Date(note.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] w-full">
                    <div className="space-y-2 text-sm">
                      {note.key_points.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-1">Key Points:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {note.key_points.slice(0, 5).map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-semibold mb-1">Summary:</h4>
                        <p className="whitespace-pre-wrap">{note.condensed_notes}</p>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}