# Format Simplification & Architecture Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Markdown DSL quiz format (`.quiz.md`), switch to index-based answers, and refactor the frontend into a clean layered architecture.

**Architecture:** Bottom-up by layer: types + parsers first, then component split, then integration. Both `.quiz` (JSON) and `.quiz.md` (Markdown) formats parse into the same `Quiz` type. Components split into `items/` (orchestrators), `inputs/` (answer widgets), and `ui/` (shared primitives).

**Tech Stack:** Bun, React 18, TypeScript, Vite, react-markdown + remark-math + rehype-katex

**Spec:** `docs/superpowers/specs/2026-03-26-format-and-architecture-design.md`

---

## File Structure

### New files

```
src/parsers/index.ts           — parseQuiz(content, filename) → Quiz
src/parsers/parseJson.ts       — JSON .quiz/.json → Quiz (replaces preprocessQuiz.ts)
src/parsers/parseMarkdown.ts   — Markdown .quiz.md → Quiz
src/utils/checkAnswer.ts       — extracted pure function from useQuiz.ts
src/components/items/QuestionCard.tsx + .css
src/components/items/GroupCard.tsx + .css
src/components/items/InfoPage.tsx + .css
src/components/inputs/SingleInput.tsx + .css
src/components/inputs/MultiInput.tsx + .css
src/components/inputs/TrueFalseInput.tsx + .css
src/components/inputs/FreeTextInput.tsx + .css
src/components/ui/HintToggle.tsx + .css
src/components/QuizNav.css
src/components/QuizLoader.css
src/components/ScoreSummary.css
src/components/Settings.css
examples/sample.quiz.md
docs/quiz-md-format.md
```

### Modified files

```
src/types/quiz.ts              — answer: string → number, answers: string[] → number[]
src/hooks/useQuiz.ts           — remove checkAnswer + findQuestion, update submitAnswer types
src/App.tsx                    — dispatch to items/, use parseQuiz for /api/quiz
src/components/QuizLoader.tsx  — accept .quiz.md, use parseQuiz
src/components/QuizNav.tsx     — add CSS import
src/components/ScoreSummary.tsx — add CSS import, update for index-based answers
src/components/Settings.tsx    — add CSS import
src/index.css                  — slim down to reset + variables + themes + base buttons + layout
src/components/ui/Markdown.tsx — moved from src/components/Markdown.tsx
cli.ts                         — read as text, use parseQuiz, accept .quiz.md
examples/sample.quiz           — convert to index-based answers
```

### Deleted files

```
src/utils/preprocessQuiz.ts    — replaced by parsers/
src/components/QuestionCard.tsx — replaced by items/QuestionCard.tsx
src/components/Markdown.tsx     — moved to ui/Markdown.tsx
src/components/Latex.tsx        — dead code
src/components/ProgressBar.tsx  — dead code
```

---

## Task 1: Update types to index-based answers

**Files:**
- Modify: `src/types/quiz.ts`

- [ ] **Step 1: Update SingleChoiceQuestion**

In `src/types/quiz.ts`, change `answer` from `string` to `number`:

```typescript
export interface SingleChoiceQuestion {
  id: string;
  type: "single";
  question: string;
  options: string[];
  answer: number;
  hint?: string;
  explanation?: string;
}
```

- [ ] **Step 2: Update MultiChoiceQuestion**

In `src/types/quiz.ts`, change `answers` from `string[]` to `number[]`:

```typescript
export interface MultiChoiceQuestion {
  id: string;
  type: "multi";
  question: string;
  options: string[];
  answers: number[];
  hint?: string;
  explanation?: string;
}
```

- [ ] **Step 3: Update AnswerRecord**

The `userAnswer` for single choice changes from string to number, and for multi from string[] to number[]:

```typescript
export interface AnswerRecord {
  questionId: string;
  userAnswer: number | number[] | boolean | string;
  correct: boolean;
}
```

- [ ] **Step 4: Run typecheck to see all downstream breakages**

Run: `bun run typecheck`

Expected: Multiple type errors in `useQuiz.ts`, `QuestionCard.tsx`, `ScoreSummary.tsx`, and other files that reference answer types. This is expected — we'll fix them in subsequent tasks. Note the errors for reference.

- [ ] **Step 5: Commit**

```bash
git add src/types/quiz.ts
git commit -m "feat: change answer types to index-based (number instead of string)"
```

---

## Task 2: Extract checkAnswer to its own util

**Files:**
- Create: `src/utils/checkAnswer.ts`
- Modify: `src/hooks/useQuiz.ts`

- [ ] **Step 1: Create `src/utils/checkAnswer.ts`**

```typescript
import type { Question } from "../types/quiz";

export function checkAnswer(
  question: Question,
  userAnswer: number | number[] | boolean | string
): boolean {
  switch (question.type) {
    case "single":
      return question.answer === userAnswer;
    case "multi": {
      if (!Array.isArray(userAnswer)) return false;
      const sorted = [...userAnswer].sort((a, b) => a - b);
      const expected = [...question.answers].sort((a, b) => a - b);
      return (
        sorted.length === expected.length &&
        sorted.every((v, i) => v === expected[i])
      );
    }
    case "truefalse":
      return question.answer === userAnswer;
    case "freetext": {
      if (typeof userAnswer !== "string") return false;
      const a = question.caseSensitive
        ? userAnswer.trim()
        : userAnswer.trim().toLowerCase();
      const b = question.caseSensitive
        ? question.answer.trim()
        : question.answer.trim().toLowerCase();
      return a === b;
    }
  }
}
```

- [ ] **Step 2: Update `src/hooks/useQuiz.ts`**

Remove the `checkAnswer` function (lines 161-190) and the `findQuestion` function (lines 149-159). Import `checkAnswer` from the new util. Update `submitAnswer` to use the new answer types. Keep `findQuestion` inline since it's only used here:

```typescript
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
  const [_visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set());

  const flatItems: QuizItem[] = useMemo(() => {
    if (!quiz) return [];
    return quiz.questions.flatMap((item) =>
      item.type === "section" ? item.items : [item]
    );
  }, [quiz]);

  const startQuiz = useCallback((q: Quiz) => {
    setQuiz(q);
    setCurrentIndex(0);
    setAnswers(new Map());
    setVisitedIndices(new Set([0]));
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
      setVisitedIndices((prev) => new Set(prev).add(index));
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
    setVisitedIndices(new Set([0]));
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
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/checkAnswer.ts src/hooks/useQuiz.ts
git commit -m "refactor: extract checkAnswer to its own util, update for index-based answers"
```

---

## Task 3: Create JSON parser

**Files:**
- Create: `src/parsers/parseJson.ts`

- [ ] **Step 1: Create `src/parsers/parseJson.ts`**

This replaces `src/utils/preprocessQuiz.ts`. Same logic but with validation that answer indices are within bounds:

```typescript
import type { Quiz, TopLevelItem, QuizItem } from "../types/quiz";

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

  function validateAnswerIndex(item: any) {
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
          validateAnswerIndex(part);
        });
      }
      return item;
    }

    // single, multi, truefalse, freetext
    questionCounter++;
    if (!item.id) item.id = `q${questionCounter}`;
    trackId(item.id);
    validateAnswerIndex(item);
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
```

- [ ] **Step 2: Commit**

```bash
git add src/parsers/parseJson.ts
git commit -m "feat: create JSON parser with index-based answer validation"
```

---

## Task 4: Create Markdown parser

**Files:**
- Create: `src/parsers/parseMarkdown.ts`

- [ ] **Step 1: Create `src/parsers/parseMarkdown.ts`**

Line-by-line parser for the `.quiz.md` format:

```typescript
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

type ItemType = "single" | "multi" | "truefalse" | "freetext" | "info" | "group";

interface ParsedFrontmatter {
  title: string;
  description?: string;
}

export function parseMarkdown(content: string): Quiz {
  const { frontmatter, body } = extractFrontmatter(content);
  if (!frontmatter.title) {
    throw new Error("Quiz must have a title in frontmatter");
  }

  const lines = body.split("\n");
  const topLevelItems: TopLevelItem[] = [];
  let currentSection: Section | null = null;
  let i = 0;

  let questionCounter = 0;
  let infoCounter = 0;
  let sectionCounter = 0;

  function nextQuestionId(): string {
    questionCounter++;
    return `q${questionCounter}`;
  }

  function nextInfoId(): string {
    infoCounter++;
    return `info-${infoCounter}`;
  }

  function nextSectionId(): string {
    sectionCounter++;
    return `sec-${sectionCounter}`;
  }

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
        id: nextSectionId(),
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
        const group = parseGroup(lines, i, headingText, nextQuestionId);
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
    questions: topLevelItems,
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
        // Track code fences to avoid matching ::: inside them
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
          id: nextInfoId(),
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

      // True/false answer
      const tfMatch = l.match(/^(true|false)\s*\*?\s*$/i);
      if (tfMatch) {
        const val = tfMatch[1].toLowerCase() === "true";
        const isCorrect = l.includes("*");
        if (isCorrect) {
          trueFalseAnswer = val;
        } else {
          // If no *, check if it's the only true/false line (it's the answer)
          trueFalseAnswer = val;
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

    const id = nextQuestionId();

    let item: Question;
    switch (type) {
      case "single":
        item = {
          id,
          type: "single",
          question: questionText,
          options,
          answer: correctIndices[0] ?? 0,
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
        item = {
          id,
          type: "truefalse",
          question: questionText,
          answer: trueFalseAnswer ?? true,
          hint,
          explanation,
        } as TrueFalseQuestion;
        break;
      case "freetext":
        item = {
          id,
          type: "freetext",
          question: questionText,
          answer: freetextAnswer ?? "",
          hint,
          explanation,
        } as FreeTextQuestion;
        break;
      default:
        throw new Error(`Unknown question type: ${type}`);
    }

    return { item, nextIndex: i };
  }

  function parseGroup(
    lines: string[],
    startIndex: number,
    headingText: string,
    nextQuestionId: () => string
  ): { item: QuestionGroup; nextIndex: number } {
    let i = startIndex;
    const groupId = nextQuestionId();
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

    // Fix part IDs to use group-style naming (q1a, q1b, ...)
    const groupNum = groupId.replace("q", "");
    parts.forEach((part, idx) => {
      part.id = `q${groupNum}${String.fromCharCode(97 + idx)}`;
    });

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

  // Simple YAML parsing for title and description
  const frontmatter: ParsedFrontmatter = { title: "" };
  for (const line of fmBlock.split("\n")) {
    const titleMatch = line.match(/^title:\s*(.+)/);
    if (titleMatch) frontmatter.title = titleMatch[1].trim();
    const descMatch = line.match(/^description:\s*(.+)/);
    if (descMatch) frontmatter.description = descMatch[1].trim();
  }

  return { frontmatter, body };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/parsers/parseMarkdown.ts
git commit -m "feat: create Markdown DSL parser for .quiz.md format"
```

---

## Task 5: Create parser index

**Files:**
- Create: `src/parsers/index.ts`

- [ ] **Step 1: Create `src/parsers/index.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/parsers/index.ts
git commit -m "feat: add parser index with format detection by extension"
```

---

## Task 6: Delete dead code and old preprocessor

**Files:**
- Delete: `src/utils/preprocessQuiz.ts`
- Delete: `src/components/Latex.tsx`
- Delete: `src/components/ProgressBar.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm src/utils/preprocessQuiz.ts src/components/Latex.tsx src/components/ProgressBar.tsx
```

- [ ] **Step 2: Remove the progress bar CSS from `src/index.css`**

Delete these lines (near the end of the file, around line 814-817):

```css
/* ---------- Progress bar (kept for compatibility) ---------- */
.progress-bar {
  display: none;
}
```

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "chore: delete dead code (Latex.tsx, ProgressBar.tsx, preprocessQuiz.ts)"
```

---

## Task 7: Create input components

**Files:**
- Create: `src/components/inputs/SingleInput.tsx`
- Create: `src/components/inputs/SingleInput.css`
- Create: `src/components/inputs/MultiInput.tsx`
- Create: `src/components/inputs/MultiInput.css`
- Create: `src/components/inputs/TrueFalseInput.tsx`
- Create: `src/components/inputs/TrueFalseInput.css`
- Create: `src/components/inputs/FreeTextInput.tsx`
- Create: `src/components/inputs/FreeTextInput.css`

- [ ] **Step 1: Create `src/components/inputs/SingleInput.tsx`**

```tsx
import { useState, useEffect } from "react";
import type { SingleChoiceQuestion } from "../../types/quiz";
import { Markdown } from "../ui/Markdown";
import "./SingleInput.css";

interface SingleInputProps {
  question: SingleChoiceQuestion;
  submitted: boolean;
  previousAnswer?: number;
  onSubmit: (v: number) => void;
}

export function SingleInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: SingleInputProps) {
  const [selected, setSelected] = useState<number | null>(previousAnswer ?? null);

  useEffect(() => {
    setSelected(previousAnswer ?? null);
  }, [previousAnswer]);

  return (
    <div>
      <ul className="options-list">
        {question.options.map((opt, idx) => {
          let cls = "option";
          if (submitted) {
            if (idx === question.answer) cls += " option--correct";
            else if (idx === previousAnswer) cls += " option--wrong";
          } else if (idx === selected) {
            cls += " option--selected";
          }
          return (
            <li key={idx}>
              <button
                className={cls}
                onClick={() => !submitted && setSelected(idx)}
                disabled={submitted}
              >
                <Markdown inline>{opt}</Markdown>
              </button>
            </li>
          );
        })}
      </ul>
      {!submitted && (
        <div className="question-card__actions">
          <button
            className="btn btn--primary"
            onClick={() => selected !== null && onSubmit(selected)}
            disabled={selected === null}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/inputs/SingleInput.css`**

Extract from `src/index.css` — the options list and option styles (lines ~562-622):

```css
.options-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.6rem 0.9rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.88rem;
  color: var(--text);
  text-align: left;
  transition: all 0.12s ease;
}

.option:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-light);
}

.option:disabled {
  cursor: default;
}

.option--selected {
  border-color: var(--primary);
  background: var(--primary-glow);
}

.option--correct {
  border-color: var(--correct-dim);
  background: var(--correct-bg);
}

.option--wrong {
  border-color: var(--wrong-dim);
  background: var(--wrong-bg);
}
```

- [ ] **Step 3: Create `src/components/inputs/MultiInput.tsx`**

```tsx
import { useState, useEffect } from "react";
import type { MultiChoiceQuestion } from "../../types/quiz";
import { Markdown } from "../ui/Markdown";
import "./MultiInput.css";

interface MultiInputProps {
  question: MultiChoiceQuestion;
  submitted: boolean;
  previousAnswer?: number[];
  onSubmit: (v: number[]) => void;
}

export function MultiInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: MultiInputProps) {
  const [selected, setSelected] = useState<number[]>(previousAnswer ?? []);

  useEffect(() => {
    setSelected(previousAnswer ?? []);
  }, [previousAnswer]);

  const toggle = (idx: number) => {
    if (submitted) return;
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((s) => s !== idx) : [...prev, idx]
    );
  };

  return (
    <div>
      <ul className="options-list">
        {question.options.map((opt, idx) => {
          let cls = "option";
          if (submitted) {
            if (question.answers.includes(idx)) cls += " option--correct";
            else if (selected.includes(idx)) cls += " option--wrong";
          } else if (selected.includes(idx)) {
            cls += " option--selected";
          }
          return (
            <li key={idx}>
              <button className={cls} onClick={() => toggle(idx)} disabled={submitted}>
                <span className={`option__check ${selected.includes(idx) ? "option__check--on" : ""}`} />
                <Markdown inline>{opt}</Markdown>
              </button>
            </li>
          );
        })}
      </ul>
      {!submitted && (
        <div className="question-card__actions">
          <button
            className="btn btn--primary"
            onClick={() => onSubmit(selected)}
            disabled={selected.length === 0}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/inputs/MultiInput.css`**

```css
.option__check {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1.5px solid var(--border-light);
  flex-shrink: 0;
  transition: all 0.12s;
}

.option__check--on {
  background: var(--primary);
  border-color: var(--primary);
}
```

- [ ] **Step 5: Create `src/components/inputs/TrueFalseInput.tsx`**

```tsx
import { useState, useEffect } from "react";
import type { TrueFalseQuestion } from "../../types/quiz";
import "./TrueFalseInput.css";

interface TrueFalseInputProps {
  question: TrueFalseQuestion;
  submitted: boolean;
  previousAnswer?: boolean;
  onSubmit: (v: boolean) => void;
}

export function TrueFalseInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: TrueFalseInputProps) {
  const [selected, setSelected] = useState<boolean | null>(previousAnswer ?? null);

  useEffect(() => {
    setSelected(previousAnswer ?? null);
  }, [previousAnswer]);

  const btnClass = (val: boolean) => {
    let cls = "btn btn--tf";
    if (submitted) {
      if (val === question.answer) cls += " btn--tf-correct";
      else if (val === previousAnswer) cls += " btn--tf-wrong";
    } else if (val === selected) {
      cls += " btn--tf-selected";
    }
    return cls;
  };

  return (
    <div>
      <div className="tf-buttons">
        <button
          className={btnClass(true)}
          onClick={() => !submitted && setSelected(true)}
          disabled={submitted}
        >
          True
        </button>
        <button
          className={btnClass(false)}
          onClick={() => !submitted && setSelected(false)}
          disabled={submitted}
        >
          False
        </button>
      </div>
      {!submitted && (
        <div className="question-card__actions">
          <button
            className="btn btn--primary"
            onClick={() => selected !== null && onSubmit(selected)}
            disabled={selected === null}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/inputs/TrueFalseInput.css`**

```css
.tf-buttons {
  display: flex;
  gap: 0.6rem;
}

.btn--tf {
  flex: 1;
  padding: 0.8rem;
  font-size: 0.9rem;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.btn--tf:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-light);
}

.btn--tf-selected {
  border-color: var(--primary);
  background: var(--primary-glow);
}

.btn--tf-correct {
  border-color: var(--correct-dim);
  background: var(--correct-bg);
}

.btn--tf-wrong {
  border-color: var(--wrong-dim);
  background: var(--wrong-bg);
}
```

- [ ] **Step 7: Create `src/components/inputs/FreeTextInput.tsx`**

```tsx
import { useState, useEffect } from "react";
import type { FreeTextQuestion } from "../../types/quiz";
import "./FreeTextInput.css";

interface FreeTextInputProps {
  question: FreeTextQuestion;
  submitted: boolean;
  previousAnswer?: string;
  onSubmit: (v: string) => void;
}

export function FreeTextInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: FreeTextInputProps) {
  const [value, setValue] = useState(previousAnswer ?? "");

  useEffect(() => {
    setValue(previousAnswer ?? "");
  }, [previousAnswer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim() && !submitted) {
      onSubmit(value);
    }
  };

  return (
    <div>
      <input
        className="freetext-input"
        type="text"
        placeholder={question.placeholder || "Type your answer..."}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitted}
      />
      {!submitted && (
        <div className="question-card__actions">
          <button
            className="btn btn--primary"
            onClick={() => onSubmit(value)}
            disabled={!value.trim()}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create `src/components/inputs/FreeTextInput.css`**

```css
.freetext-input {
  width: 100%;
  padding: 0.6rem 0.9rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.freetext-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-glow);
}

.freetext-input:disabled {
  opacity: 0.6;
}
```

- [ ] **Step 9: Commit**

```bash
git add src/components/inputs/
git commit -m "feat: extract input components (Single, Multi, TrueFalse, FreeText) with per-component CSS"
```

---

## Task 8: Create UI components

**Files:**
- Create: `src/components/ui/HintToggle.tsx`
- Create: `src/components/ui/HintToggle.css`
- Move: `src/components/Markdown.tsx` → `src/components/ui/Markdown.tsx`

- [ ] **Step 1: Create `src/components/ui/HintToggle.tsx`**

```tsx
import { useState } from "react";
import { Markdown } from "./Markdown";
import "./HintToggle.css";

interface HintToggleProps {
  hint: string;
}

export function HintToggle({ hint }: HintToggleProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="hint-area">
      {revealed ? (
        <div className="hint">
          <Markdown>{hint}</Markdown>
        </div>
      ) : (
        <button
          className="hint__btn"
          onClick={() => setRevealed(true)}
        >
          Reveal hint
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/HintToggle.css`**

```css
.hint-area {
  margin-bottom: 0.5rem;
}

.hint__btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: 0.78rem;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  transition: all 0.12s;
}

.hint__btn:hover {
  border-color: var(--border-light);
  color: var(--text);
}

.hint {
  border-left: 3px solid #4a9eff;
  background: rgba(74, 158, 255, 0.06);
  border-radius: 0 var(--radius) var(--radius) 0;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.hint p {
  margin: 0.25rem 0;
}
```

- [ ] **Step 3: Move Markdown.tsx**

```bash
mkdir -p src/components/ui
mv src/components/Markdown.tsx src/components/ui/Markdown.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/ src/components/Markdown.tsx
git commit -m "feat: create ui/ layer (HintToggle, move Markdown)"
```

---

## Task 9: Create item components

**Files:**
- Create: `src/components/items/QuestionCard.tsx`
- Create: `src/components/items/QuestionCard.css`
- Create: `src/components/items/GroupCard.tsx`
- Create: `src/components/items/GroupCard.css`
- Create: `src/components/items/InfoPage.tsx`
- Create: `src/components/items/InfoPage.css`

- [ ] **Step 1: Create `src/components/items/QuestionCard.tsx`**

The slim orchestrator — picks the right input, shows feedback:

```tsx
import { useState } from "react";
import type { Question, AnswerRecord } from "../../types/quiz";
import { Markdown } from "../ui/Markdown";
import { HintToggle } from "../ui/HintToggle";
import { SingleInput } from "../inputs/SingleInput";
import { MultiInput } from "../inputs/MultiInput";
import { TrueFalseInput } from "../inputs/TrueFalseInput";
import { FreeTextInput } from "../inputs/FreeTextInput";
import "./QuestionCard.css";

interface QuestionCardProps {
  question: Question;
  answer?: AnswerRecord;
  onSubmit: (questionId: string, ans: number | number[] | boolean | string) => void;
}

export function QuestionCard({ question, answer, onSubmit }: QuestionCardProps) {
  const submitted = !!answer;
  const correct = answer?.correct ?? null;

  return (
    <div className="question-card">
      <h2 className="question-card__text">
        <Markdown inline>{question.question}</Markdown>
      </h2>

      {question.hint && !submitted && (
        <HintToggle hint={question.hint} />
      )}

      <div className="question-card__body">
        {question.type === "single" && (
          <SingleInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as number | undefined}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}
        {question.type === "multi" && (
          <MultiInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as number[] | undefined}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}
        {question.type === "truefalse" && (
          <TrueFalseInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as boolean | undefined}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}
        {question.type === "freetext" && (
          <FreeTextInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as string | undefined}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}
      </div>

      {submitted && (
        <div
          className={`question-card__feedback ${correct ? "question-card__feedback--correct" : "question-card__feedback--wrong"}`}
        >
          <strong>{correct ? "Correct!" : "Incorrect"}</strong>
          {question.explanation && <Markdown>{question.explanation}</Markdown>}
          {question.type === "freetext" && !correct && (
            <p>
              Expected: <strong><Markdown inline>{question.answer}</Markdown></strong>
            </p>
          )}
          {question.type === "single" && !correct && (
            <p>
              Expected: <strong><Markdown inline>{question.options[question.answer]}</Markdown></strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/items/QuestionCard.css`**

Extract from `src/index.css` — question card styles (lines ~363-524):

```css
.question-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

/* Markdown typography */
.question-card h1,
.question-card h2,
.question-card h3 {
  margin: 0 0 0.5rem;
  line-height: 1.3;
}

.question-card h1 { font-size: 1.6rem; }
.question-card h2 { font-size: 1.3rem; }
.question-card h3 { font-size: 1.1rem; }

.question-card p {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.question-card ul,
.question-card ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.question-card li {
  margin: 0.25rem 0;
  line-height: 1.5;
}

.question-card blockquote {
  border-left: 3px solid var(--primary);
  margin: 1rem 0;
  padding: 0.5rem 1rem;
  color: var(--text-muted);
}

.question-card pre {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  overflow-x: auto;
  margin: 0.75rem 0;
}

.question-card code {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.question-card :not(pre) > code {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0.1em 0.35em;
}

.question-card table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.88rem;
}

.question-card th,
.question-card td {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  text-align: left;
}

.question-card th {
  background: var(--bg);
  font-weight: 600;
  font-size: 0.82rem;
}

.question-card .katex-display {
  margin: 1rem 0;
  overflow-x: auto;
}

.question-card > *:first-child {
  margin-top: 0;
}

.question-card > *:last-child {
  margin-bottom: 0;
}

.question-card__counter {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-dim);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.question-card__text {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.question-card__body {
  margin-bottom: 0.5rem;
}

.question-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

/* Feedback */
.question-card__feedback {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  margin-top: 0.75rem;
  font-size: 0.85rem;
  line-height: 1.5;
}

.question-card__feedback--correct {
  background: var(--correct-bg);
  border: 1px solid rgba(61, 214, 140, 0.2);
}

.question-card__feedback--wrong {
  background: var(--wrong-bg);
  border: 1px solid rgba(240, 96, 96, 0.2);
}

.question-card__feedback--info {
  background: var(--primary-glow);
  border: 1px solid var(--border-light);
}

.question-card__feedback p {
  margin: 0.25rem 0;
}

.question-card__feedback strong {
  display: block;
  margin-bottom: 0.15rem;
  font-size: 0.82rem;
}
```

- [ ] **Step 3: Create `src/components/items/GroupCard.tsx`**

```tsx
import type { QuestionGroup, Question, AnswerRecord } from "../../types/quiz";
import { Markdown } from "../ui/Markdown";
import { HintToggle } from "../ui/HintToggle";
import { QuestionCard } from "./QuestionCard";
import "./GroupCard.css";

interface GroupCardProps {
  group: QuestionGroup;
  index: number;
  total: number;
  answers: Map<string, AnswerRecord>;
  onSubmit: (questionId: string, ans: number | number[] | boolean | string) => void;
}

function allPartsAnswered(parts: Question[], answers: Map<string, AnswerRecord>) {
  return parts.every((p) => answers.has(p.id));
}

export function GroupCard({ group, index, total, answers, onSubmit }: GroupCardProps) {
  return (
    <div className="question-group">
      <p className="question-card__counter">
        Question {index + 1} of {total}
      </p>
      <div className="question-group__prompt">
        <Markdown>{group.question}</Markdown>
      </div>
      {group.hint && !allPartsAnswered(group.parts, answers) && (
        <HintToggle hint={group.hint} />
      )}
      <div className="question-group__parts">
        {group.parts.map((part, i) => (
          <div key={part.id} className="question-group__part">
            <span className="question-group__part-label">
              Part {String.fromCharCode(97 + i)}
            </span>
            <QuestionCard
              question={part}
              answer={answers.get(part.id)}
              onSubmit={onSubmit}
            />
          </div>
        ))}
      </div>
      {group.explanation && allPartsAnswered(group.parts, answers) && (
        <div className="question-card__feedback question-card__feedback--info">
          <Markdown>{group.explanation}</Markdown>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/items/GroupCard.css`**

```css
.question-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-group__prompt {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  padding: 0 0.25rem;
}

.question-group__prompt table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.88rem;
}

.question-group__prompt th,
.question-group__prompt td {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  text-align: left;
}

.question-group__prompt th {
  background: var(--bg);
  font-weight: 600;
  font-size: 0.82rem;
}

.question-group__parts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-group__part {
  position: relative;
}

.question-group__part-label {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  margin-bottom: 0.35rem;
  padding-left: 0.25rem;
}
```

- [ ] **Step 5: Create `src/components/items/InfoPage.tsx`**

```tsx
import { Markdown } from "../ui/Markdown";
import "./InfoPage.css";

interface InfoPageProps {
  content: string;
}

export function InfoPage({ content }: InfoPageProps) {
  return (
    <div className="question-card info-page">
      <div className="info-page__content">
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/items/InfoPage.css`**

```css
.info-page__content > *:first-child {
  margin-top: 0;
}

.info-page__content > *:last-child {
  margin-bottom: 0;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/items/
git commit -m "feat: create item components (QuestionCard, GroupCard, InfoPage)"
```

---

## Task 10: Extract per-component CSS files for remaining components

**Files:**
- Create: `src/components/QuizNav.css`
- Create: `src/components/QuizLoader.css`
- Create: `src/components/ScoreSummary.css`
- Create: `src/components/Settings.css`

- [ ] **Step 1: Create `src/components/QuizNav.css`**

Extract sidebar nav styles from `src/index.css` (lines ~117-266):

```css
.quiz-nav {
  background: var(--bg-warm);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  height: 100vh;
  position: sticky;
  top: 0;
}

.quiz-nav__header {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--border);
}

.quiz-nav__title {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text);
  margin-bottom: 0.15rem;
}

.quiz-nav__desc {
  font-size: 0.72rem;
  color: var(--text-dim);
  line-height: 1.4;
}

.quiz-nav__list {
  list-style: none;
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.quiz-nav__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-muted);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s ease;
  border-left: 2px solid transparent;
}

.quiz-nav__item:hover {
  background: var(--surface);
  color: var(--text);
}

.quiz-nav__item--current {
  background: var(--surface);
  color: var(--text);
  border-left-color: var(--primary);
}

.quiz-nav__num {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-dim);
  min-width: 1.2rem;
  flex-shrink: 0;
}

.quiz-nav__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* Nav Dots */
.quiz-nav__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.quiz-nav__dot--current {
  background: var(--primary);
  box-shadow: 0 0 6px var(--primary-glow), 0 0 12px var(--primary-glow);
}

.quiz-nav__dot--correct {
  background: var(--correct);
  box-shadow: 0 0 4px rgba(61, 214, 140, 0.3);
}

.quiz-nav__dot--wrong {
  background: var(--wrong);
  box-shadow: 0 0 4px rgba(240, 96, 96, 0.3);
}

.quiz-nav__dot--partial {
  background: var(--pending);
  box-shadow: 0 0 4px rgba(240, 192, 64, 0.3);
}

.quiz-nav__dot--info {
  background: #4a9eff;
  box-shadow: 0 0 4px rgba(74, 158, 255, 0.3);
}

.quiz-nav__dot--unanswered {
  background: transparent;
  border: 1.5px solid var(--unanswered);
}

/* Nav Sections */
.quiz-nav__group {
  list-style: none;
}

.quiz-nav__section-title {
  padding: 0.6rem 1rem 0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-top: 1px solid var(--border);
  margin-top: 0.25rem;
}

.quiz-nav__group:first-child .quiz-nav__section-title {
  border-top: none;
  margin-top: 0;
}

/* Nav Footer */
.quiz-nav__footer {
  padding: 1rem;
  border-top: 1px solid var(--border);
}

.quiz-nav__finish {
  width: 100%;
  font-size: 0.8rem;
}
```

- [ ] **Step 2: Add CSS import to `src/components/QuizNav.tsx`**

Add at the top of the file, after the type imports:

```typescript
import "./QuizNav.css";
```

- [ ] **Step 3: Create `src/components/QuizLoader.css`**

Extract from `src/index.css` (lines ~292-361):

```css
.quiz-loader {
  text-align: center;
  padding-top: 8rem;
  max-width: 480px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

.quiz-loader h1 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.4rem;
  letter-spacing: -0.03em;
}

.quiz-loader__subtitle {
  color: var(--text-muted);
  margin-bottom: 2.5rem;
  font-size: 0.9rem;
}

.quiz-loader__dropzone {
  border: 1.5px dashed var(--border-light);
  border-radius: var(--radius-lg);
  padding: 3rem 2rem;
  transition: border-color 0.2s, background 0.2s;
}

.quiz-loader__dropzone--active {
  border-color: var(--primary);
  background: var(--primary-glow);
}

.quiz-loader__icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.75rem;
}

.quiz-loader__or {
  display: block;
  color: var(--text-dim);
  margin: 0.75rem 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.quiz-loader__btn {
  display: inline-flex;
  padding: 0.55rem 1.25rem;
  background: var(--primary);
  color: #111;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.quiz-loader__btn:hover {
  background: var(--primary-hover);
}

.quiz-loader__error {
  color: var(--wrong);
  margin-top: 1rem;
  font-size: 0.85rem;
}
```

- [ ] **Step 4: Add CSS import to `src/components/QuizLoader.tsx`**

Add after existing imports:

```typescript
import "./QuizLoader.css";
```

- [ ] **Step 5: Create `src/components/ScoreSummary.css`**

Extract from `src/index.css` (lines ~718-812):

```css
.score-summary {
  padding: 4rem 2rem 2rem;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.score-summary h1 {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.score-summary__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  margin-bottom: 2.5rem;
}

.score-summary__pct {
  font-family: var(--font-mono);
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: -0.04em;
}

.score-summary__fraction {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.score-summary__breakdown {
  text-align: left;
  margin-bottom: 2rem;
}

.score-summary__breakdown h2 {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.score-summary__breakdown ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.breakdown-item {
  display: flex;
  gap: 0.65rem;
  padding: 0.65rem 0.9rem;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.85rem;
}

.breakdown-item--correct {
  border-color: rgba(61, 214, 140, 0.25);
}

.breakdown-item--wrong {
  border-color: rgba(240, 96, 96, 0.25);
}

.breakdown-item__icon {
  flex-shrink: 0;
  font-size: 1rem;
}

.breakdown-item__question {
  font-weight: 600;
  margin-bottom: 0.15rem;
  font-size: 0.85rem;
}

.breakdown-item__explanation {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.score-summary__actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}
```

- [ ] **Step 6: Add CSS import to `src/components/ScoreSummary.tsx`**

Add after existing imports:

```typescript
import "./ScoreSummary.css";
```

- [ ] **Step 7: Create `src/components/Settings.css`**

Extract from `src/index.css` (lines ~903-1075):

```css
.settings {
  position: fixed;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 100;
}

.settings__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.settings__toggle:hover {
  background: var(--surface-hover);
  color: var(--text);
  border-color: var(--border-light);
}

.settings__panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.settings__section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.settings__label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.settings__themes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.settings__swatch {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.72rem;
  color: var(--text-muted);
  transition: all 0.12s;
}

.settings__swatch:hover {
  border-color: var(--border-light);
  color: var(--text);
}

.settings__swatch--active {
  border-color: var(--primary);
  color: var(--text);
}

.settings__swatch-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

.settings__swatch-label {
  flex: 1;
}

.settings__font-sizes {
  display: flex;
  gap: 0.35rem;
}

.settings__font-btn {
  flex: 1;
  padding: 0.3rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-muted);
  transition: all 0.12s;
}

.settings__font-btn:hover {
  border-color: var(--border-light);
  color: var(--text);
}

.settings__font-btn--active {
  border-color: var(--primary);
  color: var(--text);
  background: var(--primary-glow);
}

.settings__range {
  width: 100%;
  accent-color: var(--primary);
  cursor: pointer;
}

.settings__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.settings__switch {
  position: relative;
  width: 36px;
  height: 20px;
  background: var(--border);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
}

.settings__switch--on {
  background: var(--primary);
}

.settings__switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.settings__switch--on .settings__switch-thumb {
  transform: translateX(16px);
}
```

- [ ] **Step 8: Add CSS import to `src/components/Settings.tsx`**

Add after existing imports:

```typescript
import "./Settings.css";
```

- [ ] **Step 9: Commit**

```bash
git add src/components/QuizNav.css src/components/QuizNav.tsx src/components/QuizLoader.css src/components/QuizLoader.tsx src/components/ScoreSummary.css src/components/ScoreSummary.tsx src/components/Settings.css src/components/Settings.tsx
git commit -m "refactor: extract per-component CSS for QuizNav, QuizLoader, ScoreSummary, Settings"
```

---

## Task 11: Slim down index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace `src/index.css` with just global styles**

Keep only: reset, CSS custom properties, theme definitions, base buttons, quiz layout, main content, mobile breakpoints. Everything else has been extracted to component CSS files.

```css
/* ---------- Reset & base ---------- */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #0a0a0a;
  --bg-warm: #101010;
  --surface: #1a1a1a;
  --surface-hover: #242424;
  --border: #333;
  --border-light: #444;
  --text: #e8e8e8;
  --text-muted: #999;
  --text-dim: #666;
  --primary: #ccc;
  --primary-hover: #e0e0e0;
  --primary-glow: rgba(200, 200, 200, 0.08);
  --correct: #3dd68c;
  --correct-bg: rgba(61, 214, 140, 0.08);
  --correct-dim: #2a9d68;
  --wrong: #f06060;
  --wrong-bg: rgba(240, 96, 96, 0.08);
  --wrong-dim: #c04848;
  --pending: #f0c040;
  --pending-bg: rgba(240, 192, 64, 0.08);
  --unanswered: #444;
  --radius: 8px;
  --radius-lg: 12px;
  --font-body: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "IBM Plex Mono", "Fira Code", monospace;
}

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  line-height: 1.6;
}

#root {
  min-height: 100vh;
}

/* ---------- Buttons ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.25rem;
  border: none;
  border-radius: var(--radius);
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.01em;
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--primary);
  color: #111;
}

.btn--primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn--secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text);
  border-color: var(--border-light);
}

/* ---------- Quiz Layout ---------- */
.quiz-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

.quiz-layout--no-sidebar {
  grid-template-columns: 1fr;
}

@media (max-width: 768px) {
  .quiz-layout {
    grid-template-columns: 1fr;
  }
  .quiz-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    max-height: 50vh;
    overflow-y: auto;
    border-top: 1px solid var(--border);
    border-right: none;
  }
}

/* ---------- Main content ---------- */
.quiz-main {
  padding: 2.5rem 3rem;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .quiz-main {
    padding: 1.5rem 1rem 6rem;
  }
}

.quiz-main__nav {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

/* ---------- Theme: Light ---------- */
[data-theme="light"] {
  --bg: #f4f1eb;
  --bg-warm: #eae7e1;
  --surface: #faf8f5;
  --surface-hover: #f0ede7;
  --border: #ccc8c0;
  --border-light: #b8b2a8;
  --text: #1a1a1a;
  --text-muted: #555;
  --text-dim: #888;
  --primary: #333;
  --primary-hover: #222;
  --primary-glow: rgba(0, 0, 0, 0.05);
  --correct: #1a8f5c;
  --correct-bg: rgba(26, 143, 92, 0.08);
  --correct-dim: #16784c;
  --wrong: #d03838;
  --wrong-bg: rgba(208, 56, 56, 0.06);
  --wrong-dim: #b03030;
  --pending: #c09020;
  --pending-bg: rgba(192, 144, 32, 0.08);
  --unanswered: #bbb;
}

[data-theme="light"] .btn--primary {
  color: #f4f1eb;
}

/* ---------- Theme: Midnight ---------- */
[data-theme="midnight"] {
  --bg: #0a1628;
  --bg-warm: #0d1a30;
  --surface: #12203a;
  --surface-hover: #192844;
  --border: #1e3050;
  --border-light: #263a5c;
  --text: #c8d8f0;
  --text-muted: #607898;
  --text-dim: #3c5070;
  --primary: #7090b0;
  --primary-hover: #88a8c8;
  --primary-glow: rgba(112, 144, 176, 0.1);
  --correct: #38c07a;
  --correct-bg: rgba(56, 192, 122, 0.08);
  --correct-dim: #2a9060;
  --wrong: #e85050;
  --wrong-bg: rgba(232, 80, 80, 0.08);
  --wrong-dim: #c04040;
  --pending: #e8a830;
  --pending-bg: rgba(232, 168, 48, 0.08);
  --unanswered: #283850;
}

/* ---------- Theme: Forest ---------- */
[data-theme="forest"] {
  --bg: #0c1a0e;
  --bg-warm: #0e1e12;
  --surface: #142618;
  --surface-hover: #1a3020;
  --border: #1e3822;
  --border-light: #28442c;
  --text: #c8e0cc;
  --text-muted: #608868;
  --text-dim: #3c5840;
  --primary: #5a9060;
  --primary-hover: #6aa870;
  --primary-glow: rgba(90, 144, 96, 0.1);
  --correct: #50d080;
  --correct-bg: rgba(80, 208, 128, 0.08);
  --correct-dim: #38a058;
  --wrong: #d06040;
  --wrong-bg: rgba(208, 96, 64, 0.08);
  --wrong-dim: #a84830;
  --pending: #d0a840;
  --pending-bg: rgba(208, 168, 64, 0.08);
  --unanswered: #284030;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "refactor: slim index.css to globals only (reset, variables, themes, layout)"
```

---

## Task 12: Update App.tsx and wire everything together

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/QuestionCard.tsx` (the old monolith)

- [ ] **Step 1: Delete the old QuestionCard.tsx**

```bash
rm src/components/QuestionCard.tsx
```

- [ ] **Step 2: Rewrite `src/App.tsx`**

Update imports to use new component paths and parser:

```tsx
import { useEffect } from "react";
import { useQuiz } from "./hooks/useQuiz";
import { useSettings } from "./hooks/useSettings";
import type { Quiz } from "./types/quiz";
import { QuizLoader } from "./components/QuizLoader";
import { QuestionCard } from "./components/items/QuestionCard";
import { GroupCard } from "./components/items/GroupCard";
import { InfoPage } from "./components/items/InfoPage";
import { QuizNav } from "./components/QuizNav";
import { ScoreSummary } from "./components/ScoreSummary";
import { Settings } from "./components/Settings";

export default function App() {
  const { settings, update: updateSettings } = useSettings();

  const {
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
    reset,
  } = useQuiz();

  // When served via CLI, quiz data is already parsed and served as JSON
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

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "active") return;
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

  const settingsBtn = (
    <Settings settings={settings} onUpdate={updateSettings} />
  );

  if (phase === "loading") {
    return (
      <>
        {settingsBtn}
        <QuizLoader onLoad={startQuiz} />
      </>
    );
  }

  if (phase === "finished" && quiz) {
    return (
      <>
        {settingsBtn}
        <ScoreSummary
          quiz={quiz}
          answers={answers}
          allQuestions={allQuestions}
          score={score}
          total={totalQuestions}
          onRestart={restart}
          onNewQuiz={reset}
        />
      </>
    );
  }

  if (phase === "active" && currentItem && quiz) {
    return (
      <div className={`quiz-layout ${!settings.showSidebar ? "quiz-layout--no-sidebar" : ""}`}>
        {settingsBtn}
        {settings.showSidebar && <QuizNav
          quiz={quiz}
          currentIndex={currentIndex}
          statuses={itemStatuses}
          onNavigate={goTo}
          onFinish={finish}
          allAnswered={allAnswered}
        />}
        <main className="quiz-main" style={{ maxWidth: `${settings.contentWidth}%` }}>
          <p className="question-card__counter">
            {currentItem.type !== "info" ? `Question ${currentIndex + 1} of ${flatItems.length}` : ""}
          </p>
          {currentItem.type === "info" && (
            <InfoPage content={currentItem.content} />
          )}
          {currentItem.type === "group" && (
            <GroupCard
              group={currentItem}
              index={currentIndex}
              total={flatItems.length}
              answers={answers}
              onSubmit={submitAnswer}
            />
          )}
          {currentItem.type !== "info" && currentItem.type !== "group" && (
            <QuestionCard
              question={currentItem}
              answer={answers.get(currentItem.id)}
              onSubmit={submitAnswer}
            />
          )}
          <div className="quiz-main__nav">
            <button
              className="btn btn--secondary"
              onClick={prevQuestion}
              disabled={currentIndex === 0}
            >
              Previous
            </button>
            <button
              className="btn btn--secondary"
              onClick={nextQuestion}
              disabled={currentIndex === flatItems.length - 1}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/components/QuestionCard.tsx
git commit -m "refactor: wire App.tsx to new component tree, delete old QuestionCard monolith"
```

---

## Task 13: Update QuizLoader to use parsers and accept .quiz.md

**Files:**
- Modify: `src/components/QuizLoader.tsx`

- [ ] **Step 1: Rewrite `src/components/QuizLoader.tsx`**

```tsx
import { useState, useCallback } from "react";
import type { Quiz } from "../types/quiz";
import { parseQuiz } from "../parsers";
import "./QuizLoader.css";

interface QuizLoaderProps {
  onLoad: (quiz: Quiz) => void;
}

export function QuizLoader({ onLoad }: QuizLoaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          onLoad(parseQuiz(content, file.name));
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to parse quiz file. Check the file format."
          );
        }
      };
      reader.readAsText(file);
    },
    [onLoad]
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="quiz-loader">
      <h1>QuizMe</h1>
      <p className="quiz-loader__subtitle">
        Drop a .quiz or .quiz.md file to get started.
      </p>

      <div
        className={`quiz-loader__dropzone ${dragging ? "quiz-loader__dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="quiz-loader__icon">📄</span>
        <p>Drag &amp; drop your quiz file here</p>
        <span className="quiz-loader__or">or</span>
        <label className="quiz-loader__btn">
          Choose file
          <input
            type="file"
            accept=".quiz,.json,.md"
            onChange={handleFile}
            hidden
          />
        </label>
      </div>

      {error && <p className="quiz-loader__error">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuizLoader.tsx
git commit -m "feat: update QuizLoader to use unified parser, accept .quiz.md"
```

---

## Task 14: Update CLI to use parsers

**Files:**
- Modify: `cli.ts`

- [ ] **Step 1: Rewrite `cli.ts`**

```typescript
#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { program } from "commander";
import { createServer } from "vite";
import open from "open";
import { parseQuiz } from "./src/parsers";

const rootDir = import.meta.dir;

program
  .name("quizme")
  .description("Launch a quiz in your browser")
  .argument("[file]", "path to a .quiz, .json, or .quiz.md file (optional — opens file picker if omitted)")
  .option("-p, --port <number>", "port to serve on", "3000")
  .option("-t, --test", "run the built-in sample quiz")
  .option("--no-open", "don't auto-open the browser")
  .action(async (file: string | undefined, opts: { port: string; test?: boolean; open: boolean }) => {
    let quizData: unknown = null;

    if (opts.test) {
      file = join(rootDir, "examples", "sample.quiz");
    }

    if (file) {
      const quizPath = resolve(file);
      if (!existsSync(quizPath)) {
        console.error(`Error: file not found: ${quizPath}`);
        process.exit(1);
      }
      try {
        const content = await Bun.file(quizPath).text();
        quizData = parseQuiz(content, basename(quizPath));
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : "could not parse quiz file."}`);
        process.exit(1);
      }
    }

    const port = parseInt(opts.port, 10);

    const server = await createServer({
      root: rootDir,
      configFile: resolve(rootDir, "vite.config.ts"),
      server: { port },
      plugins: [
        {
          name: "quizme-api",
          configureServer(server) {
            server.middlewares.use("/api/quiz", (_req, res) => {
              if (quizData) {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(quizData));
              } else {
                res.statusCode = 404;
                res.end();
              }
            });
          },
        },
      ],
    });

    await server.listen();
    const url = `http://localhost:${port}`;
    console.log(`\nQuizMe is running at ${url}`);
    if (file) {
      console.log(`Serving quiz: ${resolve(file)}`);
    } else {
      console.log("No quiz file provided — use the file picker in the browser.");
    }
    console.log();

    if (opts.open) {
      open(url);
    }
  });

program.parse();
```

- [ ] **Step 2: Update `tsconfig.json` to include `cli.ts`**

The `cli.ts` now imports from `src/parsers`, but `tsconfig.json` only includes `src`. Add the root:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "cli.ts"]
}
```

- [ ] **Step 3: Commit**

```bash
git add cli.ts tsconfig.json
git commit -m "feat: update CLI to use unified parser, accept .quiz.md files"
```

---

## Task 15: Update sample quiz to index-based answers and add .quiz.md example

**Files:**
- Modify: `examples/sample.quiz`
- Create: `examples/sample.quiz.md`

- [ ] **Step 1: Rewrite `examples/sample.quiz` with index-based answers**

```json
{
  "title": "AWS Solutions Architect",
  "description": "Practice exam for SAA-C03",
  "questions": [
    {
      "type": "info",
      "content": "# AWS Solutions Architect\n\nThis quiz covers key topics for the **SAA-C03** exam:\n\n- **S3** — storage classes, object limits, naming\n- **Serverless** — Lambda, DynamoDB\n- **IAM** — Identity and Access Management\n\nAWS pricing often uses formulas like:\n\n$$C = \\sum_{i=1}^{n} r_i \\cdot t_i \\cdot p_i$$\n\nwhere $r_i$ is the resource count, $t_i$ is the duration in hours, and $p_i$ is the per-unit price.\n\n> Tip: Read each question carefully before answering!"
    },
    {
      "type": "section",
      "title": "S3 Storage",
      "items": [
        {
          "type": "single",
          "question": "Which S3 storage class is cheapest for infrequent access?",
          "options": ["S3 Standard", "S3 Glacier", "S3 Standard-IA", "S3 One Zone-IA"],
          "answer": 3,
          "hint": "Think about which class trades redundancy for lower cost.",
          "explanation": "One Zone-IA is cheapest but lacks multi-AZ redundancy."
        },
        {
          "type": "group",
          "question": "Answer the following questions about S3:",
          "parts": [
            {
              "type": "truefalse",
              "question": "S3 bucket names must be globally unique.",
              "answer": true,
              "explanation": "Bucket names share a global namespace across all AWS accounts."
            },
            {
              "type": "single",
              "question": "What is the maximum object size in S3?",
              "options": ["1 TB", "5 TB", "10 TB", "Unlimited"],
              "answer": 1,
              "explanation": "The maximum object size in S3 is 5 terabytes."
            },
            {
              "type": "freetext",
              "question": "What does S3 stand for?",
              "answer": "Simple Storage Service",
              "caseSensitive": false,
              "placeholder": "Full name of the service...",
              "explanation": "S3 = Simple Storage Service."
            }
          ],
          "explanation": "S3 is one of the foundational AWS services and a key topic on the SAA-C03 exam."
        }
      ]
    },
    {
      "type": "section",
      "title": "Serverless & IAM",
      "items": [
        {
          "type": "multi",
          "question": "Which services are serverless? (select all that apply)",
          "options": ["EC2", "Lambda", "DynamoDB", "RDS"],
          "answers": [1, 2],
          "hint": "Serverless means you don't provision or manage servers.",
          "explanation": "Lambda and DynamoDB require no server management."
        },
        {
          "type": "freetext",
          "question": "What does IAM stand for?",
          "answer": "Identity and Access Management",
          "hint": "It's three words: **I**___ **A**___ **M**___",
          "caseSensitive": false,
          "placeholder": "e.g. Identity and ...",
          "explanation": "IAM controls who can do what in your AWS account."
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Create `examples/sample.quiz.md`**

```markdown
---
title: AWS Solutions Architect
description: Practice exam for SAA-C03
---

## [info] AWS Solutions Architect
:::
# AWS Solutions Architect

This quiz covers key topics for the **SAA-C03** exam:

- **S3** — storage classes, object limits, naming
- **Serverless** — Lambda, DynamoDB
- **IAM** — Identity and Access Management

AWS pricing often uses formulas like:

$$C = \sum_{i=1}^{n} r_i \cdot t_i \cdot p_i$$

where $r_i$ is the resource count, $t_i$ is the duration in hours, and $p_i$ is the per-unit price.

> Tip: Read each question carefully before answering!
:::

# S3 Storage

## [single] Which S3 storage class is cheapest for infrequent access?

- S3 Standard
- S3 Glacier
- S3 Standard-IA
- S3 One Zone-IA *

?> Think about which class trades redundancy for lower cost.

> One Zone-IA is cheapest but lacks multi-AZ redundancy.

## [group] Answer the following questions about S3:

### [truefalse] S3 bucket names must be globally unique.

true *

> Bucket names share a global namespace across all AWS accounts.

### [single] What is the maximum object size in S3?

- 1 TB
- 5 TB *
- 10 TB
- Unlimited

> The maximum object size in S3 is 5 terabytes.

### [freetext] What does S3 stand for?

= Simple Storage Service

> S3 = Simple Storage Service.

> S3 is one of the foundational AWS services and a key topic on the SAA-C03 exam.

# Serverless & IAM

## [multi] Which services are serverless? (select all that apply)

- EC2
- Lambda *
- DynamoDB *
- RDS

?> Serverless means you don't provision or manage servers.

> Lambda and DynamoDB require no server management.

## [freetext] What does IAM stand for?

= Identity and Access Management

?> It's three words: **I**___ **A**___ **M**___

> IAM controls who can do what in your AWS account.
```

- [ ] **Step 3: Commit**

```bash
git add examples/sample.quiz examples/sample.quiz.md
git commit -m "feat: update sample.quiz to index-based answers, add sample.quiz.md example"
```

---

## Task 16: Update ScoreSummary for index-based answers

**Files:**
- Modify: `src/components/ScoreSummary.tsx`

- [ ] **Step 1: Update ScoreSummary to show correct option text for single/multi**

The "Expected" display for incorrect answers needs to dereference the index. Update `src/components/ScoreSummary.tsx`:

```tsx
import type { Quiz, Question, AnswerRecord } from "../types/quiz";
import { Markdown } from "./ui/Markdown";
import "./ScoreSummary.css";

interface ScoreSummaryProps {
  quiz: Quiz;
  answers: Map<string, AnswerRecord>;
  allQuestions: Question[];
  score: number;
  total: number;
  onRestart: () => void;
  onNewQuiz: () => void;
}

export function ScoreSummary({
  quiz,
  answers,
  allQuestions,
  score,
  total,
  onRestart,
  onNewQuiz,
}: ScoreSummaryProps) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="score-summary">
      <h1>{quiz.title}</h1>
      <div className="score-summary__hero">
        <span className="score-summary__pct">{pct}%</span>
        <span className="score-summary__fraction">
          {score} / {total} correct
        </span>
      </div>

      <div className="score-summary__breakdown">
        <h2>Question breakdown</h2>
        <ul>
          {allQuestions.map((q) => {
            const record = answers.get(q.id);
            const isCorrect = record?.correct ?? false;
            const wasAnswered = !!record;
            return (
              <li
                key={q.id}
                className={`breakdown-item ${wasAnswered ? (isCorrect ? "breakdown-item--correct" : "breakdown-item--wrong") : ""}`}
              >
                <span className="breakdown-item__icon">
                  {!wasAnswered ? "\u2B55" : isCorrect ? "\u2705" : "\u274C"}
                </span>
                <div className="breakdown-item__content">
                  <p className="breakdown-item__question"><Markdown inline>{q.question}</Markdown></p>
                  {q.explanation && (
                    <p className="breakdown-item__explanation">
                      <Markdown inline>{q.explanation}</Markdown>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="score-summary__actions">
        <button className="btn btn--primary" onClick={onRestart}>
          Retry quiz
        </button>
        <button className="btn btn--secondary" onClick={onNewQuiz}>
          Load new quiz
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScoreSummary.tsx
git commit -m "refactor: update ScoreSummary imports for new component paths"
```

---

## Task 17: Run typecheck and fix any remaining issues

- [ ] **Step 1: Run typecheck**

```bash
bun run typecheck
```

Fix any type errors that appear. Common issues to watch for:
- Import paths referencing old locations (e.g. `./Markdown` instead of `./ui/Markdown`)
- Answer type mismatches in components that haven't been updated
- Missing CSS imports

- [ ] **Step 2: Test manually**

```bash
quizme -t
```

Verify:
- Quiz loads and renders
- All question types work (single, multi, truefalse, freetext)
- Answers check correctly with index-based answers
- Groups render with parts
- Info pages display
- Sidebar navigation works
- Score summary shows correct results

- [ ] **Step 3: Test with the markdown file**

```bash
quizme examples/sample.quiz.md
```

Verify: Same quiz renders identically to the JSON version.

- [ ] **Step 4: Test file picker**

```bash
quizme
```

Drag and drop both `sample.quiz` and `sample.quiz.md` to verify both work through the browser loader.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining type errors and integration issues"
```

---

## Task 18: Update documentation

**Files:**
- Create: `docs/quiz-md-format.md`
- Modify: `docs/quiz-format.md`
- Modify: `docs/architecture.md`
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Create `docs/quiz-md-format.md`**

```markdown
# Markdown Quiz Format

A quiz can be written as a `.quiz.md` file using a Markdown-based DSL. The app parses it into the same internal format as JSON `.quiz` files.

## Frontmatter

Every `.quiz.md` file starts with YAML frontmatter:

```yaml
---
title: My Quiz
description: Optional description
---
```

## Sections

`# Heading` creates a section (groups items under a heading in the sidebar):

```markdown
# Section Title
```

## Questions

`## [type] text` creates a question. The type tag in brackets is always required.

Supported types: `single`, `multi`, `truefalse`, `freetext`, `info`, `group`.

```markdown
## [single] Which planet is closest to the Sun?
## [truefalse] The sky is blue.
## [freetext] What does HTML stand for?
## [info] Welcome
```

## Rich question body

For questions that need code blocks, tables, or multi-paragraph content, use `:::` delimiters:

```markdown
## [single] Mystery function
:::
Given this function:

\`\`\`python
def mystery(n):
    return n * (n + 1) // 2
\`\`\`

What does `mystery(10)` return?
:::

- 45
- 55 *
- 100
```

If no `:::` block is present, the heading text is the entire question.

## Answers

**Single choice** — `*` after the correct option:
```markdown
- Venus
- Mercury *
- Earth
```

**Multiple choice** — `*` on each correct option:
```markdown
- EC2
- Lambda *
- DynamoDB *
- RDS
```

**True/false** — the correct value followed by `*`:
```markdown
true *
```

**Free text** — `=` prefix:
```markdown
= Simple Storage Service
```

Free text answers are always case-insensitive in the Markdown format.

## Hints

`?>` prefix:

```markdown
?> Think about which class trades redundancy for cost.
```

## Explanations

Standard blockquote:

```markdown
> Mercury orbits at ~58 million km from the Sun.
```

## Groups

`## [group]` with `### [type]` sub-questions:

```markdown
## [group] Answer the following about S3:

### [truefalse] Bucket names are globally unique.
true *
> Global namespace across all accounts.

### [freetext] What does S3 stand for?
= Simple Storage Service
```

## Full example

See [`examples/sample.quiz.md`](../examples/sample.quiz.md) for a complete working example.
```

- [ ] **Step 2: Update `docs/quiz-format.md`**

Update the answer field descriptions to reflect index-based answers. Change the `single` answer field from:

```
| `answer` | string | yes | Must match one of `options` exactly |
```

to:

```
| `answer` | number | yes | Zero-based index into `options` array |
```

And the `multi` answers field from:

```
| `answers` | string[] | yes | All correct options (order doesn't matter) |
```

to:

```
| `answers` | number[] | yes | Zero-based indices of correct options |
```

Update the JSON examples to use index-based answers (e.g. `"answer": 1` instead of `"answer": "4"`).

Add a note at the top mentioning both formats:

```markdown
QuizMe supports two quiz formats: `.quiz` (JSON, documented here) and `.quiz.md` (Markdown DSL, see [quiz-md-format.md](quiz-md-format.md)).
```

- [ ] **Step 3: Update `CLAUDE.md`**

Update the Project Structure section to reflect the new directory layout. Update the Quiz File Format section to mention `.quiz.md`. Update the Architecture Notes to mention the parsers layer.

- [ ] **Step 4: Update `README.md`**

Add `.quiz.md` to the usage section and format description.

- [ ] **Step 5: Update `docs/architecture.md`**

Update the project structure tree, component descriptions, and add the parsers layer to the data flow section.

- [ ] **Step 6: Commit**

```bash
git add docs/ CLAUDE.md README.md
git commit -m "docs: add Markdown DSL spec, update all docs for index-based answers and new architecture"
```
