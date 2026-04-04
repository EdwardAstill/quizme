import { useState, useCallback, useMemo } from "react";
import type {
  Quiz,
  QuizItem,
  Question,
  AnswerRecord,
  ItemStatus,
} from "../types/quiz";
import { checkAnswer } from "../utils/checkAnswer";

export type QuizPhase = "loading" | "active" | "finished";

export function useQuiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AnswerRecord>>(new Map());
  const [phase, setPhase] = useState<QuizPhase>("loading");

  const flatItems: QuizItem[] = useMemo(() => {
    if (!quiz) return [];
    return quiz.items.flatMap((item) =>
      item.type === "section" ? item.items : [item]
    );
  }, [quiz]);

  const startQuiz = useCallback((q: Quiz) => {
    setQuiz(q);
    setCurrentIndex(0);
    setAnswers(new Map());
    setPhase("active");
  }, []);

  const currentItem: QuizItem | null =
    flatItems.length > 0 && currentIndex < flatItems.length
      ? flatItems[currentIndex]
      : null;

  const submitAnswer = useCallback(
    (questionId: string, userAnswer: number | number[] | boolean | string) => {
      const question = findQuestion(flatItems, questionId);
      if (!question) return;

      const correct = checkAnswer(question, userAnswer);
      const record: AnswerRecord = { questionId, userAnswer, correct };

      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, record);
        return next;
      });
    },
    [flatItems]
  );

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= flatItems.length) return;
      setCurrentIndex(index);
    },
    [flatItems]
  );

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= flatItems.length) return;
    goTo(currentIndex + 1);
  }, [flatItems, currentIndex, goTo]);

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
    setPhase("active");
  }, []);

  const allQuestions = useMemo(() => {
    return flatItems.flatMap((item) =>
      item.type === "group" ? item.parts : item.type === "info" ? [] : [item]
    );
  }, [flatItems]);

  const score = useMemo(() => {
    let correct = 0;
    for (const record of answers.values()) {
      if (record.correct) correct++;
    }
    return correct;
  }, [answers]);

  const totalQuestions = allQuestions.length;

  const itemStatuses: ItemStatus[] = useMemo(() => {
    return flatItems.map((item, i) => {
      if (i === currentIndex) return "current";
      if (item.type === "info") return "info";
      if (item.type === "group") {
        const partAnswers = item.parts.map((p) => answers.get(p.id));
        const answered = partAnswers.filter(Boolean);
        if (answered.length === 0) return "unanswered";
        if (answered.length < item.parts.length) return "partial";
        return answered.every((a) => a!.correct) ? "correct" : "wrong";
      } else {
        const record = answers.get(item.id);
        if (!record) return "unanswered";
        return record.correct ? "correct" : "wrong";
      }
    });
  }, [flatItems, currentIndex, answers]);

  const allAnswered = allQuestions.length > 0 && allQuestions.every((q) => answers.has(q.id));

  return {
    quiz,
    phase,
    currentIndex,
    currentItem,
    flatItems,
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
