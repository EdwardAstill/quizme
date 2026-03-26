import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/**
 * Renders markdown with math support ($..$ inline, $$..$$ display).
 * Use `inline` prop when embedding inside headings, buttons, etc. to
 * unwrap the outer <p> tag that ReactMarkdown produces.
 */
export function Markdown({
  children,
  inline,
}: {
  children: string;
  inline?: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={
        inline
          ? { p: ({ children }) => <span>{children}</span> }
          : undefined
      }
    >
      {children}
    </ReactMarkdown>
  );
}
