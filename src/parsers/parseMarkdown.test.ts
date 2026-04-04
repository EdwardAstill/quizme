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

  it("trims trailing whitespace from the filename", () => {
    const input = `---
title: Test
---

## [info] Trailing space
:::
:::diagram.png
:::
`;
    const quiz = parseMarkdown(input);
    const info = quiz.questions[0] as InfoPage;
    // Should produce a clean URL without trailing space
    expect(info.content).toBe("![diagram.png](/quiz-images/diagram.png)");
  });
});
