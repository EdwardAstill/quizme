import type { Quiz, TopLevelItem, QuizItem } from "../types/quiz";

/**
 * Preprocesses raw quiz JSON: assigns IDs to items missing them
 * and validates basic structure. Returns a fully-typed Quiz.
 */
export function preprocessQuiz(raw: any): Quiz {
  if (!raw || typeof raw.title !== "string" || !Array.isArray(raw.questions)) {
    throw new Error("Invalid quiz: must have a title (string) and questions (array)");
  }

  let questionCounter = 0;
  let infoCounter = 0;
  let sectionCounter = 0;
  const allIds = new Set<string>();

  function trackId(id: string) {
    if (allIds.has(id)) {
      console.warn(`Duplicate quiz ID: "${id}"`);
    }
    allIds.add(id);
  }

  function assignItemId(item: any): QuizItem {
    if (item.type === "info") {
      infoCounter++;
      if (!item.id) item.id = `info-${infoCounter}`;
      trackId(item.id);
      return item;
    }

    if (item.type === "group") {
      questionCounter++;
      const groupNum = questionCounter;
      if (!item.id) item.id = `q${groupNum}`;
      trackId(item.id);
      if (Array.isArray(item.parts)) {
        item.parts.forEach((part: any, i: number) => {
          if (!part.id) part.id = `q${groupNum}${String.fromCharCode(97 + i)}`;
          trackId(part.id);
        });
      }
      return item;
    }

    // single, multi, truefalse, freetext
    questionCounter++;
    if (!item.id) item.id = `q${questionCounter}`;
    trackId(item.id);
    return item;
  }

  const questions: TopLevelItem[] = raw.questions.map((item: any) => {
    if (item.type === "section") {
      sectionCounter++;
      if (!item.id) item.id = `sec-${sectionCounter}`;
      trackId(item.id);
      const items: QuizItem[] = (item.items || []).map((child: any) => assignItemId(child));
      return { ...item, items };
    }
    return assignItemId(item);
  });

  return {
    title: raw.title,
    description: raw.description,
    questions,
  };
}
