import { useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import type { Note } from "../types";
import "./NoteView.css";

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface SelectionRange {
  start: number;
  end: number;
}

type TransformationResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

type PreviewMode = "rendered" | "raw";

interface NoteViewProps {
  note: Note | null;
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
}

function NoteView({
  note,
  title,
  content,
  onTitleChange,
  onContentChange,
  onSave,
}: NoteViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("rendered");

  const previewHtml = useMemo(() => {
    if (!content.trim()) {
      return "";
    }

    const rendered = marked.parse(content);
    const html = typeof rendered === "string" ? rendered : "";
    return DOMPurify.sanitize(html);
  }, [content]);

  const applyTransformation = (
    transformer: (value: string, selection: SelectionRange) => TransformationResult
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selection: SelectionRange = {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? textarea.selectionStart ?? 0,
    };

    const { value, selectionStart, selectionEnd } = transformer(content, selection);

    onContentChange(value);

    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      const clampedStart = Math.max(0, Math.min(value.length, selectionStart));
      const clampedEnd = Math.max(0, Math.min(value.length, selectionEnd));
      target.focus();
      target.setSelectionRange(clampedStart, clampedEnd);
    });
  };

  const wrapSelection = (
    prefix: string,
    suffix: string,
    { placeholder = "", collapseToEnd = false }: { placeholder?: string; collapseToEnd?: boolean } = {}
  ) => {
    applyTransformation((value, { start, end }) => {
      const hasSelection = start !== end;
      const selected = hasSelection ? value.slice(start, end) : placeholder;
      const insertion = `${prefix}${selected}${suffix}`;
      const nextValue = value.slice(0, start) + insertion + value.slice(end);

      if (collapseToEnd) {
        const caret = start + insertion.length;
        return {
          value: nextValue,
          selectionStart: caret,
          selectionEnd: caret,
        };
      }

      const selectionStart = start + prefix.length;
      const selectionEnd = selectionStart + selected.length;

      return {
        value: nextValue,
        selectionStart,
        selectionEnd,
      };
    });
  };

  const prefixLines = (
    prefix: string,
    { placeholder = "", transformLine }: { placeholder?: string; transformLine?: (line: string, index: number) => string } = {}
  ) => {
    applyTransformation((value, { start, end }) => {
      if (start === end) {
        const insertion = `${prefix}${placeholder}`;
        const nextValue = value.slice(0, start) + insertion + value.slice(end);
        const cursorStart = start + prefix.length;
        const cursorEnd = cursorStart + placeholder.length;
        return {
          value: nextValue,
          selectionStart: cursorStart,
          selectionEnd: cursorEnd,
        };
      }

      let lineStart = value.lastIndexOf("\n", start - 1);
      lineStart = lineStart === -1 ? 0 : lineStart + 1;
      let lineEnd = value.indexOf("\n", end);
      lineEnd = lineEnd === -1 ? value.length : lineEnd;

      const block = value.slice(lineStart, lineEnd);
      const lines = block.split("\n");

      const formatted = lines
        .map((line, index) => {
          const transformedLine = transformLine ? transformLine(line, index) : line;
          return transformedLine.startsWith(prefix) ? transformedLine : `${prefix}${transformedLine}`;
        })
        .join("\n");

      const nextValue = value.slice(0, lineStart) + formatted + value.slice(lineEnd);

      return {
        value: nextValue,
        selectionStart: lineStart,
        selectionEnd: lineStart + formatted.length,
      };
    });
  };

  const insertHeading = (level: number) => {
    const hashes = "#".repeat(Math.min(Math.max(level, 1), 6));
    prefixLines(`${hashes} `, {
      placeholder: `Heading ${level}`,
      transformLine: (line) => line.replace(/^#{1,6}\s*/u, ""),
    });
  };

  const insertOrderedList = () => {
    prefixLines("", {
      placeholder: "1. List item",
      transformLine: (line, index) => {
        const cleaned = line.replace(/^\d+\.\s*/u, "").trimStart();
        return `${index + 1}. ${cleaned}`;
      },
    });
  };

  const insertChecklist = () => {
    prefixLines("- [ ] ", {
      placeholder: "To-do item",
      transformLine: (line) => {
        const cleaned = line.replace(/^(-|\*)\s*\[( |x|X)\]\s*/u, "").replace(/^(-|\*)\s*/u, "");
        return cleaned ? cleaned : "Task";
      },
    });
  };

  const insertHorizontalRule = () => {
    applyTransformation((value, { start, end }) => {
      const insertion = "\n\n---\n\n";
      const nextValue = value.slice(0, start) + insertion + value.slice(end);
      const caret = start + insertion.length;
      return {
        value: nextValue,
        selectionStart: caret,
        selectionEnd: caret,
      };
    });
  };

  const insertLink = () => {
    applyTransformation((value, { start, end }) => {
      const hasSelection = start !== end;
      const label = hasSelection ? value.slice(start, end) : "Link text";
      const urlPlaceholder = "https://";
      const linkSyntax = `[${label}](${urlPlaceholder})`;
      const nextValue = value.slice(0, start) + linkSyntax + value.slice(end);
      const urlStart = start + label.length + 3;
      const urlEnd = urlStart + urlPlaceholder.length;

      return {
        value: nextValue,
        selectionStart: urlStart,
        selectionEnd: urlEnd,
      };
    });
  };

  const insertImage = () => {
    applyTransformation((value, { start, end }) => {
      const hasSelection = start !== end;
      const altText = hasSelection ? value.slice(start, end) : "Alt text";
      const urlPlaceholder = "https://";
      const imageSyntax = `![${altText}](${urlPlaceholder})`;
      const nextValue = value.slice(0, start) + imageSyntax + value.slice(end);
      const urlStart = start + altText.length + 4;
      const urlEnd = urlStart + urlPlaceholder.length;

      return {
        value: nextValue,
        selectionStart: urlStart,
        selectionEnd: urlEnd,
      };
    });
  };

  if (!note) {
    return (
      <div className="note-view note-view--empty">
        <div>
          <h2>No note selected</h2>
          <p>Select a note from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="note-view">
      <div className="note-view__header">
        <button
          type="button"
          className="note-view__save-button"
          onClick={onSave}
        >
          Save
        </button>
      </div>

      <input
        className="note-view__title"
        type="text"
        placeholder="Note title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />

      <div className="note-editor">
        <div className="note-editor__toolbar">
          <div className="note-editor__toolbar-group">
            <button type="button" onClick={() => insertHeading(1)} aria-label="Heading 1">
              H1
            </button>
            <button type="button" onClick={() => insertHeading(2)} aria-label="Heading 2">
              H2
            </button>
            <button type="button" onClick={() => insertHeading(3)} aria-label="Heading 3">
              H3
            </button>
          </div>

          <div className="note-editor__toolbar-group">
            <button type="button" onClick={() => wrapSelection("**", "**", { placeholder: "Bold text" })} aria-label="Bold">
              <strong>B</strong>
            </button>
            <button type="button" onClick={() => wrapSelection("*", "*", { placeholder: "Italic text" })} aria-label="Italic">
              <em>I</em>
            </button>
            <button type="button" onClick={() => wrapSelection("~~", "~~", { placeholder: "Strikethrough" })} aria-label="Strikethrough">
              S
            </button>
            <button type="button" onClick={() => wrapSelection("`", "`", { placeholder: "code" })} aria-label="Inline code">
              `code`
            </button>
          </div>

          <div className="note-editor__toolbar-group">
            <button type="button" onClick={() => wrapSelection("```\n", "\n```", { placeholder: "Code block" })} aria-label="Code block">
              {"</>"}
            </button>
            <button type="button" onClick={() => prefixLines("> ", { placeholder: "Quote", transformLine: (line) => line.replace(/^>\s?/u, "") })} aria-label="Blockquote">
              &gt;
            </button>
            <button type="button" onClick={() => prefixLines("- ", { placeholder: "List item", transformLine: (line) => line.replace(/^(-|\*)\s*/u, "") })} aria-label="Bullet list">
              *
            </button>
            <button type="button" onClick={insertOrderedList} aria-label="Numbered list">
              1.
            </button>
            <button type="button" onClick={insertChecklist} aria-label="Checklist">
              [ ]
            </button>
            <button type="button" onClick={insertHorizontalRule} aria-label="Horizontal rule">
              ---
            </button>
          </div>

          <div className="note-editor__toolbar-group">
            <button type="button" onClick={insertLink} aria-label="Link">
              Link
            </button>
            <button type="button" onClick={insertImage} aria-label="Image">
              Img
            </button>
          </div>
        </div>

        <div className="note-editor__panels">
          <div className="note-editor__input">
            <textarea
              ref={textareaRef}
              className="note-editor__textarea"
              placeholder="Start typing in Markdown..."
              value={content}
              onChange={(event) => onContentChange(event.target.value)}
            />
          </div>

          <div className="note-editor__preview">
            <div className="note-editor__preview-header">
              <span className="note-editor__preview-title">
                {previewMode === "rendered" ? "Preview" : "Raw Markdown"}
              </span>
              <div className="note-editor__preview-mode">
                <button
                  type="button"
                  className={previewMode === "rendered" ? "active" : ""}
                  onClick={() => setPreviewMode("rendered")}
                >
                  Rendered
                </button>
                <button
                  type="button"
                  className={previewMode === "raw" ? "active" : ""}
                  onClick={() => setPreviewMode("raw")}
                >
                  Raw
                </button>
              </div>
            </div>

            <div className="note-editor__preview-body">
              {previewMode === "rendered" ? (
                previewHtml ? (
                  <div
                    className="note-editor__preview-content"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <p className="note-editor__empty-preview">Nothing to preview yet.</p>
                )
              ) : (
                <pre className="note-editor__raw-preview">{content || "Nothing to show yet."}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoteView;
