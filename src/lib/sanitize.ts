"use client";

import DOMPurify from "dompurify";

/**
 * Sanitasi HTML — WAJIB sebelum merender konten dari RichTextEditor
 * (mencegah XSS). Semua preview konten harus lewat sini.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3",
      "ol", "ul", "li", "blockquote", "pre", "code", "a", "span",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "style"],
  });
}
