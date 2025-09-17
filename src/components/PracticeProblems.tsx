import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Eye, EyeOff } from "lucide-react";
import { AIService } from "@/services/aiService";
import { useToast } from "@/components/ui/use-toast";

interface PracticeProblemsProps {
  noteIds?: string[];
  content?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  onClose?: () => void;
}

export const PracticeProblems = ({ 
  noteIds = [], 
  content = "", 
  difficulty = 'medium',
  onClose 
}: PracticeProblemsProps) => {
  const [problems, setProblems] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const { toast } = useToast();

  const generateProblems = async () => {
    if (!content && noteIds.length === 0) {
      toast({
        title: "No content available",
        description: "Please select notes or provide content to generate problems from.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await AIService.generatePracticeProblems(
        content || noteIds.join(','), 
        difficulty
      );
      setProblems(result);
      setShowSolutions(false);
      
      toast({
        title: "Practice problems generated!",
        description: "Work through these problems to test your understanding."
      });
    } catch (error) {
      console.error("Error generating problems:", error);
      toast({
        title: "Generation failed",
        description: "There was an error generating practice problems.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            ✍️ Practice Problems
            <span className="text-sm font-normal bg-secondary px-2 py-1 rounded">
              {difficulty}
            </span>
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={generateProblems} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Problems
              </>
            )}
          </Button>
          
          {problems && (
            <Button
              variant="outline"
              onClick={() => setShowSolutions(!showSolutions)}
            >
              {showSolutions ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Solutions
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Solutions
                </>
              )}
            </Button>
          )}
        </div>

        {problems && (
          <ScrollArea className="h-[400px] w-full border rounded-md p-4">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {problems}
              </pre>
            </div>
          </ScrollArea>
        )}

        {!problems && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">🎯</div>
            <p>Click "Generate New Problems" to create practice problems</p>
            <p className="text-sm">Problems will be generated based on your selected notes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};