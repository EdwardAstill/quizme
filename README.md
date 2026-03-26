# QuizMe

A local quiz app that runs in your browser. Load a quiz file, answer questions with instant feedback, and get a score breakdown at the end. No accounts, no servers, no data leaves your machine.

## Install

Requires [Bun](https://bun.sh).

```bash
bun install -g github:EdwardAstill/quizme
```

Make sure `~/.bun/bin` is on your PATH. If it isn't, add it once:

```bash
# fish
fish_add_path ~/.bun/bin

# bash/zsh
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
```

### Development

To work on QuizMe itself:

```bash
git clone https://github.com/EdwardAstill/quizme.git
cd quizme
bun install
bun link
```

## Usage

```bash
quizme path/to/quiz.quiz.md   # Start with a quiz file
quizme -t                      # Run the built-in sample quiz
quizme                         # Start with file picker
```

Opens your browser automatically. Press `Ctrl+C` to stop.

See [`docs/user-guide.md`](docs/user-guide.md) for full usage details and CLI options.

## Quiz Files

QuizMe supports two formats: **Markdown** (`.quiz.md`, recommended) and **JSON** (`.quiz`). Seven item types: single choice, multiple choice, true/false, free text, question groups, info pages, and sections.

Example (`.quiz.md`):

```markdown
---
title: My Quiz
---

## [single] Which planet is closest to the Sun?
- Venus
- Mercury *
- Earth
- Mars
> Mercury orbits at ~58 million km from the Sun.
```

See [`docs/quiz-format.md`](docs/quiz-format.md) for the full specification.

## Documentation

- [**User Guide**](docs/user-guide.md) — CLI options, navigation, settings
- [**Quiz Format**](docs/quiz-format.md) — Markdown and JSON format specs, quality checklist
- [**Quiz Spec Format**](docs/quizspec-format.md) — `.quizspec` recipes for quiz generation
- [**Architecture**](docs/architecture.md) — Technical architecture for contributors

## How It Works

The CLI starts a Vite dev server and opens your browser. If a quiz file is provided, it's parsed and served at `/api/quiz`. If no file is given, the app shows a drag-and-drop file picker.

## License

MIT
