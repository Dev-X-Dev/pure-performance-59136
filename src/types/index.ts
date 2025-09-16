/**
 * Shared types for NoteNest application
 */

// Brand-wide entities
export type ID = string;

export interface DemoResponse {
  message: string;
}

// Notes
export interface Note {
  id: ID;
  title: string;
  content: string; // markdown-ish text
  tags: string[];
  created_at: string; // ISO
  updated_at: string; // ISO
  source?: { name: string; url?: string };
  is_favorite?: boolean;
  user_id: string;
}

export interface ExploreSourceItem {
  title: string;
  url: string;
  snippet: string;
  source: string; // domain/source name
}

export interface ExploreResponse {
  query: string;
  items: ExploreSourceItem[];
  condensed: string[]; // bullet points
}

// Flashcards & Quizzes
export interface Flashcard {
  id: ID;
  front: string;
  back: string;
  tag?: string;
}

export type QuizQuestionType = "mcq" | "fill";

export interface QuizChoice {
  id: ID;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: ID;
  type: QuizQuestionType;
  prompt: string;
  choices?: QuizChoice[]; // for mcq
  answer?: string; // for fill-in
  explanation?: string;
}

export interface QuizPack {
  id: ID;
  title: string;
  questions: QuizQuestion[];
  createdFromNoteId?: ID;
}

// AI-like helpers
export interface SummarizeRequest {
  text: string;
  maxBullets?: number;
}
export interface SummarizeResponse {
  bullets: string[];
}

export interface SolveRequest {
  topic: string; // e.g. "derivative rules"
  problem: string; // free text
}
export interface SolveStep {
  step: string;
  detail?: string;
}
export interface SolveResponse {
  steps: SolveStep[];
  finalAnswer?: string;
}

export interface GenerateQuizRequest {
  text: string; // source material
  count?: number;
}
export interface GenerateQuizResponse {
  pack: QuizPack;
}

// Small helpers
export const uid = () => Math.random().toString(36).slice(2);