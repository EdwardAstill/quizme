# Quiz JSON Format

A quiz is a `.quiz` file (JSON format) with a `title`, optional `description`, and an array of `questions` (which can be questions, question groups, or info pages). The `.json` extension is also accepted.

All text fields (questions, options, explanations, info content) support **Markdown** with **LaTeX math** (`$...$` for inline, `$$...$$` for display).

## Top-level structure

```json
{
  "title": "My Quiz",
  "description": "Optional description shown in the sidebar",
  "questions": [ ... ]
}
```

## Item types

### Single choice

```json
{
  "id": "q1",
  "type": "single",
  "question": "What is $2 + 2$?",
  "options": ["3", "4", "5", "6"],
  "answer": "4",
  "explanation": "Basic arithmetic."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"single"` | yes | |
| `question` | string | yes | Markdown text |
| `options` | string[] | yes | List of choices (markdown) |
| `answer` | string | yes | Must match one of `options` exactly |
| `hint` | string | no | Revealed on click before answering (markdown) |
| `explanation` | string | no | Shown after answering |

### Multiple choice

```json
{
  "id": "q2",
  "type": "multi",
  "question": "Select all **prime** numbers:",
  "options": ["1", "2", "3", "4"],
  "answers": ["2", "3"],
  "explanation": "1 is not prime. 4 = 2 x 2."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"multi"` | yes | |
| `question` | string | yes | Markdown text |
| `options` | string[] | yes | List of choices (markdown) |
| `answers` | string[] | yes | All correct options (order doesn't matter) |
| `hint` | string | no | Revealed on click before answering (markdown) |
| `explanation` | string | no | Shown after answering |

### True / False

```json
{
  "id": "q3",
  "type": "truefalse",
  "question": "The derivative of $e^x$ is $e^x$.",
  "answer": true,
  "explanation": "$\\frac{d}{dx} e^x = e^x$"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"truefalse"` | yes | |
| `question` | string | yes | Markdown text |
| `answer` | boolean | yes | `true` or `false` |
| `hint` | string | no | Revealed on click before answering (markdown) |
| `explanation` | string | no | Shown after answering |

### Free text

```json
{
  "id": "q4",
  "type": "freetext",
  "question": "What does **CPU** stand for?",
  "answer": "Central Processing Unit",
  "caseSensitive": false,
  "placeholder": "Type the full name...",
  "explanation": "CPU = Central Processing Unit."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"freetext"` | yes | |
| `question` | string | yes | Markdown text |
| `answer` | string | yes | Expected answer (exact match after trimming) |
| `caseSensitive` | boolean | no | Default `false` |
| `placeholder` | string | no | Input placeholder text |
| `hint` | string | no | Revealed on click before answering (markdown) |
| `explanation` | string | no | Shown after answering |

### Question group

Groups multiple sub-questions under a shared prompt. Each part is scored individually.

```json
{
  "id": "q5",
  "type": "group",
  "question": "Answer the following about **integration**:",
  "parts": [
    {
      "id": "q5a",
      "type": "truefalse",
      "question": "$\\int x\\,dx = \\frac{x^2}{2} + C$",
      "answer": true
    },
    {
      "id": "q5b",
      "type": "freetext",
      "question": "What is $\\int 1\\,dx$?",
      "answer": "x + C"
    }
  ],
  "explanation": "These are basic integration rules."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"group"` | yes | |
| `question` | string | yes | Shared prompt (markdown) |
| `parts` | Question[] | yes | Array of sub-questions (any question type) |
| `hint` | string | no | Revealed on click before all parts are answered (markdown) |
| `explanation` | string | no | Shown after all parts are answered |

### Info page

Displays markdown content without requiring an answer. Useful for instructions, background material, or topic introductions between questions.

```json
{
  "id": "intro",
  "type": "info",
  "content": "# Welcome\n\nThis section covers **linear algebra**.\n\nRecall that a matrix $A$ is invertible if $\\det(A) \\neq 0$.\n\n$$A^{-1} = \\frac{1}{\\det(A)} \\text{adj}(A)$$"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `type` | `"info"` | yes | |
| `content` | string | yes | Full markdown content with optional math |

Info pages don't count toward the quiz score or the "remaining" count.

## Markdown and math

All text fields support standard Markdown:

- `**bold**`, `*italic*`, `` `code` ``
- `# Headings`, `> Blockquotes`
- `- Lists` (bulleted and numbered)
- Code blocks with triple backticks
- Links `[text](url)` and images `![alt](url)`

Math uses LaTeX syntax via KaTeX:

- Inline: `$E = mc^2$` renders as inline math
- Display: `$$\int_0^\infty e^{-x}\,dx = 1$$` renders as a centered block equation

In JSON strings, backslashes must be escaped: write `\\frac` instead of `\frac`.

**Known limitation: `$` as currency.** The renderer uses `$` as math delimiters, so bare `$` for currency can accidentally trigger math mode:

- **Currency outside math:** Write `500 USD` or `US$500` — never bare `$500`
- **Currency inside math:** Use `\text{\textdollar}` — do **not** use `\$` inside `$...$` blocks, as the parser treats the `$` as a closing delimiter
- **`\$` outside math:** Works correctly, but prefer `USD` for clarity

## Full example

See [`examples/sample.quiz`](../examples/sample.quiz) for a complete working example.
