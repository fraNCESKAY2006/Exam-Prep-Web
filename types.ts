export type ExamType = 'WAEC' | 'NECO' | 'GCE';

export type Subject = 
  | 'Mathematics' 
  | 'English Language' 
  | 'Biology' 
  | 'Physics' 
  | 'Chemistry' 
  | 'Government' 
  | 'Economics' 
  | 'Civic Education' 
  | 'Literature in English';

export interface ExamConfig {
  examType: ExamType;
  year: string;
  subject: Subject;
  topic: string;
}

export interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number; // 0-3
}

export interface QuestionResult {
  questionId: number;
  questionText: string;
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, number>; // questionId -> selectedOptionIndex
  isCompleted: boolean;
}

export type AppView = 'HOME' | 'TUTORIAL' | 'QUIZ' | 'RESULT' | 'EXPLANATION_DETAIL';