import { useEffect } from "react";
import type { QuizPhase } from "./useQuiz";

interface KeyboardNavOptions {
  phase: QuizPhase;
  nextQuestion: () => void;
  prevQuestion: () => void;
}

export function useKeyboardNav({
  phase,
  nextQuestion,
  prevQuestion,
}: KeyboardNavOptions): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "active") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevQuestion();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, nextQuestion, prevQuestion]);
}
