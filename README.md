# QuizMe

A local quiz app that runs in your browser. Load any quiz from a `.quiz` file, answer questions with instant feedback, and get a score breakdown at the end. No accounts, no servers, no data leaves your machine.

Supports seven item types: single choice, multiple choice, true/false, free text, question groups, info pages, and sections.

## Install

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/EdwardAstill/quizme.git
cd quizme
bun install
bun link
```

Make sure `~/.bun/bin` is on your PATH. If it isn't, add it once:

```bash
# fish
fish_add_path ~/.bun/bin

# bash/zsh
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
```

## Usage

```bash
# Start with a quiz file
quizme ./examples/sample.quiz

# Run the built-in sample quiz
quizme -t

# Or start with the file picker
quizme
```

Opens your browser automatically. Press `Ctrl+C` to stop.

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --port <number>` | Port to serve on | `3000` |
| `-t, --test` | Run the built-in sample quiz | — |
| `--no-open` | Don't auto-open the browser | — |

## Quiz File Format

Files use `.quiz` extension (JSON format, `.json` also accepted). IDs are optional — auto-generated at load time if omitted. All text fields support Markdown with LaTeX math.

```json
{
  "title": "My Quiz",
  "description": "Optional description",
  "questions": [
    {
      "type": "single",
      "question": "Which planet is closest to the Sun?",
      "options": ["Venus", "Mercury", "Earth", "Mars"],
      "answer": "Mercury",
      "explanation": "Mercury orbits at ~58 million km from the Sun."
    }
  ]
}
```

### Item Types

**`single`** — Pick one answer from a list.
**`multi`** — Select all correct answers (uses `answers` array instead of `answer`).
**`truefalse`** — True or false (answer is a boolean).
**`freetext`** — Type the answer. Case-insensitive by default.
**`group`** — Groups multiple sub-questions under a shared prompt, each scored individually.
**`info`** — Displays markdown content without requiring an answer (not scored).
**`section`** — Groups related items under a heading in the sidebar.

See [`docs/quiz-format.md`](docs/quiz-format.md) for the full specification with examples of every type.

## Development

```bash
bun run typecheck    # Type check without emitting
```

### Project Structure

```
src/
  components/        QuestionCard, QuizLoader, QuizNav, ScoreSummary, Settings, Markdown, ProgressBar
  hooks/             useQuiz.ts (quiz state machine), useSettings.ts (settings persistence)
  types/quiz.ts      TypeScript interfaces
  utils/             preprocessQuiz.ts (ID generation, section flattening)
cli.ts               CLI entry point
examples/            Sample .quiz and .quizspec files
docs/                User guide, quiz format spec, architecture
```

## How It Works

The CLI starts a Vite dev server and opens your browser. If a quiz JSON file is provided as an argument, it's served at `/api/quiz` and the quiz loads automatically. If no file is given, the app shows a drag-and-drop file picker to load one from the browser.

## License

MIT
