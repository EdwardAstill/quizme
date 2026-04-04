import { useState, useCallback } from "react";
import type { Quiz, QuizItem, Question, AnswerRecord, SubmitAnswer } from "../types/quiz";
import { checkAnswer } from "../utils/checkAnswer";
import { useQuizNavigation } from "./useQuizNavigation";
import { useQuizScoring } from "./useQuizScoring";

export type QuizPhase = "loading" | "active" | "finished";

export function useQuiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Map<string, AnswerRecord>>(new Map());
  const [phase, setPhase] = useState<QuizPhase>("loading");

  const { reset: resetNav, ...nav } = useQuizNavigation(quiz);
  const scoring = useQuizScoring(nav.flatItems, nav.currentIndex, answers);

  const startQuiz = useCallback((q: Quiz) => {
    setQuiz(q);
    resetNav();
    setAnswers(new Map());
    setPhase("active");
  }, [resetNav]);

  const submitAnswer: SubmitAnswer = useCallback(
    (questionId, userAnswer) => {
      const question = findQuestion(nav.flatItems, questionId);
      if (!question) return;

      const correct = checkAnswer(question, userAnswer);
      const record: AnswerRecord = { questionId, userAnswer, correct };

      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, record);
        return next;
      });
    },
    [nav.flatItems]
  );

  const finish = useCallback(() => setPhase("finished"), []);

  const restart = useCallback(() => {
    resetNav();
    setAnswers(new Map());
    setPhase("active");
  }, [resetNav]);

  return {
    quiz,
    phase,
    currentIndex: nav.currentIndex,
    currentItem: nav.currentItem,
    flatItems: nav.flatItems,
    answers,
    score: scoring.score,
    totalQuestions: scoring.totalQuestions,
    allQuestions: scoring.allQuestions,
    itemStatuses: scoring.itemStatuses,
    allAnswered: scoring.allAnswered,
    startQuiz,
    submitAnswer,
    goTo: nav.goTo,
    nextQuestion: nav.nextQuestion,
    prevQuestion: nav.prevQuestion,
    finish,
    restart,
    reset: () => setPhase("loading"),
  };
}

function findQuestion(flatItems: QuizItem[], id: string): Question | undefined {
  for (const item of flatItems) {
    if (item.type === "group") {
      const found = item.parts.find((p) => p.id === id);
      if (found) return found;
    } else if (item.type !== "info" && item.id === id) {
      return item;
    }
  }
  return undefined;
}
