import { useMemo } from "react";
import type { QuizItem, Question, AnswerRecord, ItemStatus } from "../types/quiz";

export function useQuizScoring(
  flatItems: QuizItem[],
  currentIndex: number,
  answers: Map<string, AnswerRecord>
) {
  const allQuestions: Question[] = useMemo(() => {
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

  const totalQuestions = allQuestions.length;
  const allAnswered = allQuestions.length > 0 && allQuestions.every((q) => answers.has(q.id));

  return { allQuestions, score, totalQuestions, itemStatuses, allAnswered };
}
