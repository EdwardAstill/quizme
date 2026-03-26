# Architecture

## Overview

QuizMe is a local quiz app that runs entirely in the browser via a Vite dev server. The CLI starts the server and optionally injects quiz data; the React frontend handles all quiz logic and rendering.

```
┌─────────────────────────────────────────────┐
│  CLI (cli.ts)                               │
│  Commander parses args → Vite createServer() │
│  Optional: serves quiz JSON at /api/quiz    │
└──────────────┬──────────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────────┐
│  Browser (React SPA)                        │
│                                             │
│  App.tsx                                    │
│  ├── useSettings() → theme, font, width     │
│  ├── useQuiz() → state machine              │
│  │                                          │
│  ├── QuizLoader (phase: loading)            │
│  ├── QuizNav + QuestionCard (phase: active) │
│  └── ScoreSummary (phase: finished)         │
└─────────────────────────────────────────────┘
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Frontend | React 18 + TypeScript |
| Bundler | Vite (dev server, no build step) |
| CLI | Commander |
| Markdown | react-markdown + remark-math + rehype-katex |
| Math | KaTeX |
| Styling | Vanilla CSS with custom properties |

## Project structure

```
cli.ts                      CLI entry point
src/
  main.tsx                  React entry, imports global CSS
  App.tsx                   Root component, phase routing, keyboard nav
  types/
    quiz.ts                 TypeScript interfaces for quiz schema
  hooks/
    useQuiz.ts              Quiz state machine (navigation, scoring, answers)
    useSettings.ts          Settings with localStorage persistence
  components/
    QuizLoader.tsx          File picker (drag-and-drop + file input)
    QuestionCard.tsx        Renders questions, info pages, groups
    QuizNav.tsx             Sidebar navigation with status dots
    ScoreSummary.tsx        Results page with score breakdown
    Settings.tsx            Settings panel (theme, font, width, sidebar)
    Markdown.tsx            Markdown + math renderer
    Latex.tsx               Legacy LaTeX-only renderer (unused)
    ProgressBar.tsx         Progress bar (currently hidden)
  index.css                 All styles (themes, layout, components)
examples/
  sample.quiz          Example quiz file
docs/                       Documentation
```

## Data flow

### Quiz loading

1. CLI starts Vite dev server with a plugin that serves quiz JSON at `/api/quiz`
2. `App.tsx` fetches `/api/quiz` on mount
3. If the fetch succeeds, `startQuiz(data)` is called on the `useQuiz` hook
4. If it fails (no CLI quiz), `QuizLoader` is shown for manual file selection

### Quiz state machine (`useQuiz`)

```
loading ──startQuiz()──► active ──finish()──► finished
   ▲                                             │
   └──────────────reset()─────────────────────────┘
                  restart() loops back within active
```

**State:**
- `quiz` --- the loaded Quiz object
- `currentIndex` --- which item is shown
- `answers` --- Map of questionId → AnswerRecord
- `phase` --- loading | active | finished
- `visitedIndices` --- tracks which items the user has seen

**Derived:**
- `allQuestions` --- flattened list of scorable questions (excludes info pages and group wrappers)
- `score` --- count of correct answers
- `itemStatuses` --- per-item status for sidebar dots
- `allAnswered` --- whether every question has been submitted

### Answer checking

Lives in `useQuiz.ts:checkAnswer()`:

| Type | Logic |
|------|-------|
| single | Exact string match |
| multi | Sorted array equality |
| truefalse | Boolean equality |
| freetext | Trimmed string match (case-insensitive by default) |

### Rendering pipeline

`QuestionCard` dispatches on `item.type`:

- `"info"` → renders markdown content block
- `"group"` → renders shared prompt + individual `SingleQuestion` for each part
- question types → renders `SingleQuestion` which dispatches to `SingleInput`, `MultiInput`, `TrueFalseInput`, or `FreeTextInput`

All text passes through the `Markdown` component (react-markdown + remark-math + rehype-katex).

### Settings

`useSettings` manages theme, font size, content width, and sidebar visibility. Settings are persisted to localStorage under `quizme-settings`. Theme and font size are applied as attributes/styles on `document.documentElement`; content width and sidebar are applied via inline styles and CSS classes in `App.tsx`.

## Styling

- Single CSS file (`src/index.css`) with BEM-style naming
- Four themes via `[data-theme]` attribute: `dark`, `light`, `midnight`, `forest`
- CSS custom properties for all colors, radii, and fonts
- Responsive breakpoint at 768px (sidebar collapses to bottom bar on mobile)
- No external UI library

## Key conventions

- Functional React components only
- ESM throughout (`"type": "module"`)
- No build step required --- always runs via Vite dev server
- `useQuiz` is the single source of truth for quiz state
