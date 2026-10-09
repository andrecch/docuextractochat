import { createElement, useMemo } from "react";
import type { ReactNode } from "react";

const allowed = new Set([
  "p",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "hr",
  "sup",
  "sub",
]);
const discard = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "img",
  "svg",
  "math",
  "form",
  "input",
  "video",
  "audio",
  "link",
  "meta",
]);
export function SafeDocx({ html }: { html: string }) {
  const content = useMemo(() => {
    // A template is inert. Rebuild only text/table elements; no source attributes survive.
    const template = document.createElement("template");
    template.innerHTML = html;
    let budget = 5000;
    let textBudget = 1024 * 1024;
    let limited = false;
    function convert(node: Node, key: string, depth = 0): ReactNode {
      if (--budget < 0 || depth > 50) {
        limited = true;
        return null;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        const visible = text.slice(0, Math.min(textBudget, 32 * 1024));
        if (text.length > visible.length) limited = true;
        textBudget = Math.max(0, textBudget - visible.length);
        return visible;
      }
      if (!(node instanceof Element)) return null;
      const tag = node.tagName.toLowerCase();
      if (discard.has(tag)) return null;
      const children = Array.from(node.childNodes, (child, index) =>
        convert(child, `${key}-${index}`, depth + 1),
      );
      return allowed.has(tag)
        ? createElement(
            tag,
            { key },
            tag === "br" || tag === "hr" ? undefined : children,
          )
        : children;
    }
    const nodes = Array.from(template.content.childNodes, (node, index) =>
      convert(node, String(index)),
    );
    return { nodes, limited };
  }, [html]);
  return (
    <div className="docx-content" data-testid="docx-preview">
      {content.limited && (
        <p className="partial-note" role="status">
          Vista parcial: este documento supera el límite de visualización.
          Descarga el original para revisar todo su contenido.
        </p>
      )}
      {content.nodes}
    </div>
  );
}
