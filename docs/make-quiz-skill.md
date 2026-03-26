---
name: make-quiz
description: >
  Generate a QuizMe `.quiz` file by analyzing the current codebase or a user-specified topic.
  ALWAYS use this skill when the user asks to: make a quiz, generate quiz questions, create a .quiz file,
  build a quiz from code, quiz me on this repo, or test my knowledge.
  Trigger even on casual phrasings like "quiz me on X", "make a quiz about Y", "test me on this codebase",
  or "generate questions from this repo".
  This skill governs the full quiz generation workflow — analysis, question design, formatting, and output.
---

# Make Quiz

Generate a `.quiz` file for the QuizMe app. The file uses JSON format with a `.quiz` extension.

---

## Workflow

### Phase 1: Codebase Analysis

Before writing any questions, deeply understand the material:

1. **Read key files** — entry points, core modules, configuration, types, README/docs
2. **Identify concepts** — architecture patterns, data models, algorithms, APIs, domain logic, conventions
3. **Categorize by difficulty** — some concepts are definitional (easy), some require understanding relationships (medium), some require synthesis or debugging intuition (hard)

### Phase 2: Topic Selection

Present the user with what you found and ask:

- Which topics/areas to focus on
- Desired difficulty (beginner, intermediate, advanced, mixed)
- Approximate question count (default: 10-20 items)
- Whether to include info pages as study material between sections

If the user doesn't specify, make a balanced quiz covering the most important concepts.

### Phase 3: Question Design

Design questions following these principles:

- **Mix question types** — never make the entire quiz single-choice. Use all six item types where appropriate
- **Progression** — start easier, build to harder concepts within each section
- **Structure with info pages** — introduce each new topic section with an info page providing context before testing
- **Good distractors** — wrong options must be plausible. Use common misconceptions, off-by-one errors, similar-looking alternatives
- **Explanations are mandatory** — every question must have an explanation. Explain *why* the answer is correct and *why* common wrong answers are wrong. The explanation is where the real learning happens
- **Code in questions** — use fenced code blocks for multi-line code snippets, inline backticks for identifiers like `functionName()` or `ClassName`
- **Free text answers must be short** — 1-3 words, unambiguous. If the answer could be phrased multiple ways, use single/multi choice instead
- **Groups for related concepts** — when testing multiple aspects of one topic, use a question group with a shared prompt instead of separate questions
- **No trick questions** — questions should be challenging but fair. The goal is learning, not gotchas

### Phase 4: Output

Write the `.quiz` file to the repo root (or wherever the user specifies). Validate before writing:

- All IDs are unique (including within group parts)
- All `answer` values exactly match an entry in `options`
- All `answers` arrays contain only values from `options`
- JSON is valid and properly escaped (especially backslashes in LaTeX)

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

`questions` is an ordered array of items. Each item is one of six types described below.

---

## Item Types

### Info Page

Displays markdown content without requiring an answer. Use to introduce sections, provide background, or explain concepts before testing them. Does not count toward the quiz score.

```json
{
  "id": "unique-id",
  "type": "info",
  "content": "Markdown string — full markdown with headings, lists, code blocks, and math"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"info"` | yes | |
| `content` | string | yes | Full markdown content. Supports headings, bold, italic, code blocks, lists, blockquotes, links, images, and LaTeX math |

### Single Choice

One correct answer from a list of options.

```json
{
  "id": "unique-id",
  "type": "single",
  "question": "Question text (markdown)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "Option B",
  "explanation": "Why this is correct (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
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
  "id": "unique-id",
  "type": "multi",
  "question": "Select all that apply (markdown)",
  "options": ["A", "B", "C", "D"],
  "answers": ["A", "C"],
  "explanation": "Explanation (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
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
  "id": "unique-id",
  "type": "truefalse",
  "question": "Statement to evaluate (markdown)",
  "answer": true,
  "explanation": "Explanation (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"truefalse"` | yes | |
| `question` | string | yes | A statement (not a question). Markdown supported |
| `answer` | boolean | yes | `true` or `false` |
| `hint` | string | no | Optional hint revealed on click before answering. Markdown supported |
| `explanation` | string | no | Shown after answering. Markdown supported |

### Free Text

The user types a short answer. Matching is exact after trimming whitespace.

```json
{
  "id": "unique-id",
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
| `id` | string | yes | Unique identifier |
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
  "id": "unique-id",
  "type": "group",
  "question": "Shared prompt (markdown)",
  "parts": [
    { "id": "unique-id-a", "type": "truefalse", "question": "...", "answer": true },
    { "id": "unique-id-b", "type": "single", "question": "...", "options": ["..."], "answer": "..." }
  ],
  "explanation": "Overall explanation shown after all parts are answered (markdown)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"group"` | yes | |
| `question` | string | yes | Shared prompt shown above all parts. Markdown supported |
| `parts` | Question[] | yes | Array of sub-questions. Can be `single`, `multi`, `truefalse`, or `freetext` — **not** `info` or `group` |
| `hint` | string | no | Optional hint revealed on click before all parts are answered. Markdown supported |
| `explanation` | string | no | Shown after all parts are answered. Markdown supported |

**Part IDs must also be globally unique** — not just unique within the group.

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
      "id": "intro",
      "type": "info",
      "content": "# AWS Solutions Architect\n\nThis quiz covers key topics for the **SAA-C03** exam:\n\n- **S3** — storage classes, object limits, naming\n- **Serverless** — Lambda, DynamoDB\n- **IAM** — Identity and Access Management\n\nAWS pricing often uses formulas like:\n\n$$C = \\sum_{i=1}^{n} r_i \\cdot t_i \\cdot p_i$$\n\nwhere $r_i$ is the resource count, $t_i$ is the duration in hours, and $p_i$ is the per-unit price.\n\n> Tip: Read each question carefully before answering!"
    },
    {
      "id": "q1",
      "type": "single",
      "question": "Which S3 storage class is cheapest for infrequent access?",
      "options": ["S3 Standard", "S3 Glacier", "S3 Standard-IA", "S3 One Zone-IA"],
      "answer": "S3 One Zone-IA",
      "explanation": "One Zone-IA is cheapest but lacks multi-AZ redundancy."
    },
    {
      "id": "q2",
      "type": "multi",
      "question": "Which services are serverless? (select all that apply)",
      "options": ["EC2", "Lambda", "DynamoDB", "RDS"],
      "answers": ["Lambda", "DynamoDB"],
      "explanation": "Lambda and DynamoDB require no server management."
    },
    {
      "id": "q3",
      "type": "group",
      "question": "Answer the following questions about S3:",
      "parts": [
        {
          "id": "q3a",
          "type": "truefalse",
          "question": "S3 bucket names must be globally unique.",
          "answer": true,
          "explanation": "Bucket names share a global namespace across all AWS accounts."
        },
        {
          "id": "q3b",
          "type": "single",
          "question": "What is the maximum object size in S3?",
          "options": ["1 TB", "5 TB", "10 TB", "Unlimited"],
          "answer": "5 TB",
          "explanation": "The maximum object size in S3 is 5 terabytes."
        },
        {
          "id": "q3c",
          "type": "freetext",
          "question": "What does S3 stand for?",
          "answer": "Simple Storage Service",
          "caseSensitive": false,
          "placeholder": "Full name of the service...",
          "explanation": "S3 = Simple Storage Service."
        }
      ],
      "explanation": "S3 is one of the foundational AWS services and a key topic on the SAA-C03 exam."
    },
    {
      "id": "q4",
      "type": "freetext",
      "question": "What does IAM stand for?",
      "answer": "Identity and Access Management",
      "caseSensitive": false,
      "placeholder": "e.g. Identity and ...",
      "explanation": "IAM controls who can do what in your AWS account."
    }
  ]
}
```

---

## Quality Checklist

Verify every point before writing the file:

- [ ] **IDs are unique** — every `id` across the entire file, including group part IDs
- [ ] **Answers match options exactly** — every `answer` string is character-for-character identical to one entry in `options`; every `answers` array entry matches an `options` entry
- [ ] **Free text answers are short** — 1-3 words, no ambiguity. If you can think of an alternate valid phrasing, switch to single choice
- [ ] **Every question has an explanation** — explain why the answer is correct *and* why common wrong answers are wrong
- [ ] **Distractors are plausible** — wrong options should reflect real misconceptions, not absurd fillers
- [ ] **At least 3 different question types** used across the quiz
- [ ] **Info pages before new sections** — each topic shift gets an info page introduction
- [ ] **JSON is valid** — all backslashes in LaTeX are doubled, newlines use `\n`, strings are properly quoted
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
| Reusing IDs between questions and group parts | Every ID must be globally unique in the file |
| Putting markdown in `type` or `id` fields | Only text content fields support markdown |
| Single backslash in JSON LaTeX (`\frac`) | Always double: `\\frac` |

---

## Example Interaction

```
User: /make-quiz
Assistant: [Reads key files: entry points, core modules, types, config, README]
Assistant: I found these main areas in the codebase:

1. **Authentication** — OAuth flow, JWT validation, session management
2. **Database layer** — Prisma schema, migrations, query patterns
3. **API routes** — REST endpoints, middleware, error handling
4. **Frontend state** — React hooks, context providers, data fetching

Which areas should I focus on? And any preferences for:
- Difficulty level? (beginner / intermediate / advanced / mixed)
- Number of questions? (default: ~15)
- Include info pages as study material?

User: Focus on the API routes and database layer, make it advanced, ~20 questions with info pages