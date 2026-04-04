import type {
  Quiz,
  TopLevelItem,
  QuizItem,
  Question,
  SingleChoiceQuestion,
  MultiChoiceQuestion,
  TrueFalseQuestion,
  FreeTextQuestion,
  InfoPage,
  QuestionGroup,
  Section,
} from "../types/quiz";
import { IdGenerator } from "../utils/idGenerator";
import { validateAnswerIndex } from "../utils/validateQuiz";

type ItemType = "single" | "multi" | "truefalse" | "freetext" | "info" | "group";

interface ParsedFrontmatter {
  title: string;
  description?: string;
}

// Note: this runs as a raw string pass before structural parsing,
// so :::filename inside markdown code fences will also be transformed.
function replaceLocalImages(content: string): string {
  return content.replace(/^:::[ ]*(\S+)[ ]*$/gm, (_, filename) => `![${filename}](/quiz-images/${filename})`);
}

export function parseMarkdown(content: string): Quiz {
  const processed = replaceLocalImages(content);
  const { frontmatter, body } = extractFrontmatter(processed);
  if (!frontmatter.title) {
    throw new Error("Quiz must have a title in frontmatter");
  }

  const lines = body.split("\n");
  const topLevelItems: TopLevelItem[] = [];
  let currentSection: Section | null = null;
  let i = 0;

  const ids = new IdGenerator();

  function addItem(item: QuizItem) {
    if (currentSection) {
      currentSection.items.push(item);
    } else {
      topLevelItems.push(item);
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // # Section heading
    if (line.match(/^# /) && !line.match(/^##/)) {
      const title = line.replace(/^# /, "").trim();
      if (currentSection) {
        topLevelItems.push(currentSection);
      }
      currentSection = {
        type: "section",
        title,
        id: ids.nextSectionId(),
        items: [],
      };
      i++;
      continue;
    }

    // ## [type] Question heading
    const h2Match = line.match(/^## \[(\w+)\]\s*(.*)/);
    if (h2Match) {
      const type = h2Match[1] as ItemType;
      const headingText = h2Match[2].trim();
      i++;

      if (type === "group") {
        const group = parseGroup(lines, i, headingText);
        i = group.nextIndex;
        addItem(group.item);
      } else {
        const item = parseItem(lines, i, type, headingText);
        i = item.nextIndex;
        addItem(item.item);
      }
      continue;
    }

    // Skip blank lines
    i++;
  }

  if (currentSection) {
    topLevelItems.push(currentSection);
  }

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    items: topLevelItems,
  };

  function parseItem(
    lines: string[],
    startIndex: number,
    type: ItemType,
    headingText: string
  ): { item: QuizItem; nextIndex: number } {
    let i = startIndex;

    // Skip blank lines after heading
    while (i < lines.length && lines[i].trim() === "") i++;

    // Parse optional ::: body block
    let bodyContent = "";
    if (i < lines.length && lines[i].trim() === ":::") {
      i++; // skip opening :::
      const bodyLines: string[] = [];
      let inCodeFence = false;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim().startsWith("```")) {
          inCodeFence = !inCodeFence;
        }
        if (!inCodeFence && l.trim() === ":::") {
          i++; // skip closing :::
          break;
        }
        bodyLines.push(l);
        i++;
      }
      bodyContent = bodyLines.join("\n").trim();
    }

    // Skip blank lines
    while (i < lines.length && lines[i].trim() === "") i++;

    if (type === "info") {
      const content = bodyContent || headingText;
      return {
        item: {
          id: ids.nextInfoId(),
          type: "info",
          content,
        } as InfoPage,
        nextIndex: i,
      };
    }

    // Parse answer-specific content
    let hint: string | undefined;
    let explanation: string | undefined;
    const options: string[] = [];
    const correctIndices: number[] = [];
    let trueFalseAnswer: boolean | undefined;
    let freetextAnswer: string | undefined;

    while (i < lines.length) {
      const l = lines[i];

      // Stop at next heading
      if (l.match(/^#{1,3} /)) break;

      // Option line: - text or - text *
      const optMatch = l.match(/^- (.+)/);
      if (optMatch) {
        let optText = optMatch[1].trim();
        if (optText.endsWith(" *")) {
          optText = optText.slice(0, -2).trim();
          correctIndices.push(options.length);
        }
        options.push(optText);
        i++;
        continue;
      }

      // True/false answer: only store the value marked with *
      const tfMatch = l.match(/^(true|false)\s*\*?\s*$/i);
      if (tfMatch) {
        if (l.includes("*")) {
          trueFalseAnswer = tfMatch[1].toLowerCase() === "true";
        }
        i++;
        continue;
      }

      // Freetext answer: = text
      const ftMatch = l.match(/^= (.+)/);
      if (ftMatch) {
        freetextAnswer = ftMatch[1].trim();
        i++;
        continue;
      }

      // Hint: ?> text
      const hintMatch = l.match(/^\?> (.+)/);
      if (hintMatch) {
        hint = hintMatch[1].trim();
        i++;
        continue;
      }

      // Explanation: > text (collect multiline)
      if (l.match(/^> /)) {
        const explLines: string[] = [];
        while (i < lines.length && lines[i].match(/^> /)) {
          explLines.push(lines[i].replace(/^> /, ""));
          i++;
        }
        explanation = explLines.join("\n").trim();
        continue;
      }

      // Blank line — skip
      if (l.trim() === "") {
        i++;
        continue;
      }

      // Unknown line — stop parsing this item
      break;
    }

    const questionText = bodyContent
      ? `${headingText}\n\n${bodyContent}`
      : headingText;

    const id = ids.nextQuestionId();

    let item: Question;
    switch (type) {
      case "single":
        if (correctIndices.length === 0) {
          throw new Error(`No correct answer marked for single-choice question: "${headingText}". Mark the correct option with a trailing *`);
        }
        item = {
          id,
          type: "single",
          question: questionText,
          options,
          answer: correctIndices[0],
          hint,
          explanation,
        } as SingleChoiceQuestion;
        break;
      case "multi":
        item = {
          id,
          type: "multi",
          question: questionText,
          options,
          answers: correctIndices,
          hint,
          explanation,
        } as MultiChoiceQuestion;
        break;
      case "truefalse":
        if (trueFalseAnswer === undefined) {
          throw new Error(`No correct answer marked for true/false question: "${headingText}". Mark the correct value with a trailing *`);
        }
        item = {
          id,
          type: "truefalse",
          question: questionText,
          answer: trueFalseAnswer,
          hint,
          explanation,
        } as TrueFalseQuestion;
        break;
      case "freetext":
        if (freetextAnswer === undefined) {
          throw new Error(`No answer provided for freetext question: "${headingText}". Provide an answer with = answer`);
        }
        item = {
          id,
          type: "freetext",
          question: questionText,
          answer: freetextAnswer,
          hint,
          explanation,
        } as FreeTextQuestion;
        break;
      default:
        throw new Error(`Unknown question type: ${type}`);
    }

    validateAnswerIndex(item);
    return { item, nextIndex: i };
  }

  function parseGroup(
    lines: string[],
    startIndex: number,
    headingText: string,
  ): { item: QuestionGroup; nextIndex: number } {
    let i = startIndex;
    const groupId = ids.nextQuestionId();
    const groupNum = ids.currentQuestionNum;
    const parts: Question[] = [];
    let hint: string | undefined;
    let explanation: string | undefined;

    // Skip blank lines
    while (i < lines.length && lines[i].trim() === "") i++;

    // Parse optional ::: body block for group prompt
    let bodyContent = "";
    if (i < lines.length && lines[i].trim() === ":::") {
      i++;
      const bodyLines: string[] = [];
      let inCodeFence = false;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim().startsWith("```")) inCodeFence = !inCodeFence;
        if (!inCodeFence && l.trim() === ":::") { i++; break; }
        bodyLines.push(l);
        i++;
      }
      bodyContent = bodyLines.join("\n").trim();
    }

    // Parse group-level hint/explanation and ### sub-questions
    while (i < lines.length) {
      const l = lines[i];

      // Stop at next ## or # heading (same or higher level)
      if (l.match(/^#{1,2} /) && !l.match(/^###/)) break;

      // ### [type] Sub-question
      const h3Match = l.match(/^### \[(\w+)\]\s*(.*)/);
      if (h3Match) {
        const type = h3Match[1] as ItemType;
        const subHeading = h3Match[2].trim();
        i++;
        const sub = parseItem(lines, i, type, subHeading);
        i = sub.nextIndex;
        parts.push(sub.item as Question);
        continue;
      }

      // Group-level hint
      const hintMatch = l.match(/^\?> (.+)/);
      if (hintMatch) {
        hint = hintMatch[1].trim();
        i++;
        continue;
      }

      // Group-level explanation
      if (l.match(/^> /)) {
        const explLines: string[] = [];
        while (i < lines.length && lines[i].match(/^> /)) {
          explLines.push(lines[i].replace(/^> /, ""));
          i++;
        }
        explanation = explLines.join("\n").trim();
        continue;
      }

      if (l.trim() === "") { i++; continue; }

      break;
    }

    const questionText = bodyContent
      ? `${headingText}\n\n${bodyContent}`
      : headingText;

    ids.assignGroupPartIds(parts, groupNum);

    return {
      item: {
        id: groupId,
        type: "group",
        question: questionText,
        parts,
        hint,
        explanation,
      },
      nextIndex: i,
    };
  }
}

function extractFrontmatter(content: string): {
  frontmatter: ParsedFrontmatter;
  body: string;
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error("Quiz must start with YAML frontmatter (---\\ntitle: ...\\n---)");
  }

  const fmBlock = fmMatch[1];
  const body = fmMatch[2];

  const frontmatter: ParsedFrontmatter = { title: "" };
  for (const line of fmBlock.split("\n")) {
    const titleMatch = line.match(/^title:\s*(.+)/);
    if (titleMatch) frontmatter.title = titleMatch[1].trim();
    const descMatch = line.match(/^description:\s*(.+)/);
    if (descMatch) frontmatter.description = descMatch[1].trim();
  }

  return { frontmatter, body };
}
