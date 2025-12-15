'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Unlink,
  Image as ImageIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Palette,
  Table as TableIcon,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  Minus as HorizontalRule,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

// Color palette for text and highlight
const TEXT_COLORS = [
  { name: 'Default', color: null },
  { name: 'Gray', color: '#6B7280' },
  { name: 'Red', color: '#DC2626' },
  { name: 'Orange', color: '#EA580C' },
  { name: 'Yellow', color: '#CA8A04' },
  { name: 'Green', color: '#16A34A' },
  { name: 'Blue', color: '#2563EB' },
  { name: 'Purple', color: '#9333EA' },
  { name: 'Pink', color: '#DB2777' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', color: null },
  { name: 'Yellow', color: '#FEF08A' },
  { name: 'Green', color: '#BBF7D0' },
  { name: 'Blue', color: '#BFDBFE' },
  { name: 'Purple', color: '#DDD6FE' },
  { name: 'Pink', color: '#FBCFE8' },
  { name: 'Orange', color: '#FED7AA' },
  { name: 'Gray', color: '#E5E7EB' },
];

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'დაიწყეთ წერა...',
  className,
  editable = true
}: RichTextEditorProps) {
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 bg-gray-100 p-2 font-semibold text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:pointer-events-none before:h-0',
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose-base max-w-none focus:outline-none',
          'min-h-[300px] p-4',
          // Custom prose styles
          'prose-headings:font-bold prose-headings:text-gray-900',
          'prose-h1:text-3xl prose-h1:mt-6 prose-h1:mb-4',
          'prose-h2:text-2xl prose-h2:mt-5 prose-h2:mb-3',
          'prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2',
          'prose-h4:text-lg prose-h4:mt-3 prose-h4:mb-2',
          'prose-p:my-2 prose-p:leading-relaxed',
          'prose-ul:my-2 prose-ol:my-2',
          'prose-li:my-1',
          'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600',
          'prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
          'prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4',
          'prose-img:rounded-lg prose-img:shadow-md',
          'prose-a:text-blue-600 prose-a:underline',
          'prose-table:border-collapse prose-table:w-full',
          'prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-2',
          'prose-td:border prose-td:border-gray-300 prose-td:p-2'
        )
      },
      handlePaste: () => {
        // Let TipTap handle paste with its default behavior
        // This preserves formatting from rich text sources
        return false;
      },
    }
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('შეიყვანეთ სურათის URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback((rows: number, cols: number) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableDropdown(false);
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn('border rounded-lg bg-white', className)}>
        <div className="h-12 border-b bg-gray-50 animate-pulse" />
        <div className="min-h-[300px] p-4 animate-pulse bg-gray-50" />
      </div>
    );
  }

  // Get current heading level for dropdown display
  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    if (editor.isActive('heading', { level: 4 })) return 'H4';
    return 'პარაგრაფი';
  };

  const MenuButton = ({
    onClick,
    isActive,
    disabled,
    children,
    title
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded hover:bg-gray-200 transition-colors',
        isActive && 'bg-indigo-100 text-indigo-700',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
      )}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => (
    <div className="w-px h-6 bg-gray-300 mx-1" />
  );

  return (
    <div className={cn('border rounded-lg bg-white overflow-hidden', className)}>
      {editable && (
        <div className="border-b bg-gray-50 p-2">
          {/* Row 1: Main formatting */}
          <div className="flex flex-wrap items-center gap-0.5">
            {/* Heading Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
                className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-200 transition-colors text-sm min-w-[100px] justify-between"
              >
                <span className="flex items-center gap-1">
                  <Type className="w-4 h-4" />
                  {getCurrentHeading()}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showHeadingDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setParagraph().run();
                      setShowHeadingDropdown(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2',
                      editor.isActive('paragraph') && 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <Pilcrow className="w-4 h-4" />
                    <span>პარაგრაფი</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 1 }).run();
                      setShowHeadingDropdown(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2',
                      editor.isActive('heading', { level: 1 }) && 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <Heading1 className="w-4 h-4" />
                    <span className="text-xl font-bold">სათაური 1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 2 }).run();
                      setShowHeadingDropdown(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2',
                      editor.isActive('heading', { level: 2 }) && 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <Heading2 className="w-4 h-4" />
                    <span className="text-lg font-bold">სათაური 2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 3 }).run();
                      setShowHeadingDropdown(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2',
                      editor.isActive('heading', { level: 3 }) && 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <Heading3 className="w-4 h-4" />
                    <span className="text-base font-bold">სათაური 3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 4 }).run();
                      setShowHeadingDropdown(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2',
                      editor.isActive('heading', { level: 4 }) && 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <Heading4 className="w-4 h-4" />
                    <span className="text-sm font-bold">სათაური 4</span>
                  </button>
                </div>
              )}
            </div>

            <ToolbarDivider />

            {/* Text formatting */}
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </MenuButton>

            <ToolbarDivider />

            {/* Text Color */}
            <div className="relative">
              <MenuButton
                onClick={() => setShowColorDropdown(!showColorDropdown)}
                isActive={showColorDropdown}
                title="ტექსტის ფერი"
              >
                <Palette className="w-4 h-4" />
              </MenuButton>
              {showColorDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-2">
                  <div className="grid grid-cols-5 gap-1">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          if (c.color) {
                            editor.chain().focus().setColor(c.color).run();
                          } else {
                            editor.chain().focus().unsetColor().run();
                          }
                          setShowColorDropdown(false);
                        }}
                        className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.color || '#000' }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Highlight */}
            <div className="relative">
              <MenuButton
                onClick={() => setShowHighlightDropdown(!showHighlightDropdown)}
                isActive={editor.isActive('highlight') || showHighlightDropdown}
                title="ჰაილაითი"
              >
                <Highlighter className="w-4 h-4" />
              </MenuButton>
              {showHighlightDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-2">
                  <div className="grid grid-cols-4 gap-1">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          if (c.color) {
                            editor.chain().focus().toggleHighlight({ color: c.color }).run();
                          } else {
                            editor.chain().focus().unsetHighlight().run();
                          }
                          setShowHighlightDropdown(false);
                        }}
                        className={cn(
                          'w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform',
                          !c.color && 'bg-white relative after:content-[""] after:absolute after:inset-0 after:bg-[linear-gradient(45deg,transparent_45%,red_45%,red_55%,transparent_55%)]'
                        )}
                        style={{ backgroundColor: c.color || undefined }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <ToolbarDivider />

            {/* Alignment */}
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="მარცხნივ"
            >
              <AlignLeft className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="ცენტრში"
            >
              <AlignCenter className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="მარჯვნივ"
            >
              <AlignRight className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              isActive={editor.isActive({ textAlign: 'justify' })}
              title="გასწორებული"
            >
              <AlignJustify className="w-4 h-4" />
            </MenuButton>

            <ToolbarDivider />

            {/* Lists */}
            <MenuButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </MenuButton>

            <ToolbarDivider />

            {/* Quote & Code */}
            <MenuButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="ციტატა"
            >
              <Quote className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="კოდის ბლოკი"
            >
              <Code className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="ჰორიზონტალური ხაზი"
            >
              <HorizontalRule className="w-4 h-4" />
            </MenuButton>

            <ToolbarDivider />

            {/* Table */}
            <div className="relative">
              <MenuButton
                onClick={() => setShowTableDropdown(!showTableDropdown)}
                isActive={editor.isActive('table') || showTableDropdown}
                title="ცხრილი"
              >
                <TableIcon className="w-4 h-4" />
              </MenuButton>
              {showTableDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-3 min-w-[200px]">
                  <p className="text-xs text-gray-500 mb-2">ცხრილის ჩასმა</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => insertTable(2, 2)}
                      className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                      2×2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTable(3, 3)}
                      className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                      3×3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTable(4, 4)}
                      className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                      4×4
                    </button>
                  </div>
                  {editor.isActive('table') && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-gray-500 mb-2">ცხრილის რედაქტირება</p>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => editor.chain().focus().addRowBefore().run()}
                            className="w-full px-2 py-1 text-xs text-left hover:bg-gray-100 rounded flex items-center gap-2"
                          >
                            <Plus className="w-3 h-3" /> რიგი ზემოთ
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                            className="w-full px-2 py-1 text-xs text-left hover:bg-gray-100 rounded flex items-center gap-2"
                          >
                            <Plus className="w-3 h-3" /> რიგი ქვემოთ
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.chain().focus().addColumnBefore().run()}
                            className="w-full px-2 py-1 text-xs text-left hover:bg-gray-100 rounded flex items-center gap-2"
                          >
                            <Plus className="w-3 h-3" /> სვეტი მარცხნივ
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                            className="w-full px-2 py-1 text-xs text-left hover:bg-gray-100 rounded flex items-center gap-2"
                          >
                            <Plus className="w-3 h-3" /> სვეტი მარჯვნივ
                          </button>
                          <div className="border-t my-1" />
                          <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteRow().run()}
                            className="w-full px-2 py-1 text-xs text-left hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
                          >
                            <Minus className="w-3 h-3" /> რიგის წაშლა
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                            className="w-full px-2 py-1 text-xs text-left hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
                          >
                            <Minus className="w-3 h-3" /> სვეტის წაშლა
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              editor.chain().focus().deleteTable().run();
                              setShowTableDropdown(false);
                            }}
                            className="w-full px-2 py-1 text-xs text-left hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" /> ცხრილის წაშლა
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <ToolbarDivider />

            {/* Link */}
            <div className="relative">
              {editor.isActive('link') ? (
                <MenuButton
                  onClick={removeLink}
                  isActive={true}
                  title="ლინკის წაშლა"
                >
                  <Unlink className="w-4 h-4" />
                </MenuButton>
              ) : (
                <MenuButton
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  isActive={showLinkInput}
                  title="ლინკის დამატება"
                >
                  <Link2 className="w-4 h-4" />
                </MenuButton>
              )}
              {showLinkInput && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-2 flex gap-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="px-2 py-1 border rounded text-sm w-48"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setLink();
                      }
                      if (e.key === 'Escape') {
                        setShowLinkInput(false);
                        setLinkUrl('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={setLink}
                    className="px-2 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                  >
                    დამატება
                  </button>
                </div>
              )}
            </div>

            {/* Image */}
            <MenuButton onClick={addImage} title="სურათის დამატება">
              <ImageIcon className="w-4 h-4" />
            </MenuButton>

            <ToolbarDivider />

            {/* Undo/Redo */}
            <MenuButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </MenuButton>
          </div>
        </div>
      )}

      {/* Close dropdowns on click outside */}
      {(showHeadingDropdown || showColorDropdown || showHighlightDropdown || showTableDropdown || showLinkInput) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowHeadingDropdown(false);
            setShowColorDropdown(false);
            setShowHighlightDropdown(false);
            setShowTableDropdown(false);
            setShowLinkInput(false);
          }}
        />
      )}

      <EditorContent editor={editor} className="min-h-[300px]" />
    </div>
  );
}
