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
  parsers/
    index.ts                Dispatches to JSON or Markdown parser by file extension
    parseJson.ts            JSON quiz parser (.quiz, .json) with ID generation and validation
    parseMarkdown.ts        Markdown quiz parser (.quiz.md) with frontmatter and heading-based syntax
  components/
    items/
      QuestionCard.tsx      Renders a single question with type-dispatched input
      GroupCard.tsx          Renders a question group (shared prompt + parts)
      InfoPage.tsx          Renders info pages (markdown content, no scoring)
    inputs/
      SingleInput.tsx       Radio button input for single-choice questions
      MultiInput.tsx        Checkbox input for multiple-choice questions
      TrueFalseInput.tsx    True/false toggle input
      FreeTextInput.tsx     Text input for free-text questions
    ui/
      Markdown.tsx          Markdown + math renderer (react-markdown + remark-math + rehype-katex)
      HintToggle.tsx        Expandable hint display
    QuizLoader.tsx          File picker (drag-and-drop + file input)
    QuizNav.tsx             Sidebar navigation with status dots
    ScoreSummary.tsx        Results page with score breakdown
    Settings.tsx            Settings panel (theme, font, width, sidebar)
  utils/
    checkAnswer.ts          Type-dispatched answer comparison logic
    idGenerator.ts          Shared ID generation for both parsers
    validateQuiz.ts         Answer index validation for both parsers
  index.css                 Global styles (themes, layout, CSS custom properties)
examples/
  sample.quiz               Example quiz file (JSON)
  sample.quiz.md            Example quiz file (Markdown)
  *.quizspec                Quiz generation recipes (YAML)
docs/                       Documentation
```

Component CSS files are co-located alongside their components (e.g. `QuestionCard.css`, `SingleInput.css`). Global styles (themes, layout, custom properties) remain in `src/index.css`.

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

**Derived:**
- `allQuestions` --- flattened list of scorable questions (excludes info pages and group wrappers)
- `score` --- count of correct answers
- `itemStatuses` --- per-item status for sidebar dots
- `allAnswered` --- whether every question has been submitted

### Answer checking

Lives in `utils/checkAnswer.ts`:

| Type | Logic |
|------|-------|
| single | Numeric index equality (`answer` is an index into `options`) |
| multi | Sorted numeric index array equality (`answers` are indices into `options`) |
| truefalse | Boolean equality |
| freetext | Trimmed string match (case-insensitive by default) |

### Rendering pipeline

`App.tsx` dispatches on `currentItem.type`:

- `"info"` → `InfoPage` renders markdown content block
- `"group"` → `GroupCard` renders shared prompt + individual `QuestionCard` for each part
- question types → `QuestionCard` dispatches to `SingleInput`, `MultiInput`, `TrueFalseInput`, or `FreeTextInput`

All text passes through the `Markdown` component (react-markdown + remark-math + rehype-katex).

### Settings

`useSettings` manages theme, font size, content width, and sidebar visibility. Settings are persisted to localStorage under `quizme-settings`. Theme and font size are applied as attributes/styles on `document.documentElement`; content width and sidebar are applied via inline styles and CSS classes in `App.tsx`.

## Styling

- Global styles in `src/index.css`, component CSS co-located with components
- BEM-style naming throughout
- Four themes via `[data-theme]` attribute: `dark`, `light`, `midnight`, `forest`
- CSS custom properties for all colors, radii, and fonts
- Responsive breakpoint at 768px (sidebar collapses to bottom bar on mobile)
- No external UI library

## Key conventions

- Functional React components only
- ESM throughout (`"type": "module"`)
- No build step required --- always runs via Vite dev server
- `useQuiz` is the single source of truth for quiz state
