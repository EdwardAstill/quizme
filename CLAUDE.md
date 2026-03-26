# QuizMe

## Project Overview

QuizMe is a local quiz app. The CLI starts a Vite dev server and opens the browser. If a `.quiz` file is provided, it's served at `/api/quiz` and loaded automatically. If not, the user picks a file in the browser.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** Vite dev server + React 18 + TypeScript
- **CLI:** Bun with Commander, Vite `createServer()`, and `open`
- **Markdown:** react-markdown + remark-math + rehype-katex
- **No build step** — always runs via Vite dev server

## Project Structure

```
src/                    React app source
  components/           UI components (QuestionCard, QuizLoader, QuizNav, ScoreSummary, Settings, Markdown)
  hooks/useQuiz.ts      Quiz state machine (current index, answers, scoring)
  hooks/useSettings.ts  Settings with localStorage persistence
  types/quiz.ts         TypeScript interfaces for quiz schema
cli.ts                  CLI entry point (Vite dev server + optional quiz injection)
examples/sample.quiz    Example quiz file
docs/                   Documentation (user guide, quiz format, architecture, skill)
```

## Install & Commands

- `bun install && bun link` — install deps and make `quizme` available globally
- `quizme <file.quiz>` — start with a quiz pre-loaded
- `quizme` — start with file picker (no quiz pre-loaded)
- `quizme -t` — run the built-in sample quiz
- `bun run typecheck` — run TypeScript type checking

## Quiz File Format

Files use `.quiz` extension (JSON format, `.json` also accepted). Six item types: `single`, `multi`, `truefalse`, `freetext`, `group`, `info`. All text fields support Markdown with LaTeX math. See `docs/quiz-format.md` for full spec.

## Architecture Notes

- `useQuiz` hook is the single source of truth for quiz state
- `QuestionCard` renders different input UIs based on item `type`
- CLI starts a Vite dev server and injects a plugin that serves quiz data at `/api/quiz`
- If no quiz file is given, `/api/quiz` returns 404 and the app shows a file picker instead
- All text renders through the `Markdown` component (react-markdown + remark-math + rehype-katex)
- Info pages (`type: "info"`) display content without requiring answers and don't count toward scoring

## Code Conventions

- Functional React components only
- CSS in a single `src/index.css` file using BEM-style naming
- No external UI library — vanilla CSS with CSS custom properties for theming
- ESM throughout (`"type": "module"` in package.json)
