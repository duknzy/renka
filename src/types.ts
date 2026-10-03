export interface MemorizationPoint {
  id: string;
  question?: string;
  answer?: string;
  content?: string;
  note?: string;
  category?: string;
  subject?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lesson {
  title: string;
  subject?: string;
  createdAt?: string;
  updatedAt?: string;
  orderIndex?: number;
  memorizationPoints?: MemorizationPoint[];
}

export interface Problem {
  title?: string;
  subject?: string;
  unit?: string;
  insight?: string;
}

export interface MemorizeProgress {
  boxLevel: number;
  nextReviewDate: string | null;
  lastReviewedAt?: number;
  reps: number;
  lapses: number;
  updatedAt: number;
}

export interface CardItem {
  id: string;
  progressKey: string;
  lessonId?: string;
  memoId?: string;
  problemId?: string;
  sourceType: "lesson" | "problem";
  sourceTitle: string;
  subject: string;
  category: string;
  question: string;
  answer: string;
  note: string;
  boxLevel: number;
  reps: number;
  lapses: number;
  nextReviewDate: string | null;
  isDue: boolean;
  isDueStrict: boolean;
  isMastered: boolean;
  userMemo?: string;
}

export type RatingType = "again" | "hard" | "good" | "easy";

export interface MemorizePlan {
  targetLessons?: string[];
  dailyTarget: number;
  orderType: "orderIndex" | "srs_priority";
}
