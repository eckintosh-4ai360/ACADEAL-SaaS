"use client";

import { useEffect, useState } from "react";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Code,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EmailTemplateEditorProps = {
  value: string;
  onChange: (value: string) => void;
  variables?: string[];
  placeholder?: string;
};

export function EmailTemplateEditor({
  value,
  onChange,
  variables = [],
  placeholder = "Start writing your email template...",
}: EmailTemplateEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "email-editor__content min-h-[300px] px-4 py-3 text-sm leading-relaxed text-foreground focus:outline-none",
      },
    },
    onUpdate: ({ editor: tiptapEditor }) => {
      onChange(tiptapEditor.getHTML());
    },
  });

  //* Update editor content when value prop changes (only if it's different to avoid loops)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const insertVariable = (variable: string) => {
    editor.chain().focus().insertContent(variable).run();
  };

  const toolbarButtonClass = (active: boolean) =>
    cn(
      "h-8 w-8 rounded-md border border-border/60 bg-background p-0 text-muted-foreground transition-colors hover:text-foreground",
      active && "border-primary bg-primary/10 text-primary"
    );

  return (
    <div className="flex flex-col w-full border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Bold"
          className={toolbarButtonClass(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Italic"
          className={toolbarButtonClass(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Underline"
          className={toolbarButtonClass(editor.isActive("underline"))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Strikethrough"
          className={toolbarButtonClass(editor.isActive("strike"))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-8 w-px bg-border/80" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Heading 1"
          className={toolbarButtonClass(editor.isActive("heading", { level: 1 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Heading 2"
          className={toolbarButtonClass(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-8 w-px bg-border/80" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Align left"
          className={toolbarButtonClass(editor.isActive({ textAlign: "left" }))}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Align center"
          className={toolbarButtonClass(editor.isActive({ textAlign: "center" }))}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Align right"
          className={toolbarButtonClass(editor.isActive({ textAlign: "right" }))}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-8 w-px bg-border/80" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Bullet list"
          className={toolbarButtonClass(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Numbered list"
          className={toolbarButtonClass(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Block quote"
          className={toolbarButtonClass(editor.isActive("blockquote"))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-8 w-px bg-border/80" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Undo"
          className={toolbarButtonClass(false)}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Redo"
          className={toolbarButtonClass(false)}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        {variables.length > 0 && (
          <>
            <div className="mx-1 h-8 w-px bg-border/80" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Code className="h-4 w-4" />
                  <span>Insert Variable</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                {variables.map((v) => (
                  <DropdownMenuItem
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="font-mono text-xs cursor-pointer"
                  >
                    {v}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Editor Content */}
      <div className="bg-background min-h-[300px]">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .email-editor__content {
          outline: none !important;
        }
        .email-editor__content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          float: left;
          height: 0;
          pointer-events: none;
        }
        .email-editor__content ul,
        .email-editor__content ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .email-editor__content ul {
          list-style-type: disc;
        }
        .email-editor__content ol {
          list-style-type: decimal;
        }
        .email-editor__content blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1rem;
          font-style: italic;
          margin: 0.5rem 0;
        }
        .email-editor__content h1 {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 1rem 0 0.5rem;
        }
        .email-editor__content h2 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.2;
          margin: 0.75rem 0 0.4rem;
        }
      `}</style>
    </div>
  );
}
