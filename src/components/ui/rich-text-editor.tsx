"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Quill butuh browser (document/window) → dynamic import tanpa SSR
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  ),
});

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Tinggi area editor (px) — default 240, konsisten & rapi */
  minHeight?: number;
  className?: string;
  /** Sembunyikan toolbar (mode read-only/preview) */
  readOnly?: boolean;
}

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ color: [] }, { background: [] }],
  ["blockquote", "code-block"],
  ["link"],
  ["clean"],
];

/**
 * RichTextEditor — editor Quill reusable (WYSIWYG).
 * Dipakai oleh: Knowledge (tambah/edit), dan fitur lain (Todo, jurnal, dll).
 *
 * Output berupa HTML string. Untuk render aman gunakan `sanitizeHtml()`
 * dari `@/lib/sanitize`.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Tulis di sini…",
  minHeight = 240,
  className,
  readOnly = false,
}: RichTextEditorProps) {
  return (
    <div
      className={cn(
        "rich-text-editor",
        readOnly && "rich-text-editor-readonly",
        className
      )}
      style={
        readOnly
          ? undefined
          : ({ "--rte-height": `${minHeight}px` } as React.CSSProperties)
      }
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={
          readOnly
            ? { toolbar: false }
            : { toolbar: TOOLBAR_OPTIONS }
        }
      />
    </div>
  );
}

/** Render konten HTML Quill dengan styling bawaan (dipakai di preview) */
export function QuillContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn("ql-editor", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
