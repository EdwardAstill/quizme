# QuizMe Maintainability Refactor — Design Spec

**Date:** 2026-04-04
**Approach:** Type-system fixes first, then hook decomposition, App.tsx cleanup, parser decomposition. All LSP-driven renames.

---

## 1. Type System Fixes

### 1a. Rename `Quiz.questions` → `Quiz.items`

The field `questions` on the `Quiz` interface holds `TopLevelItem[]`, which includes sections and info pages — not only questions. Rename to `items` for accuracy.

**Files touched:** `src/types/quiz.ts`, `src/parsers/parseMarkdown.ts`, `src/parsers/parseJson.ts`, `src/hooks/useQuiz.ts`, `src/components/QuizNav.tsx`.

### 1b. Normalize correct-answer field names

Current inconsistency: `SingleChoiceQuestion.answer`, `MultiChoiceQuestion.answers`, `TrueFalseQuestion.answer`, `FreeTextQuestion.answer`. The plural/singular split is arbitrary and forces special-casing in consumers.

Rename to a consistent pattern:
- `SingleChoiceQuestion.answer: number` → `correctAnswer: number`
- `MultiChoiceQuestion.answers: number[]` → `correctAnswers: number[]`
- `TrueFalseQuestion.answer: boolean` → `correctAnswer: boolean`
- `FreeTextQuestion.answer: string` → `correctAnswer: string`

**Files touched:** `src/types/quiz.ts`, `src/utils/checkAnswer.ts`, `src/components/items/QuestionCard.tsx`, `src/parsers/parseMarkdown.ts`, `src/parsers/parseJson.ts`, `src/utils/validateQuiz.ts`.

### 1c. Named submit callback type

The signature `(questionId: string, answer: number | number[] | boolean | string) => void` is duplicated verbatim in `QuestionCard`, `GroupCard`, `App`, and `useQuiz`. Extract as a named type.

Add to `src/types/quiz.ts`:
```ts
export type SubmitAnswer = (questionId: string, answer: number | number[] | boolean | string) => void;
```

Replace all four inline occurrences with `SubmitAnswer`.

### 1d. Remove unsafe `as` casts in QuestionCard

`QuestionCard` casts `answer?.userAnswer as number | undefined` etc. for each question type. Replace with narrowing on `question.type` before accessing `answer.userAnswer`, making the type flow correct without assertions.

No type shape changes — purely a code quality fix.

---

## 2. Hook Decomposition

### 2a. Extract `useQuizNavigation`

**New file:** `src/hooks/useQuizNavigation.ts`

Owns: `flatItems` (derived from `Quiz`), `currentIndex`, `goTo`, `nextQuestion`, `prevQuestion`.

```ts
export function useQuizNavigation(quiz: Quiz | null) {
  // flatItems, currentIndex, goTo, nextQuestion, prevQuestion
}
```

### 2b. Extract `useQuizScoring`

**New file:** `src/hooks/useQuizScoring.ts`

Owns: `score`, `totalQuestions`, `allQuestions`, `allAnswered`, `itemStatuses`.

```ts
export function useQuizScoring(
  flatItems: QuizItem[],
  currentIndex: number,
  answers: Map<string, AnswerRecord>
)
```

### 2c. `useQuiz` becomes an orchestrator

`useQuiz` retains ownership of: `quiz`, `phase`, `answers`, `submitAnswer`, `startQuiz`, `finish`, `restart`, `reset`. It composes `useQuizNavigation` and `useQuizScoring` internally and re-exports everything as a flat object.

**Public API of `useQuiz` is unchanged** — `App.tsx` requires no edits.

---

## 3. App.tsx Cleanup

### 3a. Extract `useQuizLoader`

**New file:** `src/hooks/useQuizLoader.ts`

Encapsulates the `fetch("/api/quiz")` + `startQuiz(data)` side effect. Accepts `startQuiz` as a parameter.

```ts
export function useQuizLoader(startQuiz: (q: Quiz) => void): void
```

`App.tsx` replaces the inline `useEffect` + fetch with a single `useQuizLoader(startQuiz)` call.

### 3b. Extract `useKeyboardNav`

**New file:** `src/hooks/useKeyboardNav.ts`

Encapsulates the `keydown` arrow-key navigation listener.

```ts
export function useKeyboardNav(opts: {
  phase: QuizPhase;
  nextQuestion: () => void;
  prevQuestion: () => void;
}): void
```

`App.tsx` replaces the inline `useEffect` + `addEventListener` with `useKeyboardNav({ phase, nextQuestion, prevQuestion })`.

---

## 4. Parser Decomposition

Split `src/parsers/parseMarkdown.ts` (400 lines) into focused modules:

| File | Responsibility |
|------|---------------|
| `src/parsers/parseMarkdown.ts` | Entry point: calls `replaceLocalImages`, `extractFrontmatter`, section/item dispatch loop |
| `src/parsers/parseMarkdownItem.ts` | `parseItem()` — parses single question items |
| `src/parsers/parseMarkdownGroup.ts` | `parseGroup()` — parses group items with sub-questions |
| `src/parsers/parseMarkdownFrontmatter.ts` | `extractFrontmatter()` + `replaceLocalImages()` |

`src/parsers/index.ts` re-exports are unchanged — no impact on external consumers.

---

## Out of Scope

- No UI changes
- No quiz format changes
- No new features
- `useSettings` is already well-scoped — no changes
- `checkAnswer` is already clean — only field renames needed
