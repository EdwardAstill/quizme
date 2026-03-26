# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuizMe is a local quiz app. The CLI starts a Vite dev server and opens the browser. If a `.quiz` or `.quiz.md` file is provided, it's parsed and served at `/api/quiz`. If not, the user picks a file in the browser.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** Vite dev server + React 18 + TypeScript
- **CLI:** Bun with Commander, Vite `createServer()`, and `open`
- **Markdown:** react-markdown + remark-gfm + remark-math + rehype-katex
- **No build step** — always runs via Vite dev server

## Commands

- `bun install && bun link` — install deps and make `quizme` available globally
- `quizme <file.quiz.md>` — start with a quiz pre-loaded
- `quizme` — start with file picker (no quiz pre-loaded)
- `quizme -t` — run the built-in sample quiz
- `bun run typecheck` — TypeScript type checking (strict mode with `noUnusedLocals` and `noUnusedParameters`)

## Architecture

**Data flow:** CLI (`cli.ts`) parses quiz file via `src/parsers/` → starts Vite dev server with plugin serving parsed data at `/api/quiz` → React app fetches from `/api/quiz` on mount → `useQuiz` hook manages all quiz state.

**Two quiz formats:** JSON (`.quiz`, `.json`) via `parseJson.ts` and Markdown (`.quiz.md`) via `parseMarkdown.ts`. Both produce the same `Quiz` type. See `docs/quiz-format.md` for full spec.

**Component hierarchy:** `App` → renders current item based on `type`:
- `QuestionCard` for `single`/`multi`/`truefalse`/`freetext` — delegates to type-specific input components in `src/components/inputs/`
- `GroupCard` for `group` — renders shared prompt + multiple `QuestionCard` parts
- `InfoPage` for `info` — display-only, no scoring

**Key modules:**
- `useQuiz` hook — single source of truth: current index, answers map, scoring, phase transitions (loading → active → finished)
- `useSettings` hook — localStorage-persisted user preferences
- `checkAnswer` utility — type-dispatched answer comparison (handles case sensitivity for freetext, set equality for multi)
- `Markdown` component — all text rendering goes through this (react-markdown + remark-math + rehype-katex)
- Shared parser utilities: `IdGenerator` (ID assignment) and `validateQuiz` (answer index validation) in `src/utils/`

**Quiz type system** (`src/types/quiz.ts`): `Quiz` → `TopLevelItem[]` where `TopLevelItem = QuizItem | Section`. Sections contain `QuizItem[]`. `QuizItem = Question | QuestionGroup | InfoPage`. Items are flattened for navigation but sections provide sidebar grouping.

See `docs/architecture.md` for detailed architecture, data flow diagrams, and component breakdowns.

## Quiz Spec Format

`.quizspec` files (YAML) are recipes for quiz generation via the `/make-quiz` skill. They declare source material, parameters, focus/exclude topics, and free-form `notes`. The skill generates a `.quizspec` first, then produces a `.quiz.md` file. See `docs/quizspec-format.md` for full spec.

## Code Conventions

- Functional React components only
- Component CSS co-located alongside components; global styles in `src/index.css`
- BEM-style CSS naming with CSS custom properties for theming
- No external UI library — vanilla CSS
- ESM throughout (`"type": "module"` in package.json)
