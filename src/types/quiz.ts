export interface SingleChoiceQuestion {
  id: string;
  type: "single";
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface MultiChoiceQuestion {
  id: string;
  type: "multi";
  question: string;
  options: string[];
  answers: string[];
  explanation?: string;
}

export interface TrueFalseQuestion {
  id: string;
  type: "truefalse";
  question: string;
  answer: boolean;
  explanation?: string;
}

export interface FreeTextQuestion {
  id: string;
  type: "freetext";
  question: string;
  answer: string;
  caseSensitive?: boolean;
  placeholder?: string;
  explanation?: string;
}

export type Question =
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | TrueFalseQuestion
  | FreeTextQuestion;

/** A top-level quiz item — either a single question or a group of parts */
export type QuizItem = Question | QuestionGroup;

export interface QuestionGroup {
  id: string;
  type: "group";
  question: string;
  parts: Question[];
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
export type ItemStatus = "unanswered" | "current" | "correct" | "wrong" | "partial";
