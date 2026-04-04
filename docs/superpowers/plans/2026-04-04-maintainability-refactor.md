# Maintainability Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve type naming consistency, reduce hook complexity, and split oversized modules — without changing runtime behaviour or external quiz file formats.

**Architecture:** Four independent tracks: (1) type-system renames via LSP, (2) hook decomposition, (3) App.tsx cleanup, (4) parser split. All changes are internal — no external API, file format, or public hook API changes.

**Tech Stack:** Bun, TypeScript (strict), React 18, Vite. Tests: `bun test`. Typecheck: `bun run typecheck`.

---

## File Map

**Modified:**
- `src/types/quiz.ts` — rename `Quiz.questions`, normalize answer fields, add `SubmitAnswer` type
- `src/parsers/parseMarkdown.ts` — slim to entry point + dispatch loop; answer field renames
- `src/parsers/parseJson.ts` — map external `questions`/`answer`/`answers` to internal names
- `src/utils/checkAnswer.ts` — answer field renames
- `src/utils/validateQuiz.ts` — answer field renames
- `src/components/items/QuestionCard.tsx` — use `SubmitAnswer` type, answer field renames
- `src/components/items/GroupCard.tsx` — use `SubmitAnswer` type
- `src/components/inputs/SingleInput.tsx` — answer field rename
- `src/components/inputs/MultiInput.tsx` — answer field rename
- `src/components/inputs/TrueFalseInput.tsx` — answer field rename
- `src/components/QuizNav.tsx` — `quiz.questions` → `quiz.items`
- `src/hooks/useQuiz.ts` — compose sub-hooks, rename field
- `src/App.tsx` — use `useQuizLoader` + `useKeyboardNav`
- `src/parsers/parseMarkdown.test.ts` — `quiz.questions` → `quiz.items`

**Created:**
- `src/hooks/useQuizNavigation.ts`
- `src/hooks/useQuizScoring.ts`
- `src/hooks/useQuizLoader.ts`
- `src/hooks/useKeyboardNav.ts`
- `src/parsers/parseMarkdownFrontmatter.ts`
- `src/parsers/parseMarkdownItem.ts`
- `src/parsers/parseMarkdownGroup.ts`

---

## Task 1: Establish green baseline

**Files:** none changed

- [ ] **Step 1: Run tests**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: no errors.

---

## Task 2: Rename `Quiz.questions` → `Quiz.items` via LSP

**Files:**
- Modify: `src/types/quiz.ts:74`
- Modify: `src/parsers/parseMarkdown.ts:99`
- Modify: `src/parsers/parseJson.ts:13,41,50-54`
- Modify: `src/components/QuizNav.tsx:19`
- Modify: `src/parsers/parseMarkdown.test.ts` (5 occurrences)

- [ ] **Step 1: Use LSP rename on `Quiz.questions`**

In `src/types/quiz.ts`, place cursor on `questions` at line 76 (the field declaration inside `Quiz`). Use LSP rename symbol → `items`. Verify the rename touched `src/components/QuizNav.tsx:19` and `src/hooks/useQuiz.ts` (the `quiz.questions.flatMap` call at line 20).

- [ ] **Step 2: Fix `parseMarkdown.ts` return value**

The LSP rename will not update the shorthand object literal `{ ..., questions: topLevelItems }`. Change it manually:

In `src/parsers/parseMarkdown.ts` line 99–103, change:
```ts
  return {
    title: frontmatter.title,
    description: frontmatter.description,
    questions: topLevelItems,
  };
```
to:
```ts
  return {
    title: frontmatter.title,
    description: frontmatter.description,
    items: topLevelItems,
  };
```

- [ ] **Step 3: Fix `parseJson.ts`**

Replace the entire file body to map `raw.questions` to the internal `items` field:

```ts
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

  const items: TopLevelItem[] = raw.questions.map((item: any) => {
    if (item.type === "section") {
      item.id = ids.nextSectionId(item.id);
      const children: QuizItem[] = (item.items || []).map((child: any) => assignItemId(child));
      return { ...item, items: children };
    }
    return assignItemId(item);
  });

  return {
    title: raw.title,
    description: raw.description,
    items,
  };
}
```

- [ ] **Step 4: Update test file**

In `src/parsers/parseMarkdown.test.ts`, replace all occurrences of `quiz.questions` with `quiz.items` (5 occurrences on lines 18, 35, 54, 67, 80).

- [ ] **Step 5: Typecheck + test**

```bash
bun run typecheck && bun test
```

Expected: no errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/quiz.ts src/parsers/parseMarkdown.ts src/parsers/parseJson.ts src/components/QuizNav.tsx src/hooks/useQuiz.ts src/parsers/parseMarkdown.test.ts
git commit -m "refactor: rename Quiz.questions → Quiz.items"
```

---

## Task 3: Normalize answer field names

Rename `answer`/`answers` to `correctAnswer`/`correctAnswers` across all four question types. JSON files still use `answer`/`answers` — the parser maps them.

**Files:**
- Modify: `src/types/quiz.ts`
- Modify: `src/utils/checkAnswer.ts`
- Modify: `src/utils/validateQuiz.ts`
- Modify: `src/parsers/parseMarkdown.ts`
- Modify: `src/parsers/parseJson.ts`
- Modify: `src/components/inputs/SingleInput.tsx`
- Modify: `src/components/inputs/MultiInput.tsx`
- Modify: `src/components/inputs/TrueFalseInput.tsx`
- Modify: `src/components/items/QuestionCard.tsx`

- [ ] **Step 1: Update `src/types/quiz.ts`**

Change the four question interface fields:

```ts
export interface SingleChoiceQuestion {
  id: string;
  type: "single";
  question: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  explanation?: string;
}

export interface MultiChoiceQuestion {
  id: string;
  type: "multi";
  question: string;
  options: string[];
  correctAnswers: number[];
  hint?: string;
  explanation?: string;
}

export interface TrueFalseQuestion {
  id: string;
  type: "truefalse";
  question: string;
  correctAnswer: boolean;
  hint?: string;
  explanation?: string;
}

export interface FreeTextQuestion {
  id: string;
  type: "freetext";
  question: string;
  correctAnswer: string;
  caseSensitive?: boolean;
  placeholder?: string;
  hint?: string;
  explanation?: string;
}
```

- [ ] **Step 2: Update `src/utils/checkAnswer.ts`**

```ts
import type { Question } from "../types/quiz";

export function checkAnswer(
  question: Question,
  userAnswer: number | number[] | boolean | string
): boolean {
  switch (question.type) {
    case "single":
      return question.correctAnswer === userAnswer;
    case "multi": {
      if (!Array.isArray(userAnswer)) return false;
      const sorted = [...userAnswer].sort((a, b) => a - b);
      const expected = [...question.correctAnswers].sort((a, b) => a - b);
      return (
        sorted.length === expected.length &&
        sorted.every((v, i) => v === expected[i])
      );
    }
    case "truefalse":
      return question.correctAnswer === userAnswer;
    case "freetext": {
      if (typeof userAnswer !== "string") return false;
      const a = question.caseSensitive
        ? userAnswer.trim()
        : userAnswer.trim().toLowerCase();
      const b = question.caseSensitive
        ? question.correctAnswer.trim()
        : question.correctAnswer.trim().toLowerCase();
      return a === b;
    }
  }
}
```

- [ ] **Step 3: Update `src/utils/validateQuiz.ts`**

```ts
import type { QuizItem } from "../types/quiz";

export function validateAnswerIndex(item: QuizItem) {
  if (item.type === "single") {
    if (typeof item.correctAnswer !== "number" || item.correctAnswer < 0 || item.correctAnswer >= item.options.length) {
      throw new Error(
        `Invalid answer index ${item.correctAnswer} for question "${item.question}" with ${item.options.length} options`
      );
    }
  }
  if (item.type === "multi") {
    if (!Array.isArray(item.correctAnswers)) {
      throw new Error(`Multi question "${item.question}" must have a correctAnswers array`);
    }
    for (const idx of item.correctAnswers) {
      if (typeof idx !== "number" || idx < 0 || idx >= item.options.length) {
        throw new Error(
          `Invalid answer index ${idx} for question "${item.question}" with ${item.options.length} options`
        );
      }
    }
  }
}
```

- [ ] **Step 4: Update `src/parsers/parseMarkdown.ts` object literals**

In the `parseItem` function's `switch(type)` block, change `answer:` → `correctAnswer:` and `answers:` → `correctAnswers:` in the four object literals:

```ts
      case "single":
        // ...
        item = {
          id,
          type: "single",
          question: questionText,
          options,
          correctAnswer: correctIndices[0],
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
          correctAnswers: correctIndices,
          hint,
          explanation,
        } as MultiChoiceQuestion;
        break;
      case "truefalse":
        // ...
        item = {
          id,
          type: "truefalse",
          question: questionText,
          correctAnswer: trueFalseAnswer,
          hint,
          explanation,
        } as TrueFalseQuestion;
        break;
      case "freetext":
        // ...
        item = {
          id,
          type: "freetext",
          question: questionText,
          correctAnswer: freetextAnswer,
          hint,
          explanation,
        } as FreeTextQuestion;
        break;
```

- [ ] **Step 5: Update `src/parsers/parseJson.ts` to map external fields**

In the `assignItemId` function, add field mapping after ID assignment so JSON files with `answer`/`answers` still work:

```ts
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
        item.parts.forEach((part: any) => {
          // Map external field names to internal TypeScript names
          if ("answer" in part) { part.correctAnswer = part.answer; delete part.answer; }
          if ("answers" in part) { part.correctAnswers = part.answers; delete part.answers; }
          validateAnswerIndex(part);
        });
      }
      return item;
    }

    // single, multi, truefalse, freetext
    item.id = ids.nextQuestionId(item.id);
    // Map external field names to internal TypeScript names
    if ("answer" in item) { item.correctAnswer = item.answer; delete item.answer; }
    if ("answers" in item) { item.correctAnswers = item.answers; delete item.answers; }
    validateAnswerIndex(item);
    return item;
  }
```

- [ ] **Step 6: Update `src/components/inputs/SingleInput.tsx`**

Line 32: change `question.answer` → `question.correctAnswer`:

```tsx
          if (submitted) {
            if (idx === question.correctAnswer) cls += " option--correct";
            else if (idx === previousAnswer) cls += " option--wrong";
          }
```

- [ ] **Step 7: Update `src/components/inputs/MultiInput.tsx`**

Line 38: change `question.answers` → `question.correctAnswers`:

```tsx
          if (submitted) {
            if (question.correctAnswers.includes(idx)) cls += " option--correct";
            else if (selected.includes(idx)) cls += " option--wrong";
          }
```

- [ ] **Step 8: Update `src/components/inputs/TrueFalseInput.tsx`**

Line 27: change `question.answer` → `question.correctAnswer`:

```tsx
    if (submitted) {
      if (val === question.correctAnswer) cls += " btn--tf-correct";
      else if (val === previousAnswer) cls += " btn--tf-wrong";
    }
```

- [ ] **Step 9: Update `src/components/items/QuestionCard.tsx`**

Two occurrences — the `freetext` and `single` "Expected:" feedback lines:

```tsx
          {question.type === "freetext" && !correct && (
            <p>
              Expected: <strong><Markdown inline>{question.correctAnswer}</Markdown></strong>
            </p>
          )}
          {question.type === "single" && !correct && (
            <p>
              Expected: <strong><Markdown inline>{question.options[question.correctAnswer]}</Markdown></strong>
            </p>
          )}
```

- [ ] **Step 10: Typecheck + test**

```bash
bun run typecheck && bun test
```

Expected: no errors, all tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/types/quiz.ts src/utils/checkAnswer.ts src/utils/validateQuiz.ts \
  src/parsers/parseMarkdown.ts src/parsers/parseJson.ts \
  src/components/inputs/SingleInput.tsx src/components/inputs/MultiInput.tsx \
  src/components/inputs/TrueFalseInput.tsx src/components/items/QuestionCard.tsx
git commit -m "refactor: normalize answer fields to correctAnswer/correctAnswers"
```

---

## Task 4: Add `SubmitAnswer` named type

**Files:**
- Modify: `src/types/quiz.ts`
- Modify: `src/components/items/QuestionCard.tsx`
- Modify: `src/components/items/GroupCard.tsx`
- Modify: `src/hooks/useQuiz.ts`

- [ ] **Step 1: Add `SubmitAnswer` to `src/types/quiz.ts`**

Add after the `AnswerRecord` interface (end of file):

```ts
export type SubmitAnswer = (questionId: string, answer: number | number[] | boolean | string) => void;
```

- [ ] **Step 2: Update `src/components/items/QuestionCard.tsx`**

Import and use the type:

```tsx
import type { Question, AnswerRecord, SubmitAnswer } from "../../types/quiz";
```

Change the `onSubmit` prop type:

```tsx
interface QuestionCardProps {
  question: Question;
  answer?: AnswerRecord;
  onSubmit: SubmitAnswer;
}
```

- [ ] **Step 3: Update `src/components/items/GroupCard.tsx`**

```tsx
import type { QuestionGroup, Question, AnswerRecord, SubmitAnswer } from "../../types/quiz";
```

```tsx
interface GroupCardProps {
  group: QuestionGroup;
  index: number;
  total: number;
  answers: Map<string, AnswerRecord>;
  onSubmit: SubmitAnswer;
}
```

- [ ] **Step 4: Update `src/hooks/useQuiz.ts`**

Import and use `SubmitAnswer`:

```ts
import type {
  Quiz,
  QuizItem,
  Question,
  AnswerRecord,
  ItemStatus,
  SubmitAnswer,
} from "../types/quiz";
```

Change the `submitAnswer` signature annotation (it's currently inferred — add explicit type to the `useCallback`):

```ts
  const submitAnswer: SubmitAnswer = useCallback(
    (questionId, userAnswer) => {
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
```

- [ ] **Step 5: Typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/quiz.ts src/components/items/QuestionCard.tsx src/components/items/GroupCard.tsx src/hooks/useQuiz.ts
git commit -m "refactor: add SubmitAnswer named type, replace inline signatures"
```

---

## Task 5: Extract `useQuizNavigation`

**Files:**
- Create: `src/hooks/useQuizNavigation.ts`

- [ ] **Step 1: Create `src/hooks/useQuizNavigation.ts`**

```ts
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
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useQuizNavigation.ts
git commit -m "refactor: extract useQuizNavigation hook"
```

---

## Task 6: Extract `useQuizScoring`

**Files:**
- Create: `src/hooks/useQuizScoring.ts`

- [ ] **Step 1: Create `src/hooks/useQuizScoring.ts`**

```ts
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
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useQuizScoring.ts
git commit -m "refactor: extract useQuizScoring hook"
```

---

## Task 7: Refactor `useQuiz` as orchestrator

**Files:**
- Modify: `src/hooks/useQuiz.ts`

The public API must remain identical — `App.tsx` should not need any changes from this task.

- [ ] **Step 1: Rewrite `src/hooks/useQuiz.ts`**

```ts
import { useState, useCallback } from "react";
import type { Quiz, QuizItem, Question, AnswerRecord, SubmitAnswer } from "../types/quiz";
import { checkAnswer } from "../utils/checkAnswer";
import { useQuizNavigation } from "./useQuizNavigation";
import { useQuizScoring } from "./useQuizScoring";

export type QuizPhase = "loading" | "active" | "finished";

export function useQuiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Map<string, AnswerRecord>>(new Map());
  const [phase, setPhase] = useState<QuizPhase>("loading");

  const { reset: resetNav, ...nav } = useQuizNavigation(quiz);
  const scoring = useQuizScoring(nav.flatItems, nav.currentIndex, answers);

  const startQuiz = useCallback((q: Quiz) => {
    setQuiz(q);
    resetNav();
    setAnswers(new Map());
    setPhase("active");
  }, [resetNav]);

  const submitAnswer: SubmitAnswer = useCallback(
    (questionId, userAnswer) => {
      const question = findQuestion(nav.flatItems, questionId);
      if (!question) return;

      const correct = checkAnswer(question, userAnswer);
      const record: AnswerRecord = { questionId, userAnswer, correct };

      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, record);
        return next;
      });
    },
    [nav.flatItems]
  );

  const finish = useCallback(() => setPhase("finished"), []);

  const restart = useCallback(() => {
    resetNav();
    setAnswers(new Map());
    setPhase("active");
  }, [resetNav]);

  return {
    quiz,
    phase,
    currentIndex: nav.currentIndex,
    currentItem: nav.currentItem,
    flatItems: nav.flatItems,
    answers,
    score: scoring.score,
    totalQuestions: scoring.totalQuestions,
    allQuestions: scoring.allQuestions,
    itemStatuses: scoring.itemStatuses,
    allAnswered: scoring.allAnswered,
    startQuiz,
    submitAnswer,
    goTo: nav.goTo,
    nextQuestion: nav.nextQuestion,
    prevQuestion: nav.prevQuestion,
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

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Verify `App.tsx` is unchanged**

`App.tsx` should compile without any edits. The `bun run typecheck` above confirms this.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useQuiz.ts
git commit -m "refactor: useQuiz now orchestrates useQuizNavigation + useQuizScoring"
```

---

## Task 8: Extract `useQuizLoader` and `useKeyboardNav`

**Files:**
- Create: `src/hooks/useQuizLoader.ts`
- Create: `src/hooks/useKeyboardNav.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/hooks/useQuizLoader.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/hooks/useKeyboardNav.ts`**

```ts
import { useEffect } from "react";
import type { QuizPhase } from "./useQuiz";

interface KeyboardNavOptions {
  phase: QuizPhase;
  nextQuestion: () => void;
  prevQuestion: () => void;
}

export function useKeyboardNav({ phase, nextQuestion, prevQuestion }: KeyboardNavOptions): void {
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
```

- [ ] **Step 3: Update `src/App.tsx`**

Replace the two inline `useEffect` blocks with hook calls. Change the imports at the top:

```tsx
import { useQuiz } from "./hooks/useQuiz";
import { useSettings } from "./hooks/useSettings";
import { useQuizLoader } from "./hooks/useQuizLoader";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import type { Quiz } from "./types/quiz";
import { QuizLoader } from "./components/QuizLoader";
import { QuestionCard } from "./components/items/QuestionCard";
import { GroupCard } from "./components/items/GroupCard";
import { InfoPage } from "./components/items/InfoPage";
import { QuizNav } from "./components/QuizNav";
import { ScoreSummary } from "./components/ScoreSummary";
import { Settings } from "./components/Settings";
```

Remove the `useEffect` import (no longer needed in App). Replace the two inline `useEffect` blocks inside `App()`:

```tsx
  useQuizLoader(startQuiz);
  useKeyboardNav({ phase, nextQuestion, prevQuestion });
```

The rest of `App.tsx` is unchanged.

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useQuizLoader.ts src/hooks/useKeyboardNav.ts src/App.tsx
git commit -m "refactor: extract useQuizLoader and useKeyboardNav from App.tsx"
```

---

## Task 9: Split `parseMarkdown.ts`

**Files:**
- Create: `src/parsers/parseMarkdownFrontmatter.ts`
- Create: `src/parsers/parseMarkdownItem.ts`
- Create: `src/parsers/parseMarkdownGroup.ts`
- Modify: `src/parsers/parseMarkdown.ts`

- [ ] **Step 1: Create `src/parsers/parseMarkdownFrontmatter.ts`**

```ts
interface ParsedFrontmatter {
  title: string;
  description?: string;
}

export function replaceLocalImages(content: string): string {
  return content.replace(/^:::[ ]*(\S+)[ ]*$/gm, (_, filename) => `![${filename}](/quiz-images/${filename})`);
}

export function extractFrontmatter(content: string): {
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
```

- [ ] **Step 2: Create `src/parsers/parseMarkdownItem.ts`**

Extract the `parseItem` function. This function was previously a closure inside `parseMarkdown` that referenced the shared `ids` object via closure — pass it as a parameter instead:

```ts
import type {
  QuizItem,
  Question,
  SingleChoiceQuestion,
  MultiChoiceQuestion,
  TrueFalseQuestion,
  FreeTextQuestion,
  InfoPage,
} from "../types/quiz";
import type { IdGenerator } from "../utils/idGenerator";
import { validateAnswerIndex } from "../utils/validateQuiz";

type ItemType = "single" | "multi" | "truefalse" | "freetext" | "info" | "group";

export function parseItem(
  lines: string[],
  startIndex: number,
  type: ItemType,
  headingText: string,
  ids: IdGenerator
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

  let hint: string | undefined;
  let explanation: string | undefined;
  const options: string[] = [];
  const correctIndices: number[] = [];
  let trueFalseAnswer: boolean | undefined;
  let freetextAnswer: string | undefined;

  while (i < lines.length) {
    const l = lines[i];

    if (l.match(/^#{1,3} /)) break;

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

    const tfMatch = l.match(/^(true|false)\s*\*?\s*$/i);
    if (tfMatch) {
      if (l.includes("*")) {
        trueFalseAnswer = tfMatch[1].toLowerCase() === "true";
      }
      i++;
      continue;
    }

    const ftMatch = l.match(/^= (.+)/);
    if (ftMatch) {
      freetextAnswer = ftMatch[1].trim();
      i++;
      continue;
    }

    const hintMatch = l.match(/^\?> (.+)/);
    if (hintMatch) {
      hint = hintMatch[1].trim();
      i++;
      continue;
    }

    if (l.match(/^> /)) {
      const explLines: string[] = [];
      while (i < lines.length && lines[i].match(/^> /)) {
        explLines.push(lines[i].replace(/^> /, ""));
        i++;
      }
      explanation = explLines.join("\n").trim();
      continue;
    }

    if (l.trim() === "") {
      i++;
      continue;
    }

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
        correctAnswer: correctIndices[0],
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
        correctAnswers: correctIndices,
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
        correctAnswer: trueFalseAnswer,
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
        correctAnswer: freetextAnswer,
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
```

- [ ] **Step 3: Create `src/parsers/parseMarkdownGroup.ts`**

```ts
import type { QuestionGroup, Question } from "../types/quiz";
import type { IdGenerator } from "../utils/idGenerator";
import { parseItem } from "./parseMarkdownItem";

type ItemType = "single" | "multi" | "truefalse" | "freetext" | "info" | "group";

export function parseGroup(
  lines: string[],
  startIndex: number,
  headingText: string,
  ids: IdGenerator
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

  while (i < lines.length) {
    const l = lines[i];

    if (l.match(/^#{1,2} /) && !l.match(/^###/)) break;

    const h3Match = l.match(/^### \[(\w+)\]\s*(.*)/);
    if (h3Match) {
      const type = h3Match[1] as ItemType;
      const subHeading = h3Match[2].trim();
      i++;
      const sub = parseItem(lines, i, type, subHeading, ids);
      i = sub.nextIndex;
      parts.push(sub.item as Question);
      continue;
    }

    const hintMatch = l.match(/^\?> (.+)/);
    if (hintMatch) {
      hint = hintMatch[1].trim();
      i++;
      continue;
    }

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
```

- [ ] **Step 4: Rewrite `src/parsers/parseMarkdown.ts`**

```ts
import type { Quiz, TopLevelItem, QuizItem, Section } from "../types/quiz";
import { IdGenerator } from "../utils/idGenerator";
import { replaceLocalImages, extractFrontmatter } from "./parseMarkdownFrontmatter";
import { parseItem } from "./parseMarkdownItem";
import { parseGroup } from "./parseMarkdownGroup";

type ItemType = "single" | "multi" | "truefalse" | "freetext" | "info" | "group";

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
        const group = parseGroup(lines, i, headingText, ids);
        i = group.nextIndex;
        addItem(group.item);
      } else {
        const item = parseItem(lines, i, type, headingText, ids);
        i = item.nextIndex;
        addItem(item.item);
      }
      continue;
    }

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
}
```

- [ ] **Step 5: Typecheck + test**

```bash
bun run typecheck && bun test
```

Expected: no errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/parsers/parseMarkdownFrontmatter.ts src/parsers/parseMarkdownItem.ts \
  src/parsers/parseMarkdownGroup.ts src/parsers/parseMarkdown.ts
git commit -m "refactor: split parseMarkdown.ts into focused modules"
```

---

## Task 10: Final verification

- [ ] **Step 1: Full typecheck + test run**

```bash
bun run typecheck && bun test
```

Expected: no errors, all tests pass.

- [ ] **Step 2: Verify commit log**

```bash
git log --oneline -8
```

Expected: 7 refactor commits since the baseline, each self-contained.
