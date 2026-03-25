import { useMemo } from "react";
import katex from "katex";

/**
 * Renders text with inline `$...$` and display `$$...$$` LaTeX math.
 * Non-math text is rendered as-is. Falls back to raw text on parse errors.
 */
export function Latex({ children }: { children: string }) {
  const parts = useMemo(() => parseSegments(children), [children]);

  return (
    <span>
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <span
            key={i}
            dangerouslySetInnerHTML={{
              __html: renderKatex(part.value, part.type === "display"),
            }}
          />
        )
      )}
    </span>
  );
}

type Segment =
  | { type: "text"; value: string }
  | { type: "display"; value: string }
  | { type: "inline"; value: string };

function parseSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  // Match $$...$$ (display) and $...$ (inline), non-greedy
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: input.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "display", value: match[1].trim() });
    } else if (match[2] !== undefined) {
      segments.push({ type: "inline", value: match[2].trim() });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ type: "text", value: input.slice(lastIndex) });
  }

  return segments;
}

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return tex;
  }
}
