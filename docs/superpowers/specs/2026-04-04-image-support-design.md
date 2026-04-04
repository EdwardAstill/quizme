# Image Support Design

**Date:** 2026-04-04  
**Status:** Approved

## Context

Quiz markdown currently supports `![alt](https://...)` web image syntax, but has no way to reference local image files stored alongside a quiz. This design adds a `:::filename.png` shorthand that serves images from an `images/` folder next to the quiz file, while leaving web URLs unchanged.

## Syntax

```markdown
# Local image — from images/ folder next to the quiz file
:::diagram.png

# Web image — standard markdown, unchanged
![alt text](https://example.com/image.png)
```

`:::filename.png` on its own line renders as an image. It is distinct from the existing group body delimiter (`:::` alone on a line) — the parser can tell them apart because this form has non-empty content after `:::`.

## File Structure Convention

```
.quizme/
  physics.quiz.md
  images/
    diagram.png
    circuit.jpg
```

The same convention applies to quizzes in `~/.config/quizme/` or any path passed directly to `quizme <file>`. All quiz files use the `images/` subfolder relative to their own location.

## Components

### 1. Preprocessing helper — `src/parsers/parseMarkdown.ts`

A small helper runs once on the raw markdown string before any parsing:

```ts
function replaceLocalImages(md: string): string {
  return md.replace(/^:::(.+)$/gm, (_, name) => `![${name}](/quiz-images/${name})`);
}
```

This transforms `:::diagram.png` into `![diagram.png](/quiz-images/diagram.png)`, which react-markdown then renders as a standard `<img>` tag. Called at the top of `parseMarkdown()` before the line-by-line parse loop.

### 2. Static file route — `cli.ts`

A second middleware is added to the `quizme-api` Vite plugin alongside the existing `/api/quiz` handler:

```
GET /quiz-images/:filename
→ reads <quiz-dir>/images/<filename>
```

Where `<quiz-dir>` is `path.dirname(quizPath)`. The route:
- Extracts the filename from the URL
- Resolves the full path: `path.join(quizDir, "images", filename)`
- Guards against path traversal by verifying the resolved path starts with `path.join(quizDir, "images")`
- Sets `Content-Type` based on file extension: `png` → `image/png`, `jpg`/`jpeg` → `image/jpeg`, `gif` → `image/gif`, `svg` → `image/svg+xml`, `webp` → `image/webp`
- Returns 404 if the file doesn't exist or the extension is unrecognised

## What Does Not Change

- `Markdown.tsx` — unchanged; `<img>` tags render natively via react-markdown
- Web images (`https://...`) — browser fetches directly, no server involvement
- JSON quiz format — no changes (already doesn't support `:::` syntax)
- All other parser logic — preprocessing runs before the parse loop, no interference

## File Locations

| File | Change |
|------|--------|
| `src/parsers/parseMarkdown.ts` | Add `replaceLocalImages()` helper; call at top of `parseMarkdown()` |
| `cli.ts` | Add `/quiz-images/*` middleware in `configureServer` |
| `docs/quiz-format.md` | Document the `:::filename.png` syntax and `images/` folder convention |
| `~/.claude/skills/make-quiz/SKILL.md` | Add `:::filename.png` to element reference table and add Images section |

## Verification

1. Create `.quizme/images/test.png` next to a test quiz
2. Add `:::test.png` to a question in the quiz
3. Run `quizme <quiz-file>` — the image should render in the browser
4. Add `![web image](https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png)` — should also render
5. Attempt path traversal: `:::../secret.txt` — should return 404, not serve the file
