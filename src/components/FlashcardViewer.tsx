import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Flashcard } from "@/services/aiService";

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onClose: () => void;
}

export function FlashcardViewer({ flashcards, onClose }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    setIsFlipped(false);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    setIsFlipped(false);
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Flashcard {currentIndex + 1} of {flashcards.length}
        </h3>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <Card className="h-64 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <CardContent className="h-full flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-lg mb-4">
              {isFlipped ? currentCard.back : currentCard.front}
            </div>
            <div className="text-sm text-muted-foreground">
              {isFlipped ? "Answer" : "Click to reveal answer"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prevCard} disabled={flashcards.length <= 1}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <Button variant="outline" onClick={() => setIsFlipped(!isFlipped)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Flip
        </Button>
        
        <Button variant="outline" onClick={nextCard} disabled={flashcards.length <= 1}>
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}