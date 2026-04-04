import { useEffect } from "react";
import type { Quiz } from "../types/quiz";

export function useQuizLoader(startQuiz: (q: Quiz) => void): void {
  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => {
        if (!r.ok) throw new Error("No CLI quiz");
        return r.json();
      })
      .then((data) => startQuiz(data as Quiz))
      .catch(() => {
        // Not served via CLI — user will pick a file
      });
  }, [startQuiz]);
}
