import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders assistant text as Markdown with GitHub-flavored extensions
 * (tables, strikethrough, autolinks). User messages remain plain text
 * to avoid surprises with their input.
 */
export function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="u-link text-foreground font-medium">{children}</a>
        ),
        code: ({ inline, children }) =>
          inline ? (
            <code className="px-1 py-0.5 bg-foreground/10 rounded text-[12px] font-mono">{children}</code>
          ) : (
            <pre className="p-3 bg-foreground/5 border border-border rounded-md overflow-x-auto my-2 text-[12px] font-mono leading-relaxed">
              <code>{children}</code>
            </pre>
          ),
        h1: ({ children }) => <h3 className="font-display font-medium text-base mt-3 mb-2 first:mt-0">{children}</h3>,
        h2: ({ children }) => <h4 className="font-display font-medium text-base mt-3 mb-2 first:mt-0">{children}</h4>,
        h3: ({ children }) => <h5 className="font-display font-medium text-sm mt-3 mb-1 first:mt-0">{children}</h5>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border pl-3 my-2 text-foreground/80">{children}</blockquote>
        ),
        hr: () => <hr className="my-3 border-border" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
