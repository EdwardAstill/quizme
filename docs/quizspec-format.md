# Quiz Spec Format

A `.quizspec` file is a YAML recipe that tells the `make-quiz` skill **what** quiz to generate. It declares source material, quiz parameters, and topic focus — the skill handles the rest.

## Quick start

```yaml
# my-quiz.quizspec
title: "Networking Fundamentals"
sources:
  - type: folder
    path: ~/notes/networking/
    glob: "*.md"
parameters:
  count: 15
  difficulty: intermediate
  teach: true
```

Then run: `/make-quiz my-quiz.quizspec`

## Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Quiz title (used in the generated `.quiz` file) |
| `description` | string | no | Subtitle shown in the sidebar |
| `sources` | Source[] | yes | Where to pull material from (at least one) |
| `parameters` | Parameters | no | Quiz generation settings (defaults apply if omitted) |
| `focus` | string[] | no | Topics to emphasize — questions will center on these |
| `exclude` | string[] | no | Topics to skip even if they appear in sources |
| `notes` | string | no | Free-form instructions, context, or guidance for quiz generation (e.g. "focus on common exam pitfalls", "explain concepts as if teaching a beginner") |
| `generate` | Generate | no | Controls single vs. batch quiz generation (default: one quiz from all sources combined) |
| `output` | string | no | Output file path for single mode (default: `<spec-name>.quiz` in same directory). Ignored in batch modes — see [Batch Generation](#batch-generation) |

## Sources

Each source tells the skill where to find material. Multiple sources are combined.

### Folder

Read files from a local directory.

```yaml
- type: folder
  path: ~/notes/physics/chapters-1-5/
  glob: "*.md"           # optional, default: "*" (all files)
  recursive: true        # optional, default: true
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"folder"` | yes | |
| `path` | string | yes | Absolute or relative path to directory. `~` is expanded |
| `glob` | string | no | File pattern filter (default: `"*"`) |
| `recursive` | boolean | no | Search subdirectories (default: `true`) |

### File

Read a specific file (any text format).

```yaml
- type: file
  path: ~/notes/lecture-3.md
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"file"` | yes | |
| `path` | string | yes | Path to the file. `~` is expanded |

### URL

Fetch content from a web page.

```yaml
- type: url
  url: https://docs.example.com/api/overview
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"url"` | yes | |
| `url` | string | yes | Full URL to fetch |

### PDF

Read a PDF file, optionally limiting to specific pages.

```yaml
- type: pdf
  path: ~/textbooks/algorithms.pdf
  pages: "1-30"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"pdf"` | yes | |
| `path` | string | yes | Path to the PDF. `~` is expanded |
| `pages` | string | no | Page range (e.g. `"1-30"`, `"5"`, `"10-20"`). Omit to read the whole file |

### Codebase

Analyze files in a code project (the skill's original mode).

```yaml
- type: codebase
  path: ~/projects/my-app/
  glob: "src/**/*.ts"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"codebase"` | yes | |
| `path` | string | no | Path to project root (default: current directory) |
| `glob` | string | no | File pattern to focus on (default: reads key files heuristically) |

## Parameters

All parameters are optional — sensible defaults apply.

```yaml
parameters:
  count: 20
  difficulty: advanced
  types: [single, multi, truefalse]
  teach: true
  sections: true
  hints: false
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `count` | number | `15` | Approximate number of quiz questions to generate |
| `difficulty` | string | `"mixed"` | `"beginner"`, `"intermediate"`, `"advanced"`, or `"mixed"` |
| `types` | string[] | all types | Which question types to use. Options: `single`, `multi`, `truefalse`, `freetext`, `group` |
| `teach` | boolean | `false` | If `true`, interleave detailed info pages that teach concepts before testing them |
| `sections` | boolean | `true` | Organize questions into sections by topic |
| `hints` | boolean | `false` | Include hints on questions |

### Difficulty levels

| Level | What it means |
|-------|--------------|
| `beginner` | Recall and definitions. "What is X?" "Which of these is Y?" |
| `intermediate` | Understanding relationships. "Why does X cause Y?" "What happens when...?" |
| `advanced` | Synthesis and application. "Given this scenario, what would you do?" Debug-style questions, edge cases |
| `mixed` | Blend of all levels with natural progression (easier first within each section) |

## Focus and exclude

`focus` narrows the quiz to specific topics from the source material. `exclude` removes topics even if they appear prominently.

```yaml
focus:
  - "Newton's laws"
  - "Conservation of energy"

exclude:
  - "Fluid dynamics"
  - "Thermodynamics"
```

These are interpreted as natural language — they don't need to match file names or headings exactly.

## Notes

Free-form text giving additional instructions or context for quiz generation. This is where you put anything that doesn't fit neatly into other fields — tone, pedagogical approach, specific angles to take, things to emphasize in explanations, etc.

```yaml
notes: |
  This is for a student who struggles with free body diagrams.
  Make sure explanations walk through the diagram step by step.
  Include at least one question that requires drawing a force diagram mentally.
  Prefer "what would happen if..." style questions over pure recall.
```

The `notes` field is passed directly to the quiz generator as additional guidance. It's interpreted as natural language.

## Batch Generation

By default, one spec produces one quiz from all sources combined. The `generate` field changes this to produce **multiple quizzes** from the same spec — one per source file, per source entry, or per custom group.

### Mode: `per_file`

Creates one quiz for each individual file found across all sources. A folder with 5 markdown files produces 5 quizzes.

```yaml
generate:
  mode: per_file
  output_dir: ./quizzes/        # where to write the quiz files
  title_from: filename          # how to name each quiz (see below)
```

Each quiz uses the spec's `parameters`, `focus`, `exclude`, and `notes` — but scoped to that one file's content. The quiz title is derived from the source file.

### Mode: `per_source`

Creates one quiz for each source entry in the `sources` array. Useful when sources are already grouped logically (e.g. one URL per topic, one PDF per chapter).

```yaml
sources:
  - type: file
    path: ~/notes/chapter-1.md
  - type: file
    path: ~/notes/chapter-2.md
  - type: url
    url: https://example.com/chapter-3

generate:
  mode: per_source
  output_dir: ./quizzes/
```

This produces 3 quizzes — one per source entry.

### Mode: `combined` (default)

All sources are merged into one quiz. This is the default when `generate` is omitted.

```yaml
generate:
  mode: combined    # this is the default, same as omitting `generate` entirely
```

### Generate fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | `"combined"` | `"combined"`, `"per_file"`, or `"per_source"` |
| `output_dir` | string | same dir as spec | Directory to write batch quiz files into |
| `title_from` | string | `"filename"` | How to derive each quiz's title in batch modes. `"filename"` uses the source file's name. `"heading"` uses the first `#` heading found in the file. `"content"` asks the generator to infer a title from the material |

### Naming in batch modes

Quiz files are named based on the source:

| Source type | File name |
|-------------|-----------|
| File/folder file | `<filename-without-extension>.quiz` |
| URL | `<last-path-segment>.quiz` |
| PDF | `<pdf-name>-p<pages>.quiz` (or `<pdf-name>.quiz` if no page range) |
| Codebase | `<directory-name>.quiz` |

Examples:
```
~/notes/chapter-1.md           → chapter-1.quiz
~/notes/chapter-2.md           → chapter-2.quiz
https://example.com/api-guide  → api-guide.quiz
~/books/physics.pdf (p1-20)    → physics-p1-20.quiz
```

### Full batch example

```yaml
# weekly-review.quizspec
title: "Weekly Review"
description: "One quiz per lecture"

sources:
  - type: folder
    path: ~/notes/week-5/
    glob: "*.md"

parameters:
  count: 10
  difficulty: intermediate
  teach: true

generate:
  mode: per_file
  output_dir: ./quizzes/week-5/
  title_from: heading

notes: |
  Each quiz should cover just the material in that one file.
  Keep questions focused — don't reference material from other lectures.
```

If `~/notes/week-5/` contains `lecture-9.md`, `lecture-10.md`, and `lab-notes.md`, this produces:
```
./quizzes/week-5/lecture-9.quiz
./quizzes/week-5/lecture-10.quiz
./quizzes/week-5/lab-notes.quiz
```

## Output

By default (in `combined` mode), the generated `.quiz` file is written alongside the `.quizspec` file with the same base name:

```
physics-midterm.quizspec  →  physics-midterm.quiz
```

Override with the `output` field:

```yaml
output: ~/quizzes/physics-midterm.quiz
```

## Full example

```yaml
# physics-midterm.quizspec
title: "Physics Midterm Review"
description: "Chapters 1-5: Mechanics"

sources:
  - type: folder
    path: ~/notes/physics/chapters-1-5/
    glob: "*.md"
  - type: url
    url: https://openstax.org/books/university-physics/pages/5-summary
  - type: pdf
    path: ~/textbooks/university-physics.pdf
    pages: "1-50"

parameters:
  count: 25
  difficulty: mixed
  types: [single, multi, truefalse, freetext, group]
  teach: true
  sections: true
  hints: false

focus:
  - "Newton's laws"
  - "Conservation of energy"
  - "Projectile motion"
  - "Free body diagrams"

exclude:
  - "Fluid dynamics"

notes: |
  Student struggles with free body diagrams — include extra questions there.
  Explanations should walk through the reasoning step by step.
  Prefer scenario-based questions over pure recall.

output: physics-midterm.quiz
```

## Using with the make-quiz skill

**With an existing spec:**
```
/make-quiz physics-midterm.quizspec
```

**Without a spec (interactive):**
```
/make-quiz
```

When no spec exists, the skill asks you questions (source material, difficulty, count, etc.), then **generates a `.quizspec` file first** before producing the quiz. This means every quiz run leaves behind a reusable spec you can tweak and rerun later.

The workflow is always:

1. **Get or create a `.quizspec`** — either read an existing one or generate one from your input
2. **Ingest all sources** — reads folders, fetches URLs, reads PDFs
3. **Filter by focus/exclude** — narrow to relevant material
4. **Generate questions** — following the parameter constraints and notes
5. **Write the `.quiz` file** — validated and ready to run with `quizme`

## Tips

- Start simple: just `title`, one source, and `count`. Add parameters as you need them.
- Use `teach: true` when studying new material — the info pages act as built-in study notes.
- Use `focus` to drill into weak areas after taking a quiz.
- Keep specs in version control alongside your notes — they're small and reusable.
- Rerun the same spec periodically to get fresh questions on the same material.
