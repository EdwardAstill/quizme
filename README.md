# QuizMe

A local quiz app that runs in your browser. Load any quiz from a JSON file, answer questions with instant feedback, and get a score breakdown at the end. No accounts, no servers, no data leaves your machine.

Supports four question types: single choice, multiple choice, true/false, and free text.

## Quick Start

```bash
bun install

# Start with a quiz file
bun cli.ts ./examples/sample-quiz.json

# Or start with a file picker
bun run start
```

Opens your browser automatically. Press `Ctrl+C` to stop.

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --port <number>` | Port to serve on | `3000` |
| `--no-open` | Don't auto-open the browser | — |

## Quiz JSON Format

```json
{
  "title": "My Quiz",
  "description": "Optional description",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "question": "Which planet is closest to the Sun?",
      "options": ["Venus", "Mercury", "Earth", "Mars"],
      "answer": "Mercury",
      "explanation": "Mercury orbits at ~58 million km from the Sun."
    }
  ]
}
```

### Question Types

**`single`** — Pick one answer from a list.

```json
{
  "id": "q1",
  "type": "single",
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answer": "B",
  "explanation": "Optional explanation shown after answering."
}
```

**`multi`** — Select all correct answers.

```json
{
  "id": "q2",
  "type": "multi",
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answers": ["B", "D"],
  "explanation": "..."
}
```

**`truefalse`** — True or false.

```json
{
  "id": "q3",
  "type": "truefalse",
  "question": "The sky is blue.",
  "answer": true,
  "explanation": "..."
}
```

**`freetext`** — Type the answer. Case-insensitive by default.

```json
{
  "id": "q4",
  "type": "freetext",
  "question": "What does HTML stand for?",
  "answer": "HyperText Markup Language",
  "caseSensitive": false,
  "explanation": "..."
}
```

## Development

```bash
bun run typecheck    # Type check without emitting
```

### Project Structure

```
src/
  components/        QuestionCard, QuizLoader, ProgressBar, ScoreSummary
  hooks/useQuiz.ts   Quiz state machine
  types/quiz.ts      TypeScript interfaces
cli.ts               CLI entry point
examples/            Sample quiz files
```

## How It Works

The CLI starts a Vite dev server and opens your browser. If a quiz JSON file is provided as an argument, it's served at `/api/quiz` and the quiz loads automatically. If no file is given, the app shows a drag-and-drop file picker to load one from the browser.

## License

MIT
