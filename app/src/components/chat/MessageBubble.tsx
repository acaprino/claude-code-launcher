import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

/** Build a syntax theme from CSS custom properties (read at render time). */
function getAnvilTheme(): Record<string, React.CSSProperties> {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    'pre[class*="language-"]': { background: v("--crust"), margin: 0, padding: 0 },
    'code[class*="language-"]': { color: v("--text"), background: "none" },
    comment: { color: v("--overlay0") },
    prolog: { color: v("--overlay0") },
    keyword: { color: v("--accent") },
    "attr-name": { color: v("--accent") },
    selector: { color: v("--accent") },
    builtin: { color: v("--accent") },
    operator: { color: v("--text-dim") },
    string: { color: v("--green") },
    "attr-value": { color: v("--green") },
    char: { color: v("--green") },
    number: { color: v("--yellow") },
    boolean: { color: v("--yellow") },
    constant: { color: v("--yellow") },
    function: { color: v("--accent") },
    "class-name": { color: v("--yellow") },
    punctuation: { color: v("--text-dim") },
    tag: { color: v("--red") },
    deleted: { color: v("--red") },
    inserted: { color: v("--green") },
  };
}

let cachedTheme: Record<string, React.CSSProperties> | null = null;
function anvilTheme(): Record<string, React.CSSProperties> {
  if (!cachedTheme) cachedTheme = getAnvilTheme();
  return cachedTheme;
}
// Invalidate on theme change (CSS variable mutation)
const observer = typeof MutationObserver !== "undefined"
  ? new MutationObserver(() => { cachedTheme = null; })
  : null;
observer?.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });

interface Props {
  text: string;
  streaming?: boolean;
}

/** Safe link component — blocks javascript:, data:, vbscript: URLs */
const SafeLink = ({ href, children }: { href?: string; children?: React.ReactNode }) => {
  const safe = href && /^https?:\/\/|^#|^mailto:/i.test(href);
  return safe
    ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    : <span>{children}</span>;
};

/** Code block with syntax highlighting + copy button */
const CodeBlock = ({ className, children }: { className?: string; children?: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");
  const lineCount = code.split("\n").length;

  if (!match) {
    // Inline code
    return <code className={className}>{children}</code>;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{match[1]}</span>
        <button className="code-block-copy" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={match[1]}
        style={anvilTheme()}
        showLineNumbers={lineCount > 5}
        customStyle={{
          margin: 0,
          padding: "var(--space-2) var(--space-3)",
          borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
          fontSize: "var(--text-sm)",
        }}
        lineNumberStyle={{ opacity: 0.3, minWidth: "2em" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default memo(function MessageBubble({ text, streaming }: Props) {
  return (
    <div className={`msg-bubble${streaming ? " streaming" : ""}`}>
      {streaming ? (
        // Raw text during streaming — avoids O(n^2) markdown re-parsing per chunk
        <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: SafeLink,
            code: CodeBlock as never,
          }}
        >
          {text}
        </ReactMarkdown>
      )}
    </div>
  );
});
