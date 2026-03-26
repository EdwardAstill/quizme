---
name: make-quiz
description: >
  Generate a QuizMe `.quiz` file from a `.quizspec` recipe, inline arguments, or interactively.
  ALWAYS use this skill when the user asks to: make a quiz, generate quiz questions, create a .quiz file,
  build a quiz from code, quiz me on this repo, or test my knowledge.
  Trigger even on casual phrasings like "quiz me on X", "make a quiz about Y", "test me on this codebase",
  or "generate questions from this repo".
  This skill governs the full quiz generation workflow — source ingestion, question design, formatting, and output.
  Always generates a .quizspec file first (as a reusable recipe) before producing the .quiz file.
---

# Make Quiz

Generate a `.quiz` file for the QuizMe app. **Every run produces a `.quizspec` first** — either by reading an existing one or generating one from the user's input. The spec is then used to generate the quiz.

---

## Step 0: Route the request

Check what the user provided:

| Input | Action |
|-------|--------|
| A `.quizspec` file path | Read it → go to [Phase 2: Ingest Sources](#phase-2-ingest-sources) |
| Inline flags (`--source`, `--count`, etc.) | Build a spec from flags → write the `.quizspec` → go to Phase 2 |
| A topic (e.g. "quiz me on React hooks") | Ask clarifying questions → write the `.quizspec` → go to Phase 2 |
| Just `/make-quiz` with no args | Ask what to quiz on → write the `.quizspec` → go to Phase 2 |

### Inline flag mapping

| Flag | Spec field |
|------|-----------|
| `--source <path>` | `sources: [{type: folder/file/pdf, path}]` (infer type from path) |
| `--url <url>` | `sources: [{type: url, url}]` |
| `--pdf <path>` | `sources: [{type: pdf, path}]` |
| `--count <n>` | `parameters.count` |
| `--difficulty <level>` | `parameters.difficulty` |
| `--types <list>` | `parameters.types` (comma-separated) |
| `--teach` | `parameters.teach: true` |
| `--focus <topics>` | `focus` (comma-separated) |
| `-o <path>` | `output` |

---

## Phase 1: Generate the `.quizspec` (if none provided)

Ask the user enough to fill in the spec. At minimum you need:

1. **Source material** — ask:
   > What material should I build the quiz from?
   > - **This codebase** — I'll analyze the code in the current project
   > - **Files/folders** — give me a path (e.g. `~/notes/physics/`)
   > - **A URL** — give me a link to fetch
   > - **A PDF** — give me a path to a PDF file
   > - **A topic** — just tell me what to quiz you on (I'll use my own knowledge)
   >
   > You can combine multiple sources.

2. **Parameters** — ask about difficulty, count, teach mode, or accept defaults

3. **Focus/exclude** — if the source material is broad, ask what to focus on

4. **Notes** — ask if there are any special instructions (e.g. "explain things step by step", "focus on common exam pitfalls", "I'm weak on X")

Then **write the `.quizspec` file** (YAML format) before proceeding. Default location: project root or alongside the source material. Tell the user where you saved it so they can reuse/tweak it later.

---

## Phase 2: Ingest sources

Read the spec and process each source:

**Folder:** Glob for matching files → Read each (prioritize by `focus` if too many)
**File:** Read directly
**URL:** WebFetch the page → extract main content
**PDF:** Read with `pages` parameter if specified → chunk large PDFs (20 pages at a time)
**Codebase:** Read heuristically (README, entry points, core modules, types, config) or use glob if specified
**Topic only (no sources):** Use your own knowledge — no ingestion needed

**Important:** For large sources, summarize and focus on material matching `focus` topics rather than trying to read everything.

---

## Phase 3: Analyze and plan

1. **Identify key concepts** from the combined material
2. **Apply focus/exclude filters** from the spec
3. **Categorize by difficulty:**
   - Beginner: definitions, recall, basic facts
   - Intermediate: relationships, cause-and-effect, comparisons
   - Advanced: synthesis, application, debugging, edge cases
4. **Read the `notes` field** — apply any special instructions to the plan
5. **Present the plan to the user** — show what topics/sections you'll cover and get confirmation

---

## Phase 4: Generate questions

Follow the [Question Design Rules](#question-design-rules) and respect all spec parameters:

- Generate approximately `count` questions (±20%)
- Only use question types listed in `types`
- Match the `difficulty` level
- If `teach: true`, add substantial info pages before each section (mini-lessons, not just headers)
- If `sections: true`, organize into section groups
- If `hints: true`, include hints
- Honor `notes` for tone, approach, and special instructions

---

## Phase 5: Output

Check the spec's `generate` field to determine single vs. batch mode:

### Combined mode (default)

1. Determine output path: spec's `output` field, or `<spec-name>.quiz` in the same directory
2. Validate the quiz (see [Validation Checklist](#validation-checklist))
3. Write the `.quiz` file

### Batch mode (`per_file` or `per_source`)

When `generate.mode` is `per_file` or `per_source`, produce multiple quizzes:

1. **Split sources** — in `per_file` mode, expand folder sources into individual files. In `per_source` mode, treat each source entry as its own unit
2. **Loop:** For each unit, run Phase 2 (ingest), Phase 3 (analyze), and Phase 4 (generate) independently, scoped to that unit's material only
3. **Name each quiz** — derive file names from sources (see `docs/quizspec-format.md` naming rules). Use `generate.title_from` to set each quiz's title (`filename`, `heading`, or `content`)
4. **Write to `generate.output_dir`** — create the directory if needed. Validate each quiz before writing
5. **Report results** — tell the user how many quizzes were generated and where they are

**Important for batch mode:**
- Each quiz is independent — don't reference material from other files
- Apply the same `parameters`, `focus`, `exclude`, and `notes` to each quiz
- If a source file is too small to generate `count` questions, generate as many as the material supports and note this to the user

---

## Question Design Rules

These apply to ALL workflows:

- **Mix question types** — never make the entire quiz single-choice. Use all allowed types where appropriate
- **Progression** — start easier, build to harder concepts within each section
- **Structure with sections** — use section items to organize by topic, with info pages introducing each section (especially when `teach` is true)
- **Good distractors** — wrong options must be plausible. Use common misconceptions, off-by-one errors, similar-looking alternatives
- **Explanations are mandatory** — every question must have an explanation. Explain *why* the answer is correct and *why* common wrong answers are wrong
- **Code in questions** — use fenced code blocks for multi-line code snippets, inline backticks for identifiers
- **Free text answers must be short** — 1-3 words, unambiguous. If the answer could be phrased multiple ways, use single/multi choice instead
- **Groups for related concepts** — when testing multiple aspects of one topic, use a question group with a shared prompt
- **No trick questions** — challenging but fair. The goal is learning, not gotchas
- **Teach mode info pages** — when `teach` is true, info pages should be substantial: explain the concept clearly with examples, formulas, and context *before* testing. These are mini-lessons, not just topic headers

### Difficulty calibration

| Level | Question style | Example |
|-------|---------------|---------|
| Beginner | "What is X?" / "Which of these is Y?" | "What does HTTP stand for?" |
| Intermediate | "Why does X happen?" / "What's the difference between X and Y?" | "Why does TCP use a three-way handshake instead of a two-way?" |
| Advanced | "Given this scenario..." / "What would happen if..." / Debug-style | "A server returns 200 but the client sees a CORS error. What's the most likely cause?" |

---

## File Format

### Top-level structure

```json
{
  "title": "Quiz title",
  "description": "Optional subtitle shown in the sidebar",
  "questions": [ ...items ]
}
```

`questions` is an ordered array of items. Each item is one of seven types described below. **IDs are optional** — they are auto-generated at load time if omitted. You do not need to write `id` fields in the quiz JSON.

---

## Item Types

### Section

Groups related items under a heading. Sections appear as labeled groups in the sidebar. Use to organize quizzes into logical chapters.

```json
{
  "type": "section",
  "title": "Section title",
  "items": [ ...quiz items ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"section"` | yes | |
| `title` | string | yes | Section heading shown in sidebar |
| `items` | QuizItem[] | yes | Array of questions, groups, or info pages |

**Always use sections** to organize quizzes with more than 5 questions. Place an info page as the first item in each section to introduce the topic.

### Info Page

Displays markdown content without requiring an answer. Use to introduce sections, provide background, or explain concepts before testing them. Does not count toward the quiz score.

```json
{
  "type": "info",
  "content": "Markdown string — full markdown with headings, lists, code blocks, and math"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Auto-generated if omitted |
| `type` | `"info"` | yes | |
| `content` | string | yes | Full markdown content. Supports headings, bold, italic, code blocks, lists, blockquotes, links, images, and LaTeX math |

### Single Choice

One correct answer from a list of options.

```json
{
  "type": "single",
  "question": "Question text (markdown)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "Option B",
  "explanation": "Why this is correct (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Auto-generated if omitted |
| `type` | `"single"` | yes | |
| `question` | string | yes | Markdown text |
| `options` | string[] | yes | 2-6 choices. Each option supports markdown |
| `answer` | string | yes | Must **exactly match** one of `options` (case-sensitive, character-for-character) |
| `hint` | string | no | Optional hint revealed on click before answering. Markdown supported |
| `explanation` | string | no | Shown after answering. Markdown supported |

### Multiple Choice

Multiple correct answers from a list of options. The user must select all correct answers to get it right.

```json
{
  "type": "multi",
  "question": "Select all that apply (markdown)",
  "options": ["A", "B", "C", "D"],
  "answers": ["A", "C"],
  "explanation": "Explanation (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Auto-generated if omitted |
| `type` | `"multi"` | yes | |
| `question` | string | yes | Markdown text |
| `options` | string[] | yes | 2-6 choices. Each option supports markdown |
| `answers` | string[] | yes | All correct options. Order doesn't matter but values must **exactly match** entries in `options` |
| `hint` | string | no | Optional hint revealed on click before answering. Markdown supported |
| `explanation` | string | no | Shown after answering. Markdown supported |

### True / False

A statement the user evaluates as true or false.

```json
{
  "type": "truefalse",
  "question": "Statement to evaluate (markdown)",
  "answer": true,
  "explanation": "Explanation (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Auto-generated if omitted |
| `type` | `"truefalse"` | yes | |
| `question` | string | yes | A statement (not a question). Markdown supported |
| `answer` | boolean | yes | `true` or `false` |
| `hint` | string | no | Optional hint revealed on click before answering. Markdown supported |
| `explanation` | string | no | Shown after answering. Markdown supported |

### Free Text

The user types a short answer. Matching is exact after trimming whitespace.

```json
{
  "type": "freetext",
  "question": "Question (markdown)",
  "answer": "expected answer",
  "caseSensitive": false,
  "placeholder": "Hint text...",
  "explanation": "Explanation (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Auto-generated if omitted |
| `type` | `"freetext"` | yes | |
| `question` | string | yes | Markdown text |
| `answer` | string | yes | Expected answer. Keep to 1-3 words. Must be unambiguous |
| `caseSensitive` | boolean | no | Default `false`. Set `true` only when casing matters (e.g. variable names) |
| `placeholder` | string | no | Hint shown in the input field |
| `hint` | string | no | Optional hint revealed on click before answering. Markdown supported |
| `explanation` | string | no | Shown after answering. Markdown supported |

**Important:** Free text uses exact string matching. If the answer could reasonably be phrased multiple ways (e.g. "HTTP" vs "Hypertext Transfer Protocol"), either set `caseSensitive: false` and pick the shortest canonical form, or use single choice instead.

### Question Group

Groups multiple sub-questions under a shared prompt. Each part is scored individually. Parts are labeled automatically (a, b, c, ...).

```json
{
  "type": "group",
  "question": "Shared prompt (markdown)",
  "parts": [
    { "type": "truefalse", "question": "...", "answer": true },
    { "type": "single", "question": "...", "options": ["..."], "answer": "..." }
  ],
  "explanation": "Overall explanation shown after all parts are answered (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Auto-generated if omitted |
| `type` | `"group"` | yes | |
| `question` | string | yes | Shared prompt shown above all parts. Markdown supported |
| `parts` | Question[] | yes | Array of sub-questions. Can be `single`, `multi`, `truefalse`, or `freetext` — **not** `info` or `group` |
| `hint` | string | no | Optional hint revealed on click before all parts are answered. Markdown supported |
| `explanation` | string | no | Shown after all parts are answered. Markdown supported |

IDs are auto-generated — do not include `id` fields in group parts.

---

## Markdown and Math

All text fields (`question`, `content`, `options`, `explanation`, `answer`, `placeholder`) support Markdown rendered via `react-markdown` with `remark-math` and `rehype-katex`.

### Supported Markdown

- `**bold**`, `*italic*`, `~~strikethrough~~`
- `` `inline code` `` and fenced code blocks with language syntax highlighting
- `# Headings` (all levels), `> Blockquotes`
- `- Bulleted lists` and `1. Numbered lists`
- `[links](url)` and `![images](url)`
- Tables (GitHub-flavored markdown)

### Math (LaTeX via KaTeX)

- **Inline:** `$E = mc^2$` renders within text
- **Display:** `$$\int_0^\infty e^{-x}\,dx = 1$$` renders as a centered block equation

**Known limitation: `$` as currency.** The `remark-math` parser uses `$` as math delimiters. This means bare `$` for currency (e.g. `$500`) can accidentally trigger math mode. Workarounds:

- **Currency outside math:** Write `500 USD` or `US$500` — never bare `$500`
- **Currency inside math:** Use `\text{\textdollar}` — do **not** use `\$` inside `$...$` blocks, as the parser sees the `$` in `\$` as a closing delimiter before KaTeX interprets it
- **`\$` outside math:** Works correctly (remark-math ignores escaped dollars), but prefer `USD` for clarity

**Critical: JSON escaping.** In JSON strings, every backslash must be doubled:

| LaTeX | In JSON string |
|-------|---------------|
| `\frac{a}{b}` | `"\\frac{a}{b}"` |
| `\sum_{i=1}^{n}` | `"\\sum_{i=1}^{n}"` |
| `\text{kg}` | `"\\text{kg}"` |
| `\cdot` | `"\\cdot"` |
| `\neq` | `"\\neq"` |
| `\leq` | `"\\leq"` |
| `\newline` or `\\` | `"\\newline"` or `"\\\\"` |

Newlines in JSON strings use `\n`. To get a paragraph break in markdown, use `\n\n`.

---

## Complete Example

This is the built-in sample quiz (`examples/sample.quiz`) demonstrating all item types, markdown, and math:

```json
{
  "title": "AWS Solutions Architect",
  "description": "Practice exam for SAA-C03",
  "questions": [
    {
      "type": "info",
      "content": "# AWS Solutions Architect\n\nThis quiz covers key topics for the **SAA-C03** exam.\n\n$$C = \\sum_{i=1}^{n} r_i \\cdot t_i \\cdot p_i$$"
    },
    {
      "type": "section",
      "title": "S3 Storage",
      "items": [
        {
          "type": "single",
          "question": "Which S3 storage class is cheapest for infrequent access?",
          "options": ["S3 Standard", "S3 Glacier", "S3 Standard-IA", "S3 One Zone-IA"],
          "answer": "S3 One Zone-IA",
          "explanation": "One Zone-IA is cheapest but lacks multi-AZ redundancy."
        },
        {
          "type": "group",
          "question": "Answer the following about S3:",
          "parts": [
            { "type": "truefalse", "question": "S3 bucket names must be globally unique.", "answer": true },
            { "type": "freetext", "question": "What does S3 stand for?", "answer": "Simple Storage Service", "caseSensitive": false }
          ]
        }
      ]
    },
    {
      "type": "section",
      "title": "Serverless & IAM",
      "items": [
        {
          "type": "multi",
          "question": "Which services are serverless?",
          "options": ["EC2", "Lambda", "DynamoDB", "RDS"],
          "answers": ["Lambda", "DynamoDB"],
          "explanation": "Lambda and DynamoDB require no server management."
        }
      ]
    }
  ]
}
```

---

## Quality Checklist

Verify every point before writing the file:

- [ ] **Do not include IDs** — IDs are auto-generated at load time. Omit `id` fields from the quiz JSON
- [ ] **Answers match options exactly** — every `answer` string is character-for-character identical to one entry in `options`; every `answers` array entry matches an `options` entry
- [ ] **Free text answers are short** — 1-3 words, no ambiguity. If you can think of an alternate valid phrasing, switch to single choice
- [ ] **Every question has an explanation** — explain why the answer is correct *and* why common wrong answers are wrong
- [ ] **Distractors are plausible** — wrong options should reflect real misconceptions, not absurd fillers
- [ ] **At least 3 different question types** used across the quiz
- [ ] **Info pages before new sections** — each topic shift gets an info page introduction
- [ ] **JSON is valid** — all backslashes in LaTeX are doubled, newlines use `\n`, strings are properly quoted
- [ ] **No bare `$` for currency** — use `USD` or `US$` prefix; never `$500` which triggers math mode. Inside math blocks, use `\text{\textdollar}` not `\$`
- [ ] **Difficulty progression** — easier questions first within each section, building to harder ones
- [ ] **No trick questions** — challenging but fair. The goal is learning, not gotchas

---

## Anti-patterns

| Don't | Do instead |
|-------|-----------|
| All single-choice questions | Mix in multi, truefalse, freetext, and groups |
| Obvious wrong answers ("banana" as an AWS service) | Plausible distractors based on real misconceptions |
| Free text with long or ambiguous answers | Use single choice for anything > 3 words or with multiple valid phrasings |
| Questions about trivia or memorization only | Test understanding, relationships, and application |
| 20 questions in a row with no structure | Use info pages to create sections and provide context |
| Missing explanations | Always explain — this is where the learning happens |
| `caseSensitive: true` without good reason | Default to `false`; only use `true` for case-significant identifiers |
| Writing `id` fields in quiz JSON | Omit IDs — they are auto-generated at load time |
| Flat list of 20+ questions with no sections | Wrap related items in `"type": "section"` with a title |
| Putting markdown in `type` or `id` fields | Only text content fields support markdown |
| Single backslash in JSON LaTeX (`\frac`) | Always double: `\\frac` |
| `$500` or `\$` for currency in text | Write `500 USD` or `US$500` — bare `$` triggers math mode |
| `\$` inside a `$...$` math block | Use `\text{\textdollar}` — `\$` breaks the delimiter parser |

---

## Example Interactions

### Interactive (no spec file given)

```
User: /make-quiz
Assistant: What material should I build the quiz from?
  - This codebase — I'll analyze the code in the current project
  - Files/folders — give me a path
  - A URL / PDF
  - A topic — I'll use my own knowledge

User: This codebase, focus on API routes and database layer, advanced, ~20 questions, teach me.
  I always mix up middleware ordering vs route matching.
Assistant: [Writes codebase-review.quizspec with the users preferences, then reads codebase, generates quiz]
Assistant: Saved spec to codebase-review.quizspec — you can rerun or tweak it later.
```

### With an existing spec file

```
User: /make-quiz physics-midterm.quizspec
Assistant: [Reads spec, ingests sources, generates quiz]
Assistant: Written to physics-midterm.quiz (25 questions, 5 sections, teach mode).
```
