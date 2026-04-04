# Quiz Format

QuizMe supports two file formats: **Markdown** (`.quiz.md`) and **JSON** (`.quiz` or `.json`). Both produce the same quiz — choose whichever is easier to write.

**Markdown is recommended** for hand-authored and LLM-generated quizzes — no escaping, no index arithmetic, and LaTeX works naturally.

All text fields support **Markdown** with **LaTeX math** (`$...$` for inline, `$$...$$` for display). IDs are optional — auto-generated at load time.

---

## Markdown Format (`.quiz.md`)

### Structure

```
---                              ← YAML frontmatter (required)
title: Quiz Title
description: Optional subtitle
---

## [info] Heading                ← info page
:::                              ← extended body block (optional)
Markdown content...
:::

# Section Title                  ← section (groups items in sidebar)

## [single] Question text        ← single-choice question
- Wrong option
- Correct option *               ← trailing * marks the correct answer
- Another wrong option
?> Hint text                     ← hint (shown before answering)
> Explanation text               ← explanation (shown after answering)

## [multi] Question text         ← multiple-choice question
- Wrong *                        ← multiple * for multiple correct
- Correct *
- Wrong

## [truefalse] Statement text    ← true/false question
true *                           ← * marks which value is correct

## [freetext] Question text      ← free-text question
= Expected answer                ← exact-match answer

## [group] Shared prompt         ← question group
### [truefalse] Sub-question 1   ← sub-questions use ###
true *
### [freetext] Sub-question 2
= Answer
```

### Reference

| Element | Syntax |
|---------|--------|
| Frontmatter | `---` / `title:` / `description:` / `---` |
| Section | `# Section Title` |
| Item | `## [type] Text` — type is `single`, `multi`, `truefalse`, `freetext`, `info`, or `group` |
| Group sub-question | `### [type] Text` |
| Extended body | `:::` block after heading (supports code fences inside) |
| Options | `- Option text` (append ` *` for correct) |
| True/false answer | `true *` or `false *` on its own line |
| Free text answer | `= answer text` |
| Hint | `?> hint text` |
| Explanation | `> text` (multiline: each line starts with `> `) |
| Local image | `:::filename.png` on its own line inside a `:::` body block — loads from `images/` folder next to the quiz file |

### Extended body blocks (`:::`)

For question text longer than the heading — code snippets, multi-paragraph prompts, etc.:

```markdown
## [single] Consider the following code:
:::
```python
def foo(x):
    return x * 2
```

What does `foo(3)` return?
:::
- 3
- 6 *
- 9
```

The `:::` content is appended to the heading text. Code fences inside are handled correctly.

### Images

Two ways to include images in quiz content:

**Local image** (file in `images/` folder next to the quiz file):

```markdown
:::diagram.png
```

**Web image** (standard markdown, fetched directly by the browser):

```markdown
![alt text](https://example.com/photo.png)
```

`:::filename.png` on its own line inside a `:::` body block renders as an inline image. The file must be in an `images/` subfolder next to the quiz file:

```
.quizme/
  physics.quiz.md
  images/
    diagram.png
    circuit.jpg
```

Supported formats: `png`, `jpg`, `gif`, `svg`, `webp`.

**Example — question with image:**

```markdown
## [single] What does this circuit diagram show?
:::
:::circuit.png
:::
- A series circuit *
- A parallel circuit
- A short circuit
```

### Complete markdown example

See [`examples/sample.quiz.md`](../examples/sample.quiz.md) for a working example with all item types:

```markdown
---
title: AWS Solutions Architect
description: Practice exam for SAA-C03
---

## [info] AWS Solutions Architect
:::
This quiz covers key topics for the **SAA-C03** exam.

$$C = \sum_{i=1}^{n} r_i \cdot t_i \cdot p_i$$
:::

# S3 Storage

## [single] Which S3 storage class is cheapest for infrequent access?
- S3 Standard
- S3 Glacier
- S3 Standard-IA
- S3 One Zone-IA *
?> Think about which class trades redundancy for lower cost.
> One Zone-IA is cheapest but lacks multi-AZ redundancy.

## [group] Answer the following questions about S3:

### [truefalse] S3 bucket names must be globally unique.
true *
> Bucket names share a global namespace across all AWS accounts.

### [freetext] What does S3 stand for?
= Simple Storage Service

# Serverless & IAM

## [multi] Which services are serverless? (select all that apply)
- EC2
- Lambda *
- DynamoDB *
- RDS
> Lambda and DynamoDB require no server management.

## [freetext] What does IAM stand for?
= Identity and Access Management
?> It's three words: **I**___ **A**___ **M**___
> IAM controls who can do what in your AWS account.
```

---

## JSON Format (`.quiz` or `.json`)

### Top-level structure

```json
{
  "title": "My Quiz",
  "description": "Optional description shown in the sidebar",
  "questions": [ ... ]
}
```

The `questions` array contains items directly (flat) or wrapped in sections.

**Important:** Single-choice `answer` and multi-choice `answers` use **zero-based numeric indices** into the `options` array, not string values.

### Item types

**Single choice:**
```json
{ "type": "single", "question": "What is $2 + 2$?", "options": ["3", "4", "5"], "answer": 1, "explanation": "..." }
```
`answer`: zero-based index into `options`.

**Multiple choice:**
```json
{ "type": "multi", "question": "Select primes:", "options": ["1", "2", "3", "4"], "answers": [1, 2], "explanation": "..." }
```
`answers`: array of zero-based indices. Order doesn't matter.

**True/false:**
```json
{ "type": "truefalse", "question": "The sky is blue.", "answer": true, "explanation": "..." }
```

**Free text:**
```json
{ "type": "freetext", "question": "What does CPU stand for?", "answer": "Central Processing Unit", "caseSensitive": false }
```
`caseSensitive` defaults to `false`. Keep answers to 1-3 words.

**Info page:**
```json
{ "type": "info", "content": "# Welcome\n\nMarkdown content here." }
```
Not scored. Doesn't count toward "remaining."

**Question group:**
```json
{ "type": "group", "question": "Shared prompt:", "parts": [ ...questions ], "explanation": "..." }
```
Parts are scored individually. Can contain `single`, `multi`, `truefalse`, or `freetext` — not `info` or `group`.

**Section:**
```json
{ "type": "section", "title": "Chapter 1", "items": [ ...quiz items ] }
```
Organizes items under a sidebar heading. Navigation stays flat.

### Common fields

All question types support optional `hint` (shown before answering) and `explanation` (shown after). Both accept markdown.

### JSON escaping

In JSON strings, every LaTeX backslash must be doubled: `\\frac`, `\\sum`, `\\text`. Newlines use `\n`.

### Complete JSON example

See [`examples/sample.quiz`](../examples/sample.quiz).

---

## Markdown and Math

All text fields support Markdown (rendered via react-markdown with remark-gfm) and LaTeX math (via remark-math + rehype-katex):

- **Inline math:** `$E = mc^2$`
- **Display math:** `$$\int_0^\infty e^{-x}\,dx = 1$$`
- Standard markdown: bold, italic, code, headings, lists, links, tables, blockquotes
- **Local images:** `:::filename.png` inside a `:::` block — see [Images](#images) section above
- **Web images:** `![alt](https://...)` — standard markdown, fetched directly by the browser

**Known limitation: `$` as currency.** The parser uses `$` as math delimiters:
- Write `500 USD` or `US$500` — never bare `$500`
- Inside math blocks, use `\text{\textdollar}` — not `\$` (breaks the delimiter parser)

---

## Quality Checklist

Verify before writing any quiz file:

- [ ] **Correct answers are marked** — markdown: ` *` suffix on correct options, `true/false *`, `= answer`; JSON: valid zero-based indices
- [ ] **Free text answers are short** — 1-3 words, unambiguous. If multiple phrasings are valid, use single choice instead
- [ ] **Every question has an explanation** — explain why the answer is correct *and* why common wrong answers are wrong
- [ ] **Distractors are plausible** — wrong options reflect real misconceptions, not absurd fillers
- [ ] **At least 3 different question types** used across the quiz
- [ ] **Info pages before new sections** — each topic shift gets an info page introduction
- [ ] **No bare `$` for currency** — use `USD` or `US$`; inside math use `\text{\textdollar}`
- [ ] **Difficulty progression** — easier questions first within each section
- [ ] **No trick questions** — challenging but fair; the goal is learning

## Anti-patterns

| Don't | Do instead |
|-------|-----------|
| All single-choice questions | Mix in multi, truefalse, freetext, and groups |
| Obvious wrong answers | Plausible distractors based on real misconceptions |
| Free text with long/ambiguous answers | Single choice for anything > 3 words or with multiple valid phrasings |
| Questions testing only memorization | Test understanding, relationships, and application |
| 20 questions with no structure | Use sections and info pages to organize |
| Missing explanations | Always explain — this is where the learning happens |
| Flat list of 20+ items | Wrap in sections with titles |
| Generating `.quiz` JSON instead of `.quiz.md` | Use markdown unless explicitly asked for JSON |
