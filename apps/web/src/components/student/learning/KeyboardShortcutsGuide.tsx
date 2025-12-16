'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

export default function KeyboardShortcutsGuide({
  isOpen,
  onClose,
}: KeyboardShortcutsGuideProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['J'], description: 'Next chapter' },
        { keys: ['K'], description: 'Previous chapter' },
        { keys: ['Ctrl', 'B'], description: 'Toggle sidebar' },
        { keys: ['Esc'], description: 'Close panel/modal' },
      ],
    },
    {
      title: 'Video Player',
      shortcuts: [
        { keys: ['Space'], description: 'Play/Pause' },
        { keys: ['K'], description: 'Play/Pause (alternative)' },
        { keys: ['F'], description: 'Toggle fullscreen' },
        { keys: ['M'], description: 'Mute/Unmute' },
        { keys: ['←'], description: 'Rewind 10 seconds' },
        { keys: ['→'], description: 'Forward 10 seconds' },
        { keys: ['↑'], description: 'Increase volume' },
        { keys: ['↓'], description: 'Decrease volume' },
        { keys: ['B'], description: 'Add bookmark' },
      ],
    },
    {
      title: 'Learning Tools',
      shortcuts: [
        { keys: ['Ctrl', 'N'], description: 'Toggle notes panel' },
        { keys: ['?'], description: 'Show keyboard shortcuts' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
                <p className="text-sm text-gray-500">Navigate faster with these shortcuts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shortcutGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                    {group.title}
                  </h3>
                  <ul className="space-y-2">
                    {group.shortcuts.map((shortcut, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-600">{shortcut.description}</span>
                        <div className="flex items-center space-x-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span key={keyIndex} className="flex items-center">
                              {keyIndex > 0 && (
                                <span className="mx-1 text-gray-400 text-xs">+</span>
                              )}
                              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono text-gray-800 shadow-sm">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">?</kbd> anytime to show this guide
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
