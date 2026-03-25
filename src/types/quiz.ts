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
  explanation?: string;
}

export type Question =
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | TrueFalseQuestion
  | FreeTextQuestion;

export interface Quiz {
  title: string;
  description?: string;
  questions: Question[];
}

export interface AnswerRecord {
  questionId: string;
  userAnswer: string | string[] | boolean;
  correct: boolean;
}
