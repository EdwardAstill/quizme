# QuizMe

## Project Overview

QuizMe is a local quiz app. The CLI starts a Vite dev server and opens the browser. If a quiz JSON file is provided, it's served at `/api/quiz` and loaded automatically. If not, the user picks a file in the browser.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** Vite dev server + React 18 + TypeScript
- **CLI:** Bun with Commander, Vite `createServer()`, and `open`
- **No build step** — always runs via Vite dev server

## Project Structure

```
src/                    React app source
  components/           UI components (QuestionCard, QuizLoader, ProgressBar, ScoreSummary)
  hooks/useQuiz.ts      Quiz state machine (current index, answers, scoring)
  types/quiz.ts         TypeScript interfaces for quiz JSON schema
cli.ts                  CLI entry point (Vite dev server + optional quiz injection)
```

## Commands

- `bun run start` — start with file picker (no quiz pre-loaded)
- `bun cli.ts <quiz.json>` — start with a quiz pre-loaded
- `bun run typecheck` — run TypeScript type checking

## Quiz JSON Format

Four question types: `single`, `multi`, `truefalse`, `freetext`. See `examples/sample-quiz.json` for a complete example.

## Architecture Notes

- `useQuiz` hook is the single source of truth for quiz state
- `QuestionCard` renders different input UIs based on question `type`
- CLI starts a Vite dev server and injects a plugin that serves quiz JSON at `/api/quiz`
- If no quiz file is given, `/api/quiz` returns 404 and the app shows a file picker instead
- Answer checking logic lives in both `useQuiz.ts` (for state) and `QuestionCard.tsx` (for immediate UI feedback)

## Code Conventions

- Functional React components only
- CSS in a single `src/index.css` file using BEM-style naming
- No external UI library — vanilla CSS with CSS custom properties for theming
- ESM throughout (`"type": "module"` in package.json)
