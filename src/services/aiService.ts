import { supabase } from "@/integrations/supabase/client";

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export class AIService {
  static async condenseNotes(content: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('ai-processor', {
      body: { action: 'condense', content }
    });

    if (error) throw error;
    return data.result;
  }

  static async generateFlashcards(noteIds: string[], difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<Flashcard[]> {
    const { data, error } = await supabase.functions.invoke('ai-processor', {
      body: { action: 'flashcards', noteIds, difficulty }
    });

    if (error) throw error;
    return data.result;
  }

  static async generateQuiz(noteIds: string[], difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<QuizQuestion[]> {
    const { data, error } = await supabase.functions.invoke('ai-processor', {
      body: { action: 'quiz', noteIds, difficulty }
    });

    if (error) throw error;
    return data.result;
  }

  static async chatWithTutor(message: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('ai-processor', {
      body: { action: 'chat', message }
    });

    if (error) throw error;
    return data.result;
  }

  static async generatePracticeProblems(content: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('ai-processor', {
      body: { action: 'practice-problems', content, difficulty }
    });

    if (error) throw error;
    return data.result;
  }
}