import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AIService, QuizQuestion } from "@/services/aiService";
import { QuizViewer } from "./QuizViewer";
import { useToast } from "@/components/ui/use-toast";

interface QuizGeneratorProps {
  noteIds: string[];
  onClose: () => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export function QuizGenerator({ noteIds, onClose, difficulty = 'medium' }: QuizGeneratorProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateQuiz();
  }, [noteIds, difficulty]);

  const generateQuiz = async () => {
    if (noteIds.length === 0) {
      toast({
        title: "No notes selected",
        description: "Please select some notes to generate a quiz from.",
        variant: "destructive"
      });
      onClose();
      return;
    }

    setLoading(true);
    try {
      const quizQuestions = await AIService.generateQuiz(noteIds, difficulty);
      setQuestions(quizQuestions);
      
      if (quizQuestions.length === 0) {
        toast({
          title: "No quiz generated",
          description: "Try selecting different notes or check your content.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast({
        title: "Generation failed",
        description: "There was an error generating the quiz. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Generating Quiz</h2>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-lg font-medium mb-2">Creating quiz...</p>
            <p className="text-muted-foreground text-center">
              AI is analyzing your notes and generating quiz questions
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Quiz</h2>
          <Button variant="outline" onClick={onClose}>
            Back to Notes
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🧠</div>
            <p className="text-lg font-medium mb-2">No quiz generated</p>
            <p className="text-muted-foreground text-center mb-4">
              Unable to generate quiz questions from the selected notes.
            </p>
            <Button onClick={generateQuiz}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <QuizViewer questions={questions} onClose={onClose} />;
}