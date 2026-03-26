# QuizMe User Guide

## Installation

```bash
git clone <repo-url>
cd QuizMe
bun install && bun link
```

This makes the `quizme` command available globally.

## Usage

### Start with a quiz file

```bash
quizme path/to/quiz.quiz
```

Opens your browser with the quiz loaded and ready to take.

### Start with the file picker

```bash
quizme
```

Opens the app with a drag-and-drop file picker where you can load a .quiz file from your browser.

### Run the built-in sample quiz

```bash
quizme -t
```

### CLI options

| Flag | Description |
|------|-------------|
| `-p, --port <number>` | Port to serve on (default: 3000) |
| `-t, --test` | Run the built-in sample quiz |
| `--no-open` | Don't auto-open the browser |

## Taking a Quiz

### Navigation

- Use the **Previous** / **Next** buttons or **arrow keys** to move between items
- Click any item in the **sidebar** to jump directly to it
- The sidebar shows your progress with colored dots:
  - **Blue** --- info page
  - **Green** --- correct answer
  - **Red** --- wrong answer
  - **Yellow** --- partially correct (group questions)
  - **Hollow** --- unanswered

### Question types

- **Single choice** --- click an option, then click Submit
- **Multiple choice** --- check all that apply, then click Submit
- **True / False** --- click True or False, then click Submit
- **Free text** --- type your answer and press Enter or click Submit

### Info pages

Some quizzes include information pages between questions. These display formatted content (with support for markdown and math) and don't require an answer.

### Finishing

Once all questions are answered, click **Finish quiz** in the sidebar. You'll see a score summary with a breakdown of each question, your answer, and explanations.

## Settings

Click the gear icon in the top-right corner to access settings:

| Setting | Options |
|---------|---------|
| **Theme** | Dark, Light, Midnight, Forest |
| **Font size** | Small (14px), Medium (16px), Large (18px) |
| **Content width** | Slider from 20% to 100% |
| **Show sidebar** | Toggle on/off |

Settings persist across sessions in your browser's localStorage.
