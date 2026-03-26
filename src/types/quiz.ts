export interface SingleChoiceQuestion {
  id: string;
  type: "single";
  question: string;
  options: string[];
  answer: string;
  hint?: string;
  explanation?: string;
}

export interface MultiChoiceQuestion {
  id: string;
  type: "multi";
  question: string;
  options: string[];
  answers: string[];
  hint?: string;
  explanation?: string;
}

export interface TrueFalseQuestion {
  id: string;
  type: "truefalse";
  question: string;
  answer: boolean;
  hint?: string;
  explanation?: string;
}

export interface FreeTextQuestion {
  id: string;
  type: "freetext";
  question: string;
  answer: string;
  caseSensitive?: boolean;
  placeholder?: string;
  hint?: string;
  explanation?: string;
}

export type Question =
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | TrueFalseQuestion
  | FreeTextQuestion;

export interface InfoPage {
  id: string;
  type: "info";
  content: string; // markdown
}

/** A top-level quiz item — a question, a group of parts, or an info page */
export type QuizItem = Question | QuestionGroup | InfoPage;

export interface QuestionGroup {
  id: string;
  type: "group";
  question: string;
  parts: Question[];
  hint?: string;
  explanation?: string;
}

export interface Quiz {
  title: string;
  description?: string;
  questions: QuizItem[];
}

export interface AnswerRecord {
  questionId: string;
  userAnswer: string | string[] | boolean;
  correct: boolean;
}

/** Status of a quiz item for the sidebar */
export type ItemStatus = "unanswered" | "current" | "correct" | "wrong" | "partial" | "info";
