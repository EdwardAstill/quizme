import type { Quiz } from "../types/quiz";
import { parseJson } from "./parseJson";
import { parseMarkdown } from "./parseMarkdown";

export function parseQuiz(content: string, filename: string): Quiz {
  const ext = filename.toLowerCase();
  if (ext.endsWith(".quiz.md")) {
    return parseMarkdown(content);
  }
  // .quiz, .json, or fallback
  return parseJson(content);
}
