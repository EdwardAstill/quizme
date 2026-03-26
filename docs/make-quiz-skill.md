---
name: make-quiz
description: >
  Generate a QuizMe `.quiz.md` file from a `.quizspec` recipe, inline arguments, or interactively.
  ALWAYS use this skill when the user asks to: make a quiz, generate quiz questions, create a .quiz file,
  build a quiz from code, quiz me on this repo, or test my knowledge.
  Trigger even on casual phrasings like "quiz me on X", "make a quiz about Y", "test me on this codebase",
  or "generate questions from this repo".
  This skill governs the full quiz generation workflow — source ingestion, question design, formatting, and output.
  Always generates a .quizspec file first (as a reusable recipe) before producing the .quiz.md file.
---

# Make Quiz

Generate a `.quiz.md` file for the QuizMe app. **Every run produces a `.quizspec` first** — either by reading an existing one or generating one from the user's input. The spec is then used to generate the quiz.

**Output format:** Always generate `.quiz.md` (markdown format). See `docs/quiz-format.md` for the complete format reference, quality checklist, and anti-patterns. The `.quiz` JSON format should only be used when explicitly requested.

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

See `docs/quizspec-format.md` for the full spec format.

---

## Phase 2: Ingest sources

Read the spec and process each source:

- **Folder:** Glob for matching files → Read each (prioritize by `focus` if too many)
- **File:** Read directly
- **URL:** WebFetch the page → extract main content
- **PDF:** Read with `pages` parameter if specified → chunk large PDFs (20 pages at a time)
- **Codebase:** Read heuristically (README, entry points, core modules, types, config) or use glob if specified
- **Topic only (no sources):** Use your own knowledge — no ingestion needed

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

Follow the [Question Design Rules](#question-design-rules) below and respect all spec parameters:

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

1. Determine output path: spec's `output` field, or `<spec-name>.quiz.md` in the same directory
2. Validate the quiz against the quality checklist in `docs/quiz-format.md`
3. Write the `.quiz.md` file

### Batch mode (`per_file` or `per_source`)

When `generate.mode` is `per_file` or `per_source`, produce multiple quizzes:

1. **Split sources** — in `per_file` mode, expand folder sources into individual files. In `per_source` mode, treat each source entry as its own unit
2. **Loop:** For each unit, run Phase 2–4 independently, scoped to that unit's material only
3. **Name each quiz** — derive file names from sources (see `docs/quizspec-format.md` naming rules). Use `generate.title_from` to set each quiz's title
4. **Write to `generate.output_dir`** — create the directory if needed. Validate each quiz before writing
5. **Report results** — tell the user how many quizzes were generated and where they are

**Important for batch mode:**
- Each quiz is independent — don't reference material from other files
- Apply the same `parameters`, `focus`, `exclude`, and `notes` to each quiz
- If a source file is too small to generate `count` questions, generate as many as the material supports and note this

---

## Question Design Rules

- **Mix question types** — never make the entire quiz single-choice. Use all allowed types where appropriate
- **Progression** — start easier, build to harder concepts within each section
- **Structure with sections** — use `# Section Title` to organize by topic, with info pages introducing each section (especially when `teach` is true)
- **Good distractors** — wrong options must be plausible. Use common misconceptions, off-by-one errors, similar-looking alternatives
- **Explanations are mandatory** — every question must have a `> ` explanation. Explain *why* the answer is correct and *why* common wrong answers are wrong
- **Code in questions** — use `:::` body blocks with fenced code blocks for multi-line snippets, inline backticks for identifiers
- **Free text answers must be short** — 1-3 words, unambiguous. If the answer could be phrased multiple ways, use single/multi choice instead
- **Groups for related concepts** — when testing multiple aspects of one topic, use a `## [group]` with `### [type]` sub-questions
- **No trick questions** — challenging but fair. The goal is learning, not gotchas
- **Teach mode info pages** — when `teach` is true, info pages should be substantial: explain the concept clearly with examples, formulas, and context *before* testing

### Difficulty calibration

| Level | Question style | Example |
|-------|---------------|---------|
| Beginner | "What is X?" / "Which of these is Y?" | "What does HTTP stand for?" |
| Intermediate | "Why does X happen?" / "What's the difference between X and Y?" | "Why does TCP use a three-way handshake instead of a two-way?" |
| Advanced | "Given this scenario..." / "What would happen if..." / Debug-style | "A server returns 200 but the client sees a CORS error. What's the most likely cause?" |

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
Assistant: Written to physics-midterm.quiz.md (25 questions, 5 sections, teach mode).
```
