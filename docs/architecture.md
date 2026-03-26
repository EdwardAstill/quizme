# Architecture

## Overview

QuizMe has two interfaces: a TUI for managing quizzes and a web UI for taking them. Running `quizme` with no arguments opens the TUI; running `quizme <file>` launches the web UI directly.

```
┌─────────────────────────────────────────────┐
│  CLI (cli.ts)                               │
│  Commander parses args                      │
│                                             │
│  No args → TUI (Ink)        File arg → Web  │
│  ┌───────────────────┐  ┌─────────────────┐ │
│  │ QuizList           │  │ Vite dev server │ │
│  │ QuizspecCreator    │  │ /api/quiz JSON  │ │
│  │ local ↔ config     │  └────────┬────────┘ │
│  └───────────────────┘           │ HTTP      │
└──────────────────────────────────┼──────────┘
                        ┌──────────▼──────────┐
                        │  Browser (React SPA) │
                        │  App.tsx             │
                        │  ├── useSettings()   │
                        │  ├── useQuiz()       │
                        │  ├── QuizLoader      │
                        │  ├── QuestionCard    │
                        │  └── ScoreSummary    │
                        └──────────────────────┘
```

### Quiz storage

```
.quizme/                          Local (CWD) — /make-quiz output
  quiz-name.quiz.md
  quiz-name.quizspec

~/.config/quizme/                 Global config — permanent storage
  notes--physics/                 Folder name = CWD path with -- separators
    notes--physics.quizspec
    midterm.quiz.md
  projects--myapp/
    projects--myapp.quizspec
    api-review.quiz.md
```

The TUI toggles between local and config views (Tab), and can move quizzes between them (m). When all quizzes are moved out of `.quizme/`, the directory is auto-deleted.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Frontend | React 18 + TypeScript |
| TUI | Ink (React for terminals) + ink-text-input |
| Bundler | Vite (dev server, no build step) |
| CLI | Commander |
| Markdown | react-markdown + remark-math + rehype-katex |
| Math | KaTeX |
| YAML | js-yaml (quizspec serialization) |
| Styling | Vanilla CSS with custom properties |

## Project structure

```
cli.ts                      CLI entry point (TUI or web server)
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
  tui/                      TUI management layer (Ink)
    index.tsx               Entry point, renders Ink app
    App.tsx                 Screen router (list vs creator)
    components/
      QuizList.tsx          Quiz list with local/config toggle, move, delete
      QuizspecCreator.tsx   Interactive quizspec form builder
      StatusBar.tsx         Bottom bar with keybinding hints
      ConfirmDialog.tsx     y/n confirmation overlay
    hooks/
      useQuizFiles.ts       Scan, delete, move quiz files (local + config)
      useClipboard.ts       Cross-platform clipboard write
    utils/
      configDir.ts          Config path resolution, CWD-to-folder mapping
      quizspec.ts           Quizspec types and YAML serialization
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
    Settings.tsx            Settings panel (theme, font, line spacing, width, sidebar)
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

`useSettings` manages theme, font size, line spacing, content width, and sidebar visibility. Settings are persisted to localStorage under `quizme-settings`. Theme, font size, and line spacing are applied as attributes/styles on `document.documentElement`; content width and sidebar are applied via inline styles and CSS classes in `App.tsx`.

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
