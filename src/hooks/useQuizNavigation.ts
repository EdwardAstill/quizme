import { useState, useCallback, useMemo } from "react";
import type { Quiz, QuizItem } from "../types/quiz";

export function useQuizNavigation(quiz: Quiz | null) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatItems: QuizItem[] = useMemo(() => {
    if (!quiz) return [];
    return quiz.items.flatMap((item) =>
      item.type === "section" ? item.items : [item]
    );
  }, [quiz]);

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

  const reset = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const currentItem: QuizItem | null =
    flatItems.length > 0 && currentIndex < flatItems.length
      ? flatItems[currentIndex]
      : null;

  return {
    flatItems,
    currentIndex,
    currentItem,
    goTo,
    nextQuestion,
    prevQuestion,
    reset,
  };
}
