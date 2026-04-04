import type { Question } from "../types/quiz";

export function checkAnswer(
  question: Question,
  userAnswer: number | number[] | boolean | string
): boolean {
  switch (question.type) {
    case "single":
      return question.correctAnswer === userAnswer;
    case "multi": {
      if (!Array.isArray(userAnswer)) return false;
      const sorted = [...userAnswer].sort((a, b) => a - b);
      const expected = [...question.correctAnswers].sort((a, b) => a - b);
      return (
        sorted.length === expected.length &&
        sorted.every((v, i) => v === expected[i])
      );
    }
    case "truefalse":
      return question.correctAnswer === userAnswer;
    case "freetext": {
      if (typeof userAnswer !== "string") return false;
      const a = question.caseSensitive
        ? userAnswer.trim()
        : userAnswer.trim().toLowerCase();
      const b = question.caseSensitive
        ? question.correctAnswer.trim()
        : question.correctAnswer.trim().toLowerCase();
      return a === b;
    }
  }
}
