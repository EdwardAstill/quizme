import { useState, useCallback, useMemo } from "react";
import type {
  Quiz,
  QuizItem,
  Question,
  AnswerRecord,
  ItemStatus,
} from "../types/quiz";

export type QuizPhase = "loading" | "active" | "finished";

export function useQuiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AnswerRecord>>(new Map());
  const [phase, setPhase] = useState<QuizPhase>("loading");
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set());

  const startQuiz = useCallback((q: Quiz) => {
    setQuiz(q);
    setCurrentIndex(0);
    setAnswers(new Map());
    setVisitedIndices(new Set([0]));
    setPhase("active");
  }, []);

  const currentItem: QuizItem | null =
    quiz && currentIndex < quiz.questions.length
      ? quiz.questions[currentIndex]
      : null;

  const submitAnswer = useCallback(
    (questionId: string, userAnswer: string | string[] | boolean) => {
      const question = findQuestion(quiz, questionId);
      if (!question) return;

      const correct = checkAnswer(question, userAnswer);
      const record: AnswerRecord = { questionId, userAnswer, correct };

      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, record);
        return next;
      });
    },
    [quiz]
  );

  const goTo = useCallback(
    (index: number) => {
      if (!quiz || index < 0 || index >= quiz.questions.length) return;
      setCurrentIndex(index);
      setVisitedIndices((prev) => new Set(prev).add(index));
    },
    [quiz]
  );

  const nextQuestion = useCallback(() => {
    if (!quiz) return;
    if (currentIndex + 1 >= quiz.questions.length) return;
    goTo(currentIndex + 1);
  }, [quiz, currentIndex, goTo]);

  const prevQuestion = useCallback(() => {
    if (currentIndex <= 0) return;
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const finish = useCallback(() => {
    setPhase("finished");
  }, []);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setAnswers(new Map());
    setVisitedIndices(new Set([0]));
    setPhase("active");
  }, []);

  /** Get all individual questions flattened from items */
  const allQuestions = useMemo(() => {
    if (!quiz) return [];
    return quiz.questions.flatMap((item) =>
      item.type === "group" ? item.parts : [item]
    );
  }, [quiz]);

  const score = useMemo(() => {
    let correct = 0;
    for (const record of answers.values()) {
      if (record.correct) correct++;
    }
    return correct;
  }, [answers]);

  const totalQuestions = allQuestions.length;

  /** Get the status of each top-level quiz item */
  const itemStatuses: ItemStatus[] = useMemo(() => {
    if (!quiz) return [];
    return quiz.questions.map((item, i) => {
      if (i === currentIndex) return "current";
      if (item.type === "group") {
        const partAnswers = item.parts.map((p) => answers.get(p.id));
        const answered = partAnswers.filter(Boolean);
        if (answered.length === 0) {
          return visitedIndices.has(i) ? "unanswered" : "unanswered";
        }
        if (answered.length < item.parts.length) return "partial";
        return answered.every((a) => a!.correct) ? "correct" : "wrong";
      } else {
        const record = answers.get(item.id);
        if (!record) {
          return visitedIndices.has(i) ? "unanswered" : "unanswered";
        }
        return record.correct ? "correct" : "wrong";
      }
    });
  }, [quiz, currentIndex, answers, visitedIndices]);

  /** Check if all questions have been answered */
  const allAnswered = allQuestions.length > 0 && allQuestions.every((q) => answers.has(q.id));

  return {
    quiz,
    phase,
    currentIndex,
    currentItem,
    answers,
    score,
    totalQuestions,
    allQuestions,
    itemStatuses,
    allAnswered,
    startQuiz,
    submitAnswer,
    goTo,
    nextQuestion,
    prevQuestion,
    finish,
    restart,
    reset: () => setPhase("loading"),
  };
}

function findQuestion(quiz: Quiz | null, id: string): Question | undefined {
  if (!quiz) return undefined;
  for (const item of quiz.questions) {
    if (item.type === "group") {
      const found = item.parts.find((p) => p.id === id);
      if (found) return found;
    } else if (item.id === id) {
      return item;
    }
  }
  return undefined;
}

export function checkAnswer(
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
