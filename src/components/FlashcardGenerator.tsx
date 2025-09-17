import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AIService, Flashcard } from "@/services/aiService";
import { FlashcardViewer } from "./FlashcardViewer";
import { useToast } from "@/components/ui/use-toast";

interface FlashcardGeneratorProps {
  noteIds: string[];
  onClose: () => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export function FlashcardGenerator({ noteIds, onClose, difficulty = 'medium' }: FlashcardGeneratorProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateFlashcards();
  }, [noteIds, difficulty]);

  const generateFlashcards = async () => {
    if (noteIds.length === 0) {
      toast({
        title: "No notes selected",
        description: "Please select some notes to generate flashcards from.",
        variant: "destructive"
      });
      onClose();
      return;
    }

    setLoading(true);
    try {
      const cards = await AIService.generateFlashcards(noteIds, difficulty);
      setFlashcards(cards);
      
      if (cards.length === 0) {
        toast({
          title: "No flashcards generated",
          description: "Try selecting different notes or check your content.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      toast({
        title: "Generation failed",
        description: "There was an error generating flashcards. Please try again.",
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
          <h2 className="text-2xl font-semibold">Generating Flashcards</h2>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-lg font-medium mb-2">Creating flashcards...</p>
            <p className="text-muted-foreground text-center">
              AI is analyzing your notes and generating study flashcards
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Flashcards</h2>
          <Button variant="outline" onClick={onClose}>
            Back to Notes
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🎴</div>
            <p className="text-lg font-medium mb-2">No flashcards generated</p>
            <p className="text-muted-foreground text-center mb-4">
              Unable to generate flashcards from the selected notes.
            </p>
            <Button onClick={generateFlashcards}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <FlashcardViewer flashcards={flashcards} onClose={onClose} />;
}