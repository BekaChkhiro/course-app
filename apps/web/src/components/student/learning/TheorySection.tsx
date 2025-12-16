'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { studentApiClient, Note } from '@/lib/api/studentApi';

interface TheorySectionProps {
  content: string | null;
  chapterId: string;
  notes: Note[];
  onNoteCreated: () => void;
}

export default function TheorySection({
  content,
  chapterId,
  notes,
  onNoteCreated,
}: TheorySectionProps) {
  const [selectedText, setSelectedText] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [highlightColor, setHighlightColor] = useState('yellow');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const colors = [
    { name: 'yellow', class: 'bg-yellow-200' },
    { name: 'green', class: 'bg-green-200' },
    { name: 'blue', class: 'bg-blue-200' },
    { name: 'pink', class: 'bg-pink-200' },
    { name: 'purple', class: 'bg-accent-200' },
  ];

  // Save note mutation
  const saveNoteMutation = useMutation({
    mutationFn: studentApiClient.saveNote,
    onSuccess: () => {
      setShowNoteForm(false);
      setNoteContent('');
      setSelectedText('');
      setEditingNoteId(null);
      onNoteCreated();
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: studentApiClient.deleteNote,
    onSuccess: onNoteCreated,
  });

  // Handle text selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const container = contentRef.current;
        if (container && container.contains(range.commonAncestorContainer)) {
          setSelectedText(selection.toString().trim());
        }
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    return () => document.removeEventListener('mouseup', handleSelectionChange);
  }, []);

  const handleAddNote = () => {
    setShowNoteForm(true);
    setEditingNoteId(null);
    setNoteContent('');
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteContent(note.content);
    setHighlightColor(note.color || 'yellow');
    setSelectedText(note.highlightedText || '');
    setShowNoteForm(true);
  };

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;

    saveNoteMutation.mutate({
      chapterId,
      content: noteContent,
      highlightedText: selectedText || undefined,
      color: highlightColor,
      noteId: editingNoteId || undefined,
    });
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const handleCancelNote = () => {
    setShowNoteForm(false);
    setNoteContent('');
    setSelectedText('');
    setEditingNoteId(null);
  };

  if (!content) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">No theory content available for this chapter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Toolbar */}
        <div className="sticky top-0 bg-gray-50 -mx-6 px-6 py-3 mb-6 border-b border-gray-200 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            {selectedText && (
              <button
                onClick={handleAddNote}
                className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Add Note
              </button>
            )}
            <button
              onClick={() => setShowNotesPanel(!showNotesPanel)}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg transition-colors text-sm ${
                showNotesPanel
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes ({notes.length})
            </button>
          </div>

          {selectedText && (
            <p className="text-sm text-gray-500">
              Selected: "{selectedText.slice(0, 50)}
              {selectedText.length > 50 ? '...' : ''}"
            </p>
          )}
        </div>

        {/* Note Form */}
        {showNoteForm && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-3">
              {editingNoteId ? 'Edit Note' : 'Add Note'}
            </h4>

            {selectedText && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Selected text:</p>
                <p className="text-sm text-gray-700 italic">"{selectedText}"</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Note
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={4}
                placeholder="Write your note here..."
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Highlight Color
              </label>
              <div className="flex space-x-2">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setHighlightColor(color.name)}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      highlightColor === color.name
                        ? 'ring-2 ring-offset-2 ring-gray-400'
                        : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelNote}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!noteContent.trim() || saveNoteMutation.isPending}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saveNoteMutation.isPending ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        {/* Theory Content */}
        <div
          ref={contentRef}
          className="prose prose-indigo max-w-none prose-headings:font-semibold prose-p:text-gray-600 prose-a:text-primary-900 prose-img:rounded-lg prose-pre:bg-gray-900"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      {/* Notes Panel */}
      {showNotesPanel && (
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notes</h3>
              <button
                onClick={() => setShowNotesPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-sm text-gray-500">No notes yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Select text to add a note
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notes.map((note) => {
                const colorClass = colors.find((c) => c.name === note.color)?.class || 'bg-yellow-200';
                return (
                  <div key={note.id} className="p-4 hover:bg-gray-50 transition-colors">
                    {note.highlightedText && (
                      <div className={`mb-2 px-2 py-1 ${colorClass} rounded text-sm italic`}>
                        "{note.highlightedText.slice(0, 100)}
                        {note.highlightedText.length > 100 ? '...' : ''}"
                      </div>
                    )}
                    <p className="text-sm text-gray-700">{note.content}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="text-xs text-primary-900 hover:text-primary-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
