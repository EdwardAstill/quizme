# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuizMe is a local quiz app with a TUI for quiz management and a web UI for taking quizzes. Running `quizme` with no arguments opens the TUI, which shows quizzes from the local `.quizme/` directory or `~/.config/quizme/`. Running `quizme <file>` launches the web UI directly.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** Vite dev server + React 18 + TypeScript
- **TUI:** Ink (React for terminals) + ink-text-input
- **CLI:** Bun with Commander, Vite `createServer()`, and `open`
- **Markdown:** react-markdown + remark-gfm + remark-math + rehype-katex
- **No build step** — always runs via Vite dev server

## Commands

- `bun install && bun link` — install deps and make `quizme` available globally
- `quizme` — open TUI to browse/manage quizzes
- `quizme <file.quiz.md>` — launch quiz directly in browser
- `quizme -t` — run the built-in sample quiz
- `bun run typecheck` — TypeScript type checking (strict mode with `noUnusedLocals` and `noUnusedParameters`)

## Architecture

**Two entry modes:**
- `quizme` (no args) → TUI management layer via Ink (`src/tui/`)
- `quizme <file>` → web UI via Vite dev server (existing React app)

**Quiz storage:**
- Local: `.quizme/` in CWD — where `/make-quiz` outputs quizzes and specs
- Config: `~/.config/quizme/<folder>/` — permanent storage, folder names derived from CWD path (`~/notes/physics` → `notes--physics/`)
- TUI can move quizzes between local and config; `.quizme/` is auto-deleted when empty

**TUI (`src/tui/`):** Ink-based React terminal UI. `QuizList` shows quizzes with Tab to toggle local/config views, `m` to move, `d` to delete. `QuizspecCreator` is an interactive form for building `.quizspec` YAML files. Uses `useQuizFiles` hook for file operations and `useClipboard` for cross-platform clipboard.

**Web UI data flow:** CLI (`cli.ts`) parses quiz file via `src/parsers/` → starts Vite dev server with plugin serving parsed data at `/api/quiz` → React app fetches from `/api/quiz` on mount → `useQuiz` hook manages all quiz state.

**Two quiz formats:** JSON (`.quiz`, `.json`) via `parseJson.ts` and Markdown (`.quiz.md`) via `parseMarkdown.ts`. Both produce the same `Quiz` type. See `docs/quiz-format.md` for full spec.

**Component hierarchy:** `App` → renders current item based on `type`:
- `QuestionCard` for `single`/`multi`/`truefalse`/`freetext` — delegates to type-specific input components in `src/components/inputs/`
- `GroupCard` for `group` — renders shared prompt + multiple `QuestionCard` parts
- `InfoPage` for `info` — display-only, no scoring

**Key modules:**
- `useQuiz` hook — single source of truth: current index, answers map, scoring, phase transitions (loading → active → finished)
- `useSettings` hook — localStorage-persisted user preferences (theme, font size, line spacing, content width, sidebar)
- `checkAnswer` utility — type-dispatched answer comparison (handles case sensitivity for freetext, set equality for multi)
- `Markdown` component — all text rendering goes through this (react-markdown + remark-math + rehype-katex)
- Shared parser utilities: `IdGenerator` (ID assignment) and `validateQuiz` (answer index validation) in `src/utils/`

**Quiz type system** (`src/types/quiz.ts`): `Quiz` → `TopLevelItem[]` where `TopLevelItem = QuizItem | Section`. Sections contain `QuizItem[]`. `QuizItem = Question | QuestionGroup | InfoPage`. Items are flattened for navigation but sections provide sidebar grouping.

See `docs/architecture.md` for detailed architecture, data flow diagrams, and component breakdowns.

## Quiz Spec Format

`.quizspec` files (YAML) are recipes for quiz generation via the `/make-quiz` skill. They declare source material, parameters, focus/exclude topics, and free-form `notes`. A spec is optional input — the skill works interactively without one and generates its own spec as a reusable recipe. All output goes to `.quizme/` in CWD. See `docs/quizspec-format.md` for full spec. Specs can also be created interactively via the TUI's quizspec creator.

## Code Conventions

- Functional React components only
- Component CSS co-located alongside components; global styles in `src/index.css`
- BEM-style CSS naming with CSS custom properties for theming
- No external UI library — vanilla CSS
- ESM throughout (`"type": "module"` in package.json)
