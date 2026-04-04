# Image Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable quiz markdown to embed local images via `:::filename.png` syntax (served from `images/` folder next to the quiz file) and web images via standard `![alt](https://...)` markdown.

**Architecture:** A preprocessing step in `parseMarkdown.ts` replaces `:::filename.png` lines with standard markdown image syntax (`![filename.png](/quiz-images/filename.png)`) before parsing. A new `/quiz-images/*` middleware in `cli.ts` serves files from `<quiz-dir>/images/` with path traversal protection. Web URLs pass through unchanged — the browser fetches them directly.

**Tech Stack:** Bun, Node.js `node:path` + `node:fs`, Vite middleware (connect-style), react-markdown (unchanged).

---

## File Map

| File | Change |
|------|--------|
| `src/parsers/parseMarkdown.ts` | Add `replaceLocalImages()` helper; call at top of `parseMarkdown()` |
| `src/parsers/parseMarkdown.test.ts` | New — Bun tests for image preprocessing |
| `cli.ts` | Add `dirname`, `sep` imports; add `/quiz-images/*` middleware in `configureServer` |
| `docs/quiz-creation/quiz-format.md` | Add Images section documenting `:::` syntax |

---

## Task 1: Add `replaceLocalImages` to the parser

**Files:**
- Create: `src/parsers/parseMarkdown.test.ts`
- Modify: `src/parsers/parseMarkdown.ts`

- [ ] **Step 1: Create the test file**

Create `src/parsers/parseMarkdown.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { parseMarkdown } from "./parseMarkdown";
import type { InfoPage, SingleChoiceQuestion } from "../types/quiz";

describe("parseMarkdown — local image syntax", () => {
  it("replaces :::filename.png with a markdown image inside a body block", () => {
    const input = `---
title: Test
---

## [info] Look at this
:::
:::diagram.png
:::
`;
    const quiz = parseMarkdown(input);
    const info = quiz.questions[0] as InfoPage;
    expect(info.content).toBe("![diagram.png](/quiz-images/diagram.png)");
  });

  it("replaces :::filename inside a question body block", () => {
    const input = `---
title: Test
---

## [single] What does this show?
:::
:::circuit.png
:::
- Option A *
- Option B
`;
    const quiz = parseMarkdown(input);
    const q = quiz.questions[0] as SingleChoiceQuestion;
    expect(q.question).toContain("![circuit.png](/quiz-images/circuit.png)");
  });

  it("does not replace ::: group body delimiters (empty :::)", () => {
    const input = `---
title: Test
---

## [single] Plain question with body block
:::
Some body text only
:::
- Yes *
- No
`;
    // Should parse without throwing — ::: delimiters are untouched
    const quiz = parseMarkdown(input);
    expect(quiz.questions).toHaveLength(1);
    const q = quiz.questions[0] as SingleChoiceQuestion;
    expect(q.question).toContain("Some body text only");
  });

  it("does not affect web image URLs", () => {
    const input = `---
title: Test
---

## [info] Web image
:::
![alt text](https://example.com/photo.png)
:::
`;
    const quiz = parseMarkdown(input);
    const info = quiz.questions[0] as InfoPage;
    expect(info.content).toContain("https://example.com/photo.png");
    expect(info.content).not.toContain("/quiz-images/");
  });
});
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
cd /home/eastill/projects/quizme
bun test src/parsers/parseMarkdown.test.ts
```

Expected: all 4 tests FAIL (first test will produce `"diagram.png"` as content, not the image tag — `replaceLocalImages` doesn't exist yet).

- [ ] **Step 3: Add `replaceLocalImages` and call it in `parseMarkdown`**

In `src/parsers/parseMarkdown.ts`, add this function immediately before the `export function parseMarkdown` line:

```ts
function replaceLocalImages(content: string): string {
  return content.replace(/^:::(.+)$/gm, (_, filename) => `![${filename}](/quiz-images/${filename})`);
}
```

Then update the first two lines of `parseMarkdown()`:

```ts
export function parseMarkdown(content: string): Quiz {
  const processed = replaceLocalImages(content);
  const { frontmatter, body } = extractFrontmatter(processed);
```

(Everything else in the function body stays unchanged — just `content` → `processed` on that second line, and `body.split("\n")` remains using `body` from the destructure.)

- [ ] **Step 4: Run the tests — verify they pass**

```bash
bun test src/parsers/parseMarkdown.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/parsers/parseMarkdown.ts src/parsers/parseMarkdown.test.ts
git commit -m "feat: preprocess :::filename.png image syntax in markdown parser"
```

---

## Task 2: Add `/quiz-images/*` route to the dev server

**Files:**
- Modify: `cli.ts`

- [ ] **Step 1: Update imports at top of `cli.ts`**

The current import line is:
```ts
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
```

Replace with:
```ts
import { existsSync } from "node:fs";
import { resolve, join, dirname, sep } from "node:path";
```

- [ ] **Step 2: Add the image middleware inside `configureServer`**

The current `configureServer` block is:

```ts
configureServer(server) {
  server.middlewares.use("/api/quiz", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(quizData));
  });
},
```

Replace it with:

```ts
configureServer(server) {
  server.middlewares.use("/api/quiz", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(quizData));
  });

  const quizDir = dirname(quizPath);
  const imagesRoot = join(quizDir, "images");
  const MIME: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  server.middlewares.use("/quiz-images", async (req, res) => {
    // req.url has the prefix stripped, e.g. "/diagram.png"
    const filename = req.url?.replace(/^\//, "") ?? "";
    if (!filename) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const imagePath = resolve(join(imagesRoot, filename));

    // Path traversal guard
    if (!imagePath.startsWith(imagesRoot + sep)) {
      res.statusCode = 403;
      res.end();
      return;
    }

    if (!existsSync(imagePath)) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME[ext];
    if (!contentType) {
      res.statusCode = 415;
      res.end();
      return;
    }

    res.setHeader("Content-Type", contentType);
    const buf = await Bun.file(imagePath).arrayBuffer();
    res.end(Buffer.from(buf));
  });
},
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 4: Smoke test — create a test image and quiz**

```bash
mkdir -p /home/eastill/projects/quizme/.quizme/images
# Download a small test PNG (1x1 pixel red PNG, base64-decoded)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > /home/eastill/projects/quizme/.quizme/images/test.png
```

Then create `.quizme/image-test.quiz.md`:

```markdown
---
title: Image Test
---

## [info] Image display test
:::
:::test.png
:::
```

Run `quizme .quizme/image-test.quiz.md` and open the browser. The info page should show a small red square. Check the browser network tab — `GET /quiz-images/test.png` should return `200` with `Content-Type: image/png`.

- [ ] **Step 5: Verify path traversal is blocked**

With the server running, in another terminal:

```bash
curl -v http://localhost:3000/quiz-images/../cli.ts
```

Expected: `403 Forbidden` or `404 Not Found` (the file doesn't exist in the images dir; even if it did, the traversal guard fires first).

- [ ] **Step 6: Commit**

```bash
git add cli.ts
git commit -m "feat: serve local quiz images from /quiz-images/* route"
```

---

## Task 3: Update quiz-format docs

**Files:**
- Modify: `docs/quiz-creation/quiz-format.md`

- [ ] **Step 1: Add image row to the element reference table**

Find this line in `docs/quiz-creation/quiz-format.md` (currently line 66):

```
| Explanation | `> text` (multiline: each line starts with `> `) |
```

Add a row immediately after it:

```
| Explanation | `> text` (multiline: each line starts with `> `) |
| Local image | `:::filename.png` on its own line inside a `:::` body block — loads from `images/` folder next to the quiz file |
```

- [ ] **Step 2: Add an Images section after the "Extended body blocks" section**

Find this block in `docs/quiz-creation/quiz-format.md` (currently around line 88):

```
The `:::` content is appended to the heading text. Code fences inside are handled correctly.

### Complete markdown example
```

Insert a new `### Images` section between them:

````markdown
The `:::` content is appended to the heading text. Code fences inside are handled correctly.

### Images

Two ways to include images in quiz content:

```markdown
# Local image — place the file in images/ next to the quiz file
:::diagram.png

# Web image — standard markdown, fetched directly by the browser
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
````

- [ ] **Step 3: Update the "Markdown and Math" section to mention images**

Find this line in `docs/quiz-creation/quiz-format.md` (around line 221):

```
- Standard markdown: bold, italic, code, headings, lists, links, images, tables, blockquotes
```

Replace with:

```
- Standard markdown: bold, italic, code, headings, lists, links, tables, blockquotes
- **Local images:** `:::filename.png` inside a `:::` block — see [Images](#images) section above
- **Web images:** `![alt](https://...)` — standard markdown, fetched directly by the browser
```

- [ ] **Step 4: Commit**

```bash
git add docs/quiz-creation/quiz-format.md
git commit -m "docs: document :::filename.png image syntax and images/ folder convention"
```

---

## Verification

End-to-end test after all tasks:

1. Create `.quizme/images/` with a real image file (e.g. a PNG downloaded from the web)
2. Create a quiz that uses `:::your-image.png` inside a `:::` body block
3. Run `quizme .quizme/your-quiz.quiz.md` — image renders in the browser ✓
4. Add `![web](https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png)` to a question — renders ✓
5. Try `:::../cli.ts` in a quiz — server returns 403 or 404 ✓
6. `bun test src/parsers/parseMarkdown.test.ts` — all 4 tests pass ✓
7. `bun run typecheck` — no errors ✓
