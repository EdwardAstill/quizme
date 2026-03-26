import type { QuizItem } from "../types/quiz";

export function validateAnswerIndex(item: QuizItem) {
  if (item.type === "single") {
    if (typeof item.answer !== "number" || item.answer < 0 || item.answer >= item.options.length) {
      throw new Error(
        `Invalid answer index ${item.answer} for question "${item.question}" with ${item.options.length} options`
      );
    }
  }
  if (item.type === "multi") {
    if (!Array.isArray(item.answers)) {
      throw new Error(`Multi question "${item.question}" must have an answers array`);
    }
    for (const idx of item.answers) {
      if (typeof idx !== "number" || idx < 0 || idx >= item.options.length) {
        throw new Error(
          `Invalid answer index ${idx} for question "${item.question}" with ${item.options.length} options`
        );
      }
    }
  }
}
