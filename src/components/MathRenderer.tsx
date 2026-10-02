import React, { useMemo } from "react";
import katex from "katex";

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = "",
  inline = false
}) => {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    // Normalize Windows line endings and trim excess empty lines
    const normalizedContent = content.replace(/\r\n/g, "\n").trim();

    // Regex matches $$...$$ or $...$
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    const parts = normalizedContent.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Display math ($$...$$)
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: true,
            throwOnError: false,
            output: "htmlAndMathml"
          });
          return (
            <div
              key={index}
              className="my-2 overflow-x-auto overflow-y-hidden text-center text-slate-100"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index} className="font-mono text-amber-300">{part}</span>;
        }
      }

      // Inline math ($...$)
      if (part.startsWith("$") && part.endsWith("$")) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
            output: "htmlAndMathml"
          });
          return (
            <span
              key={index}
              className="mx-0.5 inline-block text-slate-100 align-baseline whitespace-nowrap"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index} className="font-mono text-amber-300">{part}</span>;
        }
      }

      // Regular text: split by actual deliberate linebreaks only
      // If the part is just whitespace/newline between math, don't generate huge gaps
      const lines = part.split("\n");
      return (
        <span key={index} className="inline">
          {lines.map((line, lIdx) => (
            <React.Fragment key={lIdx}>
              {line}
              {lIdx < lines.length - 1 && <br className="my-0.5" />}
            </React.Fragment>
          ))}
        </span>
      );
    });
  }, [content]);

  return (
    <div
      className={`leading-relaxed break-normal text-pretty ${className} ${
        inline ? "inline" : "block"
      }`}
    >
      {renderedElements}
    </div>
  );
};
