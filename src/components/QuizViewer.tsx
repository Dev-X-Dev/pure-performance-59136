import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";
import { QuizQuestion } from "@/services/aiService";

interface QuizViewerProps {
  questions: QuizQuestion[];
  onClose: () => void;
}

export function QuizViewer({ questions, onClose }: QuizViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = () => {
    const answerIndex = parseInt(selectedAnswer);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = answerIndex;
    setAnswers(newAnswers);

    if (answerIndex === currentQuestion.correct) {
      setScore(score + 1);
    }

    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer("");
      setShowResult(false);
    } else {
      // Quiz completed
      alert(`Quiz completed! Your score: ${score}/${questions.length}`);
    }
  };

  const isCorrect = showResult && parseInt(selectedAnswer) === currentQuestion.correct;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Question {currentIndex + 1} of {questions.length}
        </h3>
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground">Score: {score}/{questions.length}</span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem 
                  value={index.toString()} 
                  id={`option-${index}`}
                  disabled={showResult}
                />
                <Label 
                  htmlFor={`option-${index}`} 
                  className={`flex-1 cursor-pointer ${
                    showResult
                      ? index === currentQuestion.correct
                        ? "text-green-600 font-semibold"
                        : index === parseInt(selectedAnswer) && index !== currentQuestion.correct
                        ? "text-red-600"
                        : ""
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {option}
                    {showResult && index === currentQuestion.correct && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {showResult && index === parseInt(selectedAnswer) && index !== currentQuestion.correct && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {showResult && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {isCorrect ? "Correct!" : "Incorrect"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            {!showResult ? (
              <Button 
                onClick={handleAnswer} 
                disabled={!selectedAnswer}
                className="w-full"
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={nextQuestion} className="w-full">
                {currentIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}