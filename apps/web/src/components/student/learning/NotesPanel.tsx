'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApiClient, Note } from '@/lib/api/studentApi';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  chapterId: string | null;
}

export default function NotesPanel({
  isOpen,
  onClose,
  courseId,
  chapterId,
}: NotesPanelProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'chapter' | 'course'>('chapter');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);

  // Fetch course notes
  const { data: courseNotesData, isLoading: isLoadingCourseNotes } = useQuery({
    queryKey: ['courseNotes', courseId],
    queryFn: () => studentApiClient.getCourseNotes(courseId),
    enabled: isOpen && viewMode === 'course',
    staleTime: 30000,
  });

  // Fetch chapter notes (from chapter data)
  const { data: chapterData, isLoading: isLoadingChapterNotes } = useQuery({
    queryKey: ['chapterForLearning', chapterId],
    queryFn: () => studentApiClient.getChapterForLearning(chapterId!),
    enabled: isOpen && viewMode === 'chapter' && !!chapterId,
    staleTime: 30000,
  });

  // Save note mutation
  const saveNoteMutation = useMutation({
    mutationFn: studentApiClient.saveNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapterForLearning', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['courseNotes', courseId] });
      setEditingNote(null);
      setShowNewNoteForm(false);
      setNewNoteContent('');
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: studentApiClient.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapterForLearning', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['courseNotes', courseId] });
    },
  });

  const notes = viewMode === 'course'
    ? courseNotesData?.data.notes || []
    : chapterData?.data.notes || [];

  const isLoading = viewMode === 'course' ? isLoadingCourseNotes : isLoadingChapterNotes;

  const handleSaveNote = () => {
    if (editingNote) {
      saveNoteMutation.mutate({
        noteId: editingNote.id,
        chapterId: editingNote.chapterId,
        content: editingNote.content,
        color: editingNote.color || undefined,
      });
    } else if (newNoteContent.trim() && chapterId) {
      saveNoteMutation.mutate({
        chapterId,
        content: newNoteContent,
      });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const colors = [
    { name: 'yellow', class: 'bg-yellow-200', border: 'border-yellow-300' },
    { name: 'green', class: 'bg-green-200', border: 'border-green-300' },
    { name: 'blue', class: 'bg-blue-200', border: 'border-blue-300' },
    { name: 'pink', class: 'bg-pink-200', border: 'border-pink-300' },
    { name: 'purple', class: 'bg-purple-200', border: 'border-purple-300' },
  ];

  const getColorClass = (colorName: string | null) => {
    return colors.find(c => c.name === colorName) || colors[0];
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-14 bottom-0 right-0 w-full sm:w-96 bg-white border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* View Toggle */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chapter')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'chapter'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                This Chapter
              </button>
              <button
                onClick={() => setViewMode('course')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'course'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Notes
              </button>
            </div>
          </div>

          {/* Add Note Button */}
          {viewMode === 'chapter' && chapterId && !showNewNoteForm && (
            <div className="px-4 py-3">
              <button
                onClick={() => setShowNewNoteForm(true)}
                className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Note
              </button>
            </div>
          )}

          {/* New Note Form */}
          {showNewNoteForm && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                rows={4}
                placeholder="Write your note..."
                autoFocus
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => {
                    setShowNewNoteForm(false);
                    setNewNoteContent('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!newNoteContent.trim() || saveNoteMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No notes yet</h3>
                <p className="text-sm text-gray-500">
                  {viewMode === 'chapter'
                    ? 'Add notes to help remember key concepts from this chapter'
                    : 'Your notes from all chapters will appear here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notes.map((note) => {
                  const color = getColorClass(note.color);
                  const isEditing = editingNote?.id === note.id;

                  return (
                    <div key={note.id} className="p-4 hover:bg-gray-50 transition-colors">
                      {/* Chapter indicator for course view */}
                      {viewMode === 'course' && note.chapter && (
                        <div className="text-xs text-indigo-600 font-medium mb-2">
                          Chapter {note.chapter.order}: {note.chapter.title}
                        </div>
                      )}

                      {/* Highlighted text */}
                      {note.highlightedText && (
                        <div className={`mb-2 px-2 py-1.5 ${color.class} rounded border ${color.border} text-sm italic`}>
                          "{note.highlightedText.slice(0, 150)}
                          {note.highlightedText.length > 150 ? '...' : ''}"
                        </div>
                      )}

                      {/* Note content */}
                      {isEditing ? (
                        <div>
                          <textarea
                            value={editingNote.content}
                            onChange={(e) =>
                              setEditingNote({ ...editingNote, content: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            rows={4}
                            autoFocus
                          />
                          <div className="flex justify-end space-x-2 mt-2">
                            <button
                              onClick={() => setEditingNote(null)}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveNote}
                              disabled={saveNoteMutation.isPending}
                              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      )}

                      {/* Footer */}
                      {!isEditing && (
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400">
                            {formatDate(note.createdAt)}
                          </span>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => setEditingNote(note)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-xs text-red-600 hover:text-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
              {notes.length > 0 && (
                <button className="text-indigo-600 hover:text-indigo-700 transition-colors">
                  Export as PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
