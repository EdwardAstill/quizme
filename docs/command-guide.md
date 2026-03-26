# Command Guide

QuizMe is a local quiz app. The CLI starts a Vite dev server and opens the browser to run the quiz.

---

## Setup

```bash
bun install && bun link
```

This installs dependencies and makes `quizme` available globally.

---

## Usage

```
quizme [file] [options]
```

| Argument | Description |
|----------|-------------|
| `[file]` | Path to a `.quiz.md`, `.quiz`, or `.json` file. If omitted, the browser opens a file picker. |

### Options

| Flag | Description |
|------|-------------|
| `-p, --port <number>` | Port to serve on (default: `3000`) |
| `-t, --test` | Run the built-in sample quiz |
| `--no-open` | Don't auto-open the browser |

---

## Examples

```bash
# Start with a quiz file
quizme path/to/quiz.quiz.md

# Start with file picker (no quiz pre-loaded)
quizme

# Run the built-in sample quiz
quizme -t

# Custom port, no browser auto-open
quizme quiz.quiz.md -p 8080 --no-open
```

---

## How It Works

1. CLI parses arguments via Commander
2. If a quiz file is provided, it's parsed into the internal `Quiz` type
3. Vite dev server starts and serves parsed quiz data at `/api/quiz`
4. Browser opens to `http://localhost:{port}`
5. React frontend fetches `/api/quiz` and renders the quiz

If no file is provided, the `/api/quiz` endpoint returns 404 and the frontend shows a file picker instead.

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server directly |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type checking (strict mode) |
