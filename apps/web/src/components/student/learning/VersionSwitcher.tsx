'use client';

import { useState } from 'react';
import { ChevronDown, Check, ArrowUp, BookOpen, Clock } from 'lucide-react';

interface AccessibleVersion {
  id: string;
  version: number;
  title: string | null;
  chaptersCount: number;
  isCurrent: boolean;
  progressPercentage?: number;
}

interface VersionSwitcherProps {
  versions: AccessibleVersion[];
  currentVersionId: string;
  onVersionChange: (versionId: string) => void;
  className?: string;
}

export function VersionSwitcher({
  versions,
  currentVersionId,
  onVersionChange,
  className = '',
}: VersionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentVersion = versions.find((v) => v.id === currentVersionId);

  if (versions.length <= 1) {
    return null;
  }

  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <BookOpen className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-700">
          ვერსია {currentVersion?.version}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase">
                ხელმისაწვდომი ვერსიები
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {sortedVersions.map((version) => {
                const isSelected = version.id === currentVersionId;
                const isNewest = version === sortedVersions[0];

                return (
                  <button
                    key={version.id}
                    onClick={() => {
                      onVersionChange(version.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="text-sm font-medium">v{version.version}</span>
                      )}
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isSelected ? 'text-primary-700' : 'text-gray-900'
                          }`}
                        >
                          ვერსია {version.version}
                        </span>
                        {isNewest && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                            უახლესი
                          </span>
                        )}
                        {version.isCurrent && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            აქტიური
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {version.chaptersCount} თავი
                        </span>
                        {version.progressPercentage !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {version.progressPercentage}% დასრულებული
                          </span>
                        )}
                      </div>

                      {version.title && (
                        <p className="mt-1 text-xs text-gray-500 truncate">
                          {version.title}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default VersionSwitcher;
