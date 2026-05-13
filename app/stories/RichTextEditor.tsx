'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`px-2.5 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-[#5A7A8C] text-white'
          : 'text-[#4A5568] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-[#2D3436] dark:hover:text-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5 self-center" />
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold (⌘B)"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic (⌘I)"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <s>S</s>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Heading"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Subheading"
      >
        H3
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Blockquote"
      >
        ❝
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet list"
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Numbered list"
      >
        1. List
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        active={false}
        title="Divider line"
      >
        —
      </ToolbarButton>
    </div>
  )
}

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: Props) {
  const lastContentRef = useRef(content)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Share your story, insight, or message of hope…',
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate({ editor }) {
      const html = editor.getHTML()
      lastContentRef.current = html
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none px-4 py-4 min-h-[400px]',
      },
    },
  })

  // Sync when content is loaded from outside (edit page async load)
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-[#5A7A8C]/30 focus-within:border-[#5A7A8C] transition">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
