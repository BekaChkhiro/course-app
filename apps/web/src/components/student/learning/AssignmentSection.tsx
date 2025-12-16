'use client';

import { useState } from 'react';

interface AssignmentSectionProps {
  assignmentFile: string | null;
  answerFile: string | null;
}

export default function AssignmentSection({
  assignmentFile,
  answerFile,
}: AssignmentSectionProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Get file name from URL
  const getFileName = (url: string | null): string => {
    if (!url) return 'Unknown file';
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  };

  // Get file extension
  const getFileExtension = (url: string | null): string => {
    if (!url) return '';
    const parts = url.split('.');
    return parts[parts.length - 1].toUpperCase();
  };

  // Get file icon based on extension
  const getFileIcon = (url: string | null) => {
    const ext = getFileExtension(url).toLowerCase();
    if (['pdf'].includes(ext)) {
      return (
        <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM9.498 13.75c.32-.27.792-.41 1.502-.41.227 0 .454.016.679.048a2.49 2.49 0 00-.238-.73c-.21-.38-.517-.584-.916-.584-.352 0-.632.12-.84.36a1.52 1.52 0 00-.296.71c-.02.109-.024.224-.024.348 0 .09.012.176.033.259zm1.502.75c-.712 0-1.234-.093-1.568-.28-.334-.186-.5-.454-.5-.804 0-.35.166-.618.5-.804.334-.187.856-.28 1.568-.28.712 0 1.234.093 1.568.28.334.186.5.454.5.804 0 .35-.166.618-.5.804-.334.187-.856.28-1.568.28z" />
          <path d="M13 9V3.5L18.5 9H13z" />
        </svg>
      );
    }
    if (['doc', 'docx'].includes(ext)) {
      return (
        <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6zm8-9H8v1h6v-1zm0 2H8v1h6v-1zm-2 2H8v1h4v-1z" />
        </svg>
      );
    }
    if (['xls', 'xlsx'].includes(ext)) {
      return (
        <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
          <path d="M8 11h2v2H8zm0 3h2v2H8zm3-3h2v2h-2zm0 3h2v2h-2zm3-3h2v2h-2zm0 3h2v2h-2z" />
        </svg>
      );
    }
    if (['zip', 'rar', '7z'].includes(ext)) {
      return (
        <svg className="w-10 h-10 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h4v2h2V4h1v5h5v11H6zm4 0h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v4z" />
        </svg>
      );
    }
    return (
      <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
      </svg>
    );
  };

  if (!assignmentFile && !answerFile) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">No assignment available for this chapter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Assignment Download Section */}
        {assignmentFile && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-primary-900 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="font-semibold text-gray-900">Assignment</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">{getFileIcon(assignmentFile)}</div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {getFileName(assignmentFile)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getFileExtension(assignmentFile)} File
                  </p>
                </div>
                <a
                  href={assignmentFile}
                  download
                  className="inline-flex items-center px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-amber-800">Instructions</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Download the assignment file and complete the tasks. You can view the answer
                      after attempting to solve it on your own.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Answer Section */}
        {answerFile && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900">Answer</h3>
              </div>
            </div>
            <div className="p-6">
              {!showAnswer ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Answer Hidden</h4>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Try solving the assignment on your own first. Click below to reveal the answer when you're ready.
                  </p>
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Reveal Answer
                  </button>
                </div>
              ) : (
                <div className="animate-fadeIn">
                  <div className="flex items-center mb-6">
                    <div className="flex-shrink-0">{getFileIcon(answerFile)}</div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {getFileName(answerFile)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getFileExtension(answerFile)} File
                      </p>
                    </div>
                    <a
                      href={answerFile}
                      download
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Answer
                    </a>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowAnswer(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Hide Answer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion Checkbox */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="ml-3">
              <span className="text-sm font-medium text-gray-900">
                I have completed this assignment
              </span>
              <span className="block text-sm text-gray-500">
                Check this box to track your progress
              </span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
