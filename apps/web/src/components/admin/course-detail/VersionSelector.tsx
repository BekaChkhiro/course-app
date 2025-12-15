'use client';

import { ChevronDown, Check, Star, FileEdit, Globe } from 'lucide-react';

interface Version {
  id: string;
  version: number;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  isActive: boolean;
  _count: { chapters: number };
}

interface VersionSelectorProps {
  courseId: string;
  versions: Version[];
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
}

export default function VersionSelector({
  courseId,
  versions,
  selectedVersionId,
  onVersionChange
}: VersionSelectorProps) {
  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  if (versions.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ვერსიები არ არის. გადადით &quot;ვერსიები&quot; ტაბზე პირველი ვერსიის შესაქმნელად.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium">ვერსია:</span>
      </div>

      <div className="relative flex-1 max-w-xs">
        <select
          value={selectedVersionId}
          onChange={(e) => onVersionChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              v{version.version} - {version.title} ({version._count.chapters} თავი)
              {version.isActive ? ' (აქტიური)' : ''}
              {version.status === 'DRAFT' ? ' [Draft]' : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Status badges */}
      {selectedVersion && (
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={`
              inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full
              ${selectedVersion.status === 'PUBLISHED'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
              }
            `}
          >
            {selectedVersion.status === 'PUBLISHED' ? (
              <>
                <Globe className="w-3 h-3" />
                Published
              </>
            ) : (
              <>
                <FileEdit className="w-3 h-3" />
                Draft
              </>
            )}
          </span>

          {/* Active badge */}
          {selectedVersion.isActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
              <Star className="w-3 h-3" />
              აქტიური
            </span>
          )}
        </div>
      )}
    </div>
  );
}
