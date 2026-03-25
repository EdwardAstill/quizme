import { useState, useCallback } from "react";
import type { Quiz, Question, AnswerRecord } from "../types/quiz";

export type QuizPhase = "loading" | "active" | "finished";

export function useQuiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [phase, setPhase] = useState<QuizPhase>("loading");

  const startQuiz = useCallback((q: Quiz) => {
    setQuiz(q);
    setCurrentIndex(0);
    setAnswers([]);
    setPhase("active");
  }, []);

  const currentQuestion: Question | null =
    quiz && currentIndex < quiz.questions.length
      ? quiz.questions[currentIndex]
      : null;

  const submitAnswer = useCallback(
    (userAnswer: string | string[] | boolean) => {
      if (!currentQuestion) return;

      const correct = checkAnswer(currentQuestion, userAnswer);
      const record: AnswerRecord = {
        questionId: currentQuestion.id,
        userAnswer,
        correct,
      };

      setAnswers((prev) => [...prev, record]);
    },
    [currentQuestion]
  );

  const nextQuestion = useCallback(() => {
    if (!quiz) return;
    if (currentIndex + 1 >= quiz.questions.length) {
      setPhase("finished");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [quiz, currentIndex]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setAnswers([]);
    setPhase("active");
  }, []);

  const score = answers.filter((a) => a.correct).length;

  return {
    quiz,
    phase,
    currentIndex,
    currentQuestion,
    answers,
    score,
    total: quiz?.questions.length ?? 0,
    startQuiz,
    submitAnswer,
    nextQuestion,
    restart,
    reset: () => setPhase("loading"),
  };
}

function checkAnswer(
  question: Question,
  userAnswer: string | string[] | boolean
): boolean {
  switch (question.type) {
    case "single":
      return question.answer === userAnswer;
    case "multi": {
      if (!Array.isArray(userAnswer)) return false;
      const sorted = [...userAnswer].sort();
      const expected = [...question.answers].sort();
      return (
        sorted.length === expected.length &&
        sorted.every((v, i) => v === expected[i])
      );
    }
    case "truefalse":
      return question.answer === userAnswer;
    case "freetext": {
      if (typeof userAnswer !== "string") return false;
      const a = question.caseSensitive
        ? userAnswer.trim()
        : userAnswer.trim().toLowerCase();
      const b = question.caseSensitive
        ? question.answer.trim()
        : question.answer.trim().toLowerCase();
      return a === b;
    }
  }
}
