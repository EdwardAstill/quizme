import type { Quiz, TopLevelItem, QuizItem } from "../types/quiz";
import { IdGenerator } from "../utils/idGenerator";
import { validateAnswerIndex } from "../utils/validateQuiz";

export function parseJson(content: string): Quiz {
  let raw: any;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON");
  }

  if (!raw || typeof raw.title !== "string" || !Array.isArray(raw.questions)) {
    throw new Error("Invalid quiz: must have a title (string) and questions (array)");
  }

  const ids = new IdGenerator();

  function assignItemId(item: any): QuizItem {
    if (item.type === "info") {
      item.id = ids.nextInfoId(item.id);
      return item;
    }

    if (item.type === "group") {
      item.id = ids.nextQuestionId(item.id);
      const groupNum = ids.currentQuestionNum;
      if (Array.isArray(item.parts)) {
        ids.assignGroupPartIds(item.parts, groupNum);
        item.parts.forEach((part: any) => validateAnswerIndex(part));
      }
      return item;
    }

    // single, multi, truefalse, freetext
    item.id = ids.nextQuestionId(item.id);
    validateAnswerIndex(item);
    return item;
  }

  const questions: TopLevelItem[] = raw.questions.map((item: any) => {
    if (item.type === "section") {
      item.id = ids.nextSectionId(item.id);
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
