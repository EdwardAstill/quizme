# QuizMe: Format Simplification & Architecture Redesign

## Overview

Two changes shipped together as one cohesive effort, built bottom-up by layer:

1. **Markdown DSL** — a new `.quiz.md` format for hand-authoring quizzes, alongside the existing JSON `.quiz` format
2. **Frontend architecture refactor** — split monolithic components and CSS into a clean layered structure

## Approach

**Approach B — All at once, organized by layer.** Work bottom-up: types + parsers first, then components, then integration. Each layer is self-contained and builds on the one below it.

Three layers:
- **Layer 1** — Types & parsers (data model + both format parsers)
- **Layer 2** — Components (split into items/ inputs/ ui/ + per-component CSS)
- **Layer 3** — Integration (CLI, loader, examples, docs)

---

## Layer 1: Types & Parsers

### Type changes

Answer fields for choice questions change from string-matching to index-based:

- `SingleChoiceQuestion.answer`: `string` → `number` (index into `options` array)
- `MultiChoiceQuestion.answers`: `string[]` → `number[]` (indices into `options` array)
- All other types unchanged

### Parser layer

New directory `src/parsers/`:

```
src/parsers/
  parseJson.ts       — JSON .quiz/.json files → Quiz
  parseMarkdown.ts   — Markdown .quiz.md files → Quiz
  index.ts           — detect format by extension, delegate, return Quiz
```

**`index.ts`** exports: `parseQuiz(content: string, filename: string): Quiz`

Checks file extension to pick parser. Both parsers handle ID auto-generation (logic currently in `preprocessQuiz.ts`). That logic either moves into each parser or into a shared `assignIds()` helper both call after parsing.

**`parseJson.ts`** — what `preprocessQuiz.ts` does today, plus validation that answer indices are within bounds of the options array.

**`parseMarkdown.ts`** — new parser, walks markdown line by line (see Markdown DSL Syntax below).

**`preprocessQuiz.ts` is deleted.** Its responsibilities absorbed by the parsers.

### checkAnswer extraction

`checkAnswer()` moves from `useQuiz.ts` to `src/utils/checkAnswer.ts`. It's a pure function with no hook dependencies. Updated for index-based answers:

- `single`: `userAnswer === question.answer` (number comparison)
- `multi`: sorted array equality on indices
- `truefalse`: unchanged (boolean equality)
- `freetext`: unchanged (trimmed string match, case-insensitive by default)

---

## Layer 2: Components

### New structure

```
src/components/
  items/
    QuestionCard.tsx   + QuestionCard.css
    GroupCard.tsx       + GroupCard.css
    InfoPage.tsx        + InfoPage.css
  inputs/
    SingleInput.tsx    + SingleInput.css
    MultiInput.tsx     + MultiInput.css
    TrueFalseInput.tsx + TrueFalseInput.css
    FreeTextInput.tsx  + FreeTextInput.css
  ui/
    HintToggle.tsx     + HintToggle.css
    Markdown.tsx
  QuizNav.tsx          + QuizNav.css
  QuizLoader.tsx       + QuizLoader.css
  ScoreSummary.tsx     + ScoreSummary.css
  Settings.tsx         + Settings.css
```

Three component layers:
- **`items/`** — item-level orchestrators: "what am I looking at?" (question, group, info)
- **`inputs/`** — answer input widgets: "how do I answer?" (single, multi, truefalse, freetext)
- **`ui/`** — shared presentational primitives (hint toggle, markdown renderer)
- **top-level** — app-level pages/panels (nav, loader, score, settings)

### Component changes

**QuestionCard.tsx** — drops from ~419 lines to ~80. Renders question text, picks the right input component, shows feedback. No longer handles groups or info pages.

**App.tsx** — dispatches to QuestionCard, GroupCard, or InfoPage based on `item.type` instead of passing everything to QuestionCard.

**GroupCard** — extracted from QuestionCard. Renders shared prompt + maps over parts with QuestionCard.

**Input components** — extracted as-is from QuestionCard, each in its own file with its own CSS.

**HintToggle** — extracted to `ui/`. Used by both QuestionCard and GroupCard.

### CSS split

Each component's styles extracted from `index.css` into a co-located `.css` file imported by the component.

**`index.css` (~120 lines)** retains only:
- CSS reset
- CSS custom properties (colors, radii, fonts)
- Theme definitions (`[data-theme="light"]`, etc.)
- Base button styles (`.btn`, `.btn--primary`, `.btn--secondary`)
- Layout grid (`.quiz-layout`)

### Deleted files

- `Latex.tsx` — legacy renderer, unused
- `ProgressBar.tsx` — hidden via CSS, superseded by sidebar

---

## Layer 3: Integration

### CLI changes (`cli.ts`)

- Import `parseQuiz` from parsers instead of raw `JSON.parse`
- Read file as text, pass content + filename to `parseQuiz()`
- Accept `.quiz`, `.json`, and `.quiz.md` extensions
- Vite plugin still serves the parsed Quiz object as JSON at `/api/quiz`

### QuizLoader changes

- Accept `.quiz`, `.json`, and `.quiz.md` in the file picker
- Read file as text, pass to `parseQuiz()` instead of doing `JSON.parse` directly
- Error messages updated to mention both formats

### Sample files

- Update `examples/sample.quiz` to use answer-by-index format
- Add `examples/sample.quiz.md` — same quiz in Markdown DSL format
- Both produce identical Quiz objects when parsed

### Documentation updates

- `quiz-format.md` — update answer fields to index-based
- New `quiz-md-format.md` — full Markdown DSL syntax spec
- `CLAUDE.md` — update project structure, mention both formats
- `README.md` — update format section, mention `.quiz.md`
- `architecture.md` — update component tree, add parsers layer
- `make-quiz-skill.md` — update to generate index-based answers

---

## Markdown DSL Syntax (`.quiz.md`)

### Frontmatter

```yaml
---
title: My Quiz
description: Optional description
---
```

### Sections

`# heading` creates a section (sidebar grouping):

```markdown
# Section Title
```

### Questions

`## [type] text` creates a question. Type tag is always required.

```markdown
## [single] Question text
## [multi] Question text
## [truefalse] Statement text
## [freetext] Question text
## [info] Page title
## [group] Shared prompt
```

### Rich body (optional)

`:::` delimiters for multi-line content after the heading:

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
```

If no `:::` block, the heading text is the entire question.

**Parser note:** `:::` blocks can contain markdown with triple-backtick code fences. The parser must track whether it's inside a code fence and not treat `:::` inside a code block as a closing delimiter.

### Answer markers

**Single choice** — `*` marks the correct option:
```markdown
- Venus
- Mercury *
- Earth
```

**Multi choice** — `*` on each correct option:
```markdown
- EC2
- Lambda *
- DynamoDB *
- RDS
```

**True/false** — the correct value with `*`:
```markdown
true *
```

**Freetext** — `=` prefix:
```markdown
= Simple Storage Service
```

Freetext is always case-insensitive in the Markdown format.

**Info pages** — no answer. Content goes in the heading or `:::` block.

### Hints

`?>` prefix:

```markdown
?> Think about which class trades redundancy for cost.
```

### Explanations

Standard blockquote:

```markdown
> Mercury orbits at ~58 million km from the Sun.
```

### Groups

`## [group]` with `### [type]` sub-questions:

```markdown
## [group] Answer the following about S3:

### [truefalse] Bucket names are globally unique.
true *
> Global namespace across all accounts.

### [freetext] What does S3 stand for?
= Simple Storage Service
```

### Not supported in Markdown DSL (JSON-only)

- `caseSensitive` on freetext
- `placeholder` on freetext

---

## Full file tree after changes

```
src/
  parsers/
    index.ts                 — parseQuiz(content, filename): Quiz
    parseJson.ts             — JSON format parser
    parseMarkdown.ts         — Markdown DSL parser
  components/
    items/
      QuestionCard.tsx + .css
      GroupCard.tsx + .css
      InfoPage.tsx + .css
    inputs/
      SingleInput.tsx + .css
      MultiInput.tsx + .css
      TrueFalseInput.tsx + .css
      FreeTextInput.tsx + .css
    ui/
      HintToggle.tsx + .css
      Markdown.tsx
    QuizNav.tsx + .css
    QuizLoader.tsx + .css
    ScoreSummary.tsx + .css
    Settings.tsx + .css
  hooks/
    useQuiz.ts               — state machine (checkAnswer removed)
    useSettings.ts           — unchanged
  types/
    quiz.ts                  — updated answer types (index-based)
  utils/
    checkAnswer.ts           — extracted pure function
  App.tsx
  main.tsx
  index.css                  — slim: reset + variables + themes + base buttons + layout grid
examples/
  sample.quiz                — updated to answer-by-index
  sample.quiz.md             — same quiz in Markdown DSL
  *.quizspec                 — unchanged
```
