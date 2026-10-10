"use client";

import { useDeferredValue, useEffect, useEffectEvent, useState, useTransition } from "react";
import type { Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BadgeCheck,
  Bold,
  Eraser,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Save,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  PenTool,
  ImageIcon,
} from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveUserNote } from "@/lib/userNoteActions";
import type { SerializedUserNoteRecord } from "@/lib/userNotes";
import { cn } from "@/lib/utils";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { ImageAttachmentModal } from "@/components/ImageAttachmentModal";

type UserNotesEditorProps = {
  initialNotes: SerializedUserNoteRecord[];
  userName: string;
  userRoleLabel: string;
};

type ToolbarState = {
  paragraph: boolean;
  heading1: boolean;
  heading2: boolean;
  heading3: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  alignment: "left" | "center" | "right" | "justify";
};

const EMPTY_TOOLBAR_STATE: ToolbarState = {
  paragraph: true,
  heading1: false,
  heading2: false,
  heading3: false,
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  unorderedList: false,
  orderedList: false,
  blockquote: false,
  alignment: "left",
};

function normalizeHtml(value: string): string {
  return value.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}

function getPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|blockquote|h1|h2|h3)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSavedAt(value: string | null): string {
  if (!value) return "Not saved yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not saved yet";

  return date.toLocaleString();
}

function getToolbarState(editor: Editor | null): ToolbarState {
  if (!editor) return EMPTY_TOOLBAR_STATE;

  return {
    paragraph: editor.isActive("paragraph"),
    heading1: editor.isActive("heading", { level: 1 }),
    heading2: editor.isActive("heading", { level: 2 }),
    heading3: editor.isActive("heading", { level: 3 }),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strikeThrough: editor.isActive("strike"),
    unorderedList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    blockquote: editor.isActive("blockquote"),
    alignment: editor.isActive({ textAlign: "center" })
      ? "center"
      : editor.isActive({ textAlign: "right" })
        ? "right"
        : editor.isActive({ textAlign: "justify" })
          ? "justify"
          : "left",
  };
}

function getInitialDraft(notes: SerializedUserNoteRecord[]) {
  const firstNote = notes[0];
  return {
    noteId: firstNote?.id ?? null,
    title: firstNote?.title ?? "",
    contentHtml: firstNote?.contentHtml ?? "<p></p>",
    updatedAt: firstNote?.updatedAt ?? null,
  };
}

export function UserNotesEditor({
  initialNotes,
  userName,
  userRoleLabel,
}: UserNotesEditorProps) {
  const initialDraft = getInitialDraft(initialNotes);
  const [notes, setNotes] = useState(initialNotes);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(initialDraft.noteId);
  const [title, setTitle] = useState(initialDraft.title);
  const [html, setHtml] = useState(initialDraft.contentHtml);
  const deferredHtml = useDeferredValue(html);
  const [savedTitle, setSavedTitle] = useState(initialDraft.title);
  const [savedHtml, setSavedHtml] = useState(initialDraft.contentHtml);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialDraft.updatedAt);
  const [toolbarState, setToolbarState] = useState<ToolbarState>(EMPTY_TOOLBAR_STATE);
  const [isPending, startTransition] = useTransition();
  const [isDrawingCanvasOpen, setIsDrawingCanvasOpen] = useState(false);
  const [isImageAttachmentOpen, setIsImageAttachmentOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder:
          "Start writing here. Use the toolbar for formatting, lists, and alignment.",
      }),
    ],
    content: initialDraft.contentHtml,
    editorProps: {
      attributes: {
        class:
          "notes-editor__content min-h-[440px] px-5 py-4 text-sm leading-7 text-foreground focus:outline-none",
      },
    },
    onCreate: ({ editor: tiptapEditor }) => {
      setHtml(tiptapEditor.getHTML());
      setToolbarState(getToolbarState(tiptapEditor));
    },
    onUpdate: ({ editor: tiptapEditor }) => {
      setHtml(tiptapEditor.getHTML());
      setToolbarState(getToolbarState(tiptapEditor));
    },
    onSelectionUpdate: ({ editor: tiptapEditor }) => {
      setToolbarState(getToolbarState(tiptapEditor));
    },
  });

  const plainText = getPlainText(deferredHtml);
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const characterCount = plainText.length;
  const editorEmpty = characterCount === 0;
  const hasUnsavedChanges =
    normalizeHtml(html) !== normalizeHtml(savedHtml) || title.trim() !== savedTitle.trim();

  const replaceEditorHtml = (value: string) => {
    if (!editor) return;

    editor.commands.setContent(value, { emitUpdate: false });
    setToolbarState(getToolbarState(editor));
  };

  const loadDraft = (note: SerializedUserNoteRecord | null) => {
    const nextTitle = note?.title ?? "";
    const nextHtml = note?.contentHtml ?? "<p></p>";
    const nextUpdatedAt = note?.updatedAt ?? null;

    setCurrentNoteId(note?.id ?? null);
    setTitle(nextTitle);
    setHtml(nextHtml);
    setSavedTitle(nextTitle);
    setSavedHtml(nextHtml);
    setLastSavedAt(nextUpdatedAt);
    setToolbarState(EMPTY_TOOLBAR_STATE);
    replaceEditorHtml(nextHtml);
  };

  const persistNote = (noteId: number | null, nextTitle: string, nextHtml: string) => {
    startTransition(async () => {
      const result = await saveUserNote({
        noteId,
        title: nextTitle,
        contentHtml: nextHtml,
      });

      if (!result.success || !result.note) {
        toast.error(result.message);
        return;
      }

      const savedNote = result.note;

      setNotes((previousNotes) => {
        const remainingNotes = previousNotes.filter((note) => note.id !== savedNote.id);
        return [savedNote, ...remainingNotes];
      });

      setCurrentNoteId(savedNote.id);
      setTitle(savedNote.title);
      setHtml(savedNote.contentHtml);
      setSavedTitle(savedNote.title);
      setSavedHtml(savedNote.contentHtml);
      setLastSavedAt(savedNote.updatedAt);
      replaceEditorHtml(savedNote.contentHtml);
      toast.success(result.message);
    });
  };

  const saveCurrentNote = () => {
    const currentHtml = editor?.getHTML() ?? html;
    persistNote(currentNoteId, title, currentHtml);
  };

  const handleSaveShortcut = useEffectEvent(() => {
    const currentHtml = editor?.getHTML() ?? html;
    persistNote(currentNoteId, title, currentHtml);
  });

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSaveShortcut();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  const runCommand = (command: (editorInstance: Editor) => void) => {
    if (!editor) return;

    command(editor);
    setHtml(editor.getHTML());
    setToolbarState(getToolbarState(editor));
  };

  const handleDrawingSave = (imageData: string) => {
    if (!editor) return;

    editor.chain().focus().setImage({ src: imageData }).run();
    setHtml(editor.getHTML());
    setIsDrawingCanvasOpen(false);
  };

  const handleImageInsert = (imageData: string, fileName: string) => {
    if (!editor) return;

    editor.chain().focus().setImage({ src: imageData }).run();
    setHtml(editor.getHTML());
    setIsImageAttachmentOpen(false);
  };

  const toolbarButtonClass = (active: boolean) =>
    cn(
      "h-9 w-9 rounded-lg border border-border/60 bg-background p-0 text-muted-foreground transition-colors hover:text-foreground",
      active && "border-primary bg-primary/10 text-primary"
    );

  const confirmLeaveDraft = () => {
    if (!hasUnsavedChanges) return true;

    return window.confirm("You have unsaved changes. Open another note anyway?");
  };

  const handleOpenNote = (note: SerializedUserNoteRecord) => {
    if (note.id === currentNoteId) return;
    if (!confirmLeaveDraft()) return;
    loadDraft(note);
  };

  const handleNewNote = () => {
    if (currentNoteId === null && !title.trim() && editorEmpty) return;
    if (!confirmLeaveDraft()) return;
    loadDraft(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="border-border/50">
        <CardHeader className="gap-4 border-b border-border/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl font-black tracking-tight">Personal Notes</CardTitle>
               
              </div>
              <CardDescription>
                Private workspace for {userName}. Saved notes stay attached to this {userRoleLabel}
                {" "}account.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/60 px-3 py-1">
                {wordCount} word{wordCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-border/60 px-3 py-1">
                {characterCount} character{characterCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-border/60 px-3 py-1">
                {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Note title"
              className="h-11 text-base font-semibold"
              maxLength={120}
            />
            <Button
              type="button"
              onClick={saveCurrentNote}
              disabled={isPending}
              className="h-11 gap-2 lg:min-w-36"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Note
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
            <Button
              type="button"
              variant="ghost"
              title="Paragraph"
              className={cn("h-9 gap-2 rounded-lg border border-border/60 px-3 text-xs font-semibold", toolbarState.paragraph && "border-primary bg-primary/10 text-primary")}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().setParagraph().run();
              })}
            >
              <Pilcrow className="h-4 w-4" />
              Paragraph
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Heading 1"
              className={toolbarButtonClass(toolbarState.heading1)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleHeading({ level: 1 }).run();
              })}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Heading 2"
              className={toolbarButtonClass(toolbarState.heading2)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleHeading({ level: 2 }).run();
              })}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Heading 3"
              className={toolbarButtonClass(toolbarState.heading3)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleHeading({ level: 3 }).run();
              })}
            >
              <Heading3 className="h-4 w-4" />
            </Button>

            <div className="mx-1 h-9 w-px bg-border/80" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Bold"
              className={toolbarButtonClass(toolbarState.bold)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleBold().run();
              })}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Italic"
              className={toolbarButtonClass(toolbarState.italic)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleItalic().run();
              })}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Underline"
              className={toolbarButtonClass(toolbarState.underline)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleUnderline().run();
              })}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Strikethrough"
              className={toolbarButtonClass(toolbarState.strikeThrough)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleStrike().run();
              })}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>

            <div className="mx-1 h-9 w-px bg-border/80" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Align left"
              className={toolbarButtonClass(toolbarState.alignment === "left")}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().setTextAlign("left").run();
              })}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Align center"
              className={toolbarButtonClass(toolbarState.alignment === "center")}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().setTextAlign("center").run();
              })}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Align right"
              className={toolbarButtonClass(toolbarState.alignment === "right")}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().setTextAlign("right").run();
              })}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Justify"
              className={toolbarButtonClass(toolbarState.alignment === "justify")}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().setTextAlign("justify").run();
              })}
            >
              <AlignJustify className="h-4 w-4" />
            </Button>

            <div className="mx-1 h-9 w-px bg-border/80" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Bullet list"
              className={toolbarButtonClass(toolbarState.unorderedList)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleBulletList().run();
              })}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Numbered list"
              className={toolbarButtonClass(toolbarState.orderedList)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleOrderedList().run();
              })}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Block quote"
              className={toolbarButtonClass(toolbarState.blockquote)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().toggleBlockquote().run();
              })}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Horizontal rule"
              className={toolbarButtonClass(false)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().setHorizontalRule().run();
              })}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="mx-1 h-9 w-px bg-border/80" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Clear formatting"
              className={toolbarButtonClass(false)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().unsetAllMarks().clearNodes().run();
              })}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Undo"
              className={toolbarButtonClass(false)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().undo().run();
              })}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Redo"
              className={toolbarButtonClass(false)}
              onClick={() => runCommand((editorInstance) => {
                editorInstance.chain().focus().redo().run();
              })}
            >
              <Redo2 className="h-4 w-4" />
            </Button>

            <div className="mx-1 h-9 w-px bg-border/80" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Insert drawing"
              className={toolbarButtonClass(false)}
              onClick={() => setIsDrawingCanvasOpen(true)}
            >
              <PenTool className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Attach image"
              className={toolbarButtonClass(false)}
              onClick={() => setIsImageAttachmentOpen(true)}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="notes-editor-shell rounded-2xl border border-border/60 bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
            <EditorContent editor={editor} />
          </div>

          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>TipTap features: paragraph styles, headings, lists, quotes, alignment, drawing, images, undo, redo.</span>
            <span>Last saved: {formatSavedAt(lastSavedAt)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black tracking-tight">Recent Notes</CardTitle>
              <CardDescription>
                Saved notes appear here. Click any note to reopen it.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleNewNote}>
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-6">
          {notes.length > 0 ? (
            notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => handleOpenNote(note)}
                className={cn(
                  "w-full rounded-2xl border border-border/60 bg-background/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
                  note.id === currentNoteId && "border-primary/50 bg-primary/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {note.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {note.contentText || "No preview available"}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {formatSavedAt(note.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-center">
              <p className="text-sm font-medium text-foreground">No saved notes yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start writing in the editor and click Save Note to add it here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        :global(.notes-editor__content) {
          min-height: 440px;
        }

        :global(.notes-editor__content p.is-editor-empty:first-child::before) {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          float: left;
          height: 0;
          pointer-events: none;
        }

        :global(.notes-editor__content blockquote) {
          border-left: 4px solid rgba(59, 130, 246, 0.35);
          margin: 1rem 0;
          padding-left: 1rem;
          color: hsl(var(--muted-foreground));
        }

        :global(.notes-editor__content ul),
        :global(.notes-editor__content ol) {
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }

        :global(.notes-editor__content h1),
        :global(.notes-editor__content h2),
        :global(.notes-editor__content h3) {
          font-weight: 800;
          line-height: 1.2;
          margin: 1rem 0 0.5rem;
        }

        :global(.notes-editor__content h1) {
          font-size: 1.5rem;
        }

        :global(.notes-editor__content h2) {
          font-size: 1.25rem;
        }

        :global(.notes-editor__content h3) {
          font-size: 1.125rem;
        }

        :global(.notes-editor__content img) {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.75rem 0;
        }
      `}</style>

      {isDrawingCanvasOpen && (
        <DrawingCanvas
          onSave={handleDrawingSave}
          onClose={() => setIsDrawingCanvasOpen(false)}
        />
      )}

      {isImageAttachmentOpen && (
        <ImageAttachmentModal
          onImageSelect={handleImageInsert}
          onClose={() => setIsImageAttachmentOpen(false)}
        />
      )}
    </div>
  );
}
