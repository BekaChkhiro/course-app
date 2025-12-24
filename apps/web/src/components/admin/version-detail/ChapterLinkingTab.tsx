'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Unlink, Wand2, Check, AlertCircle, BookOpen, ArrowRight } from 'lucide-react';
import adminApi from '@/lib/api/adminApi';
import toast from 'react-hot-toast';

interface Chapter {
  id: string;
  title: string;
  order: number;
  originalChapterId: string | null;
  originalChapter: {
    id: string;
    title: string;
  } | null;
}

interface PreviousVersionChapter {
  id: string;
  title: string;
  order: number;
}

interface ChapterLinkingTabProps {
  versionId: string;
  versionNumber: number;
}

export function ChapterLinkingTab({ versionId, versionNumber }: ChapterLinkingTabProps) {
  const queryClient = useQueryClient();
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Fetch chapters with links
  const { data, isLoading, error } = useQuery({
    queryKey: ['version-chapter-links', versionId],
    queryFn: async () => {
      const { data } = await adminApi.get(`/chapters/version/${versionId}/links`);
      return data.data as {
        chapters: Chapter[];
        previousVersionChapters: PreviousVersionChapter[];
      };
    },
  });

  // Auto-link mutation
  const autoLinkMutation = useMutation({
    mutationFn: async () => {
      const { data } = await adminApi.post(`/chapters/version/${versionId}/auto-link`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['version-chapter-links', versionId] });
      toast.success(`${data.data?.linkedCount || 0} თავი ავტომატურად დაკავშირდა`);
    },
    onError: () => {
      toast.error('ავტომატური დაკავშირება ვერ მოხერხდა');
    },
  });

  // Link chapter mutation
  const linkMutation = useMutation({
    mutationFn: async ({ chapterId, originalChapterId }: { chapterId: string; originalChapterId: string | null }) => {
      await adminApi.put(`/chapters/${chapterId}/link`, { originalChapterId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version-chapter-links', versionId] });
      setSelectedChapterId(null);
      toast.success('თავი წარმატებით დაკავშირდა');
    },
    onError: () => {
      toast.error('დაკავშირება ვერ მოხერხდა');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        მონაცემების ჩატვირთვა ვერ მოხერხდა
      </div>
    );
  }

  const chapters = data?.chapters || [];
  const previousVersionChapters = data?.previousVersionChapters || [];
  const linkedCount = chapters.filter((c) => c.originalChapterId).length;
  const unlinkedCount = chapters.length - linkedCount;

  if (versionNumber === 1) {
    return (
      <div className="p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">პირველი ვერსია</h3>
        <p className="text-gray-500">
          ეს კურსის პირველი ვერსიაა. თავების დაკავშირება შესაძლებელია მხოლოდ მეორე ვერსიიდან.
        </p>
      </div>
    );
  }

  if (previousVersionChapters.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">წინა ვერსია ვერ მოიძებნა</h3>
        <p className="text-gray-500">
          წინა ვერსიას არ აქვს თავები ან ვერ მოიძებნა.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">თავების დაკავშირება</h3>
          <p className="text-sm text-gray-500 mt-1">
            დააკავშირეთ ამ ვერსიის თავები წინა ვერსიის თავებთან პროგრესის გადატანისთვის
          </p>
        </div>
        <button
          onClick={() => autoLinkMutation.mutate()}
          disabled={autoLinkMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {autoLinkMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              მუშავდება...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              ავტომატური დაკავშირება
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">{linkedCount}</span>
          </div>
          <p className="text-sm text-green-700 mt-1">დაკავშირებული თავი</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Unlink className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">{unlinkedCount}</span>
          </div>
          <p className="text-sm text-amber-700 mt-1">დაუკავშირებელი თავი</p>
        </div>
      </div>

      {/* Chapters List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ახალი ვერსიის თავი
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">

              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                წინა ვერსიის თავი
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                მოქმედება
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chapters.map((chapter) => (
              <tr key={chapter.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {chapter.order}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{chapter.title}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <ArrowRight className={`w-4 h-4 ${chapter.originalChapterId ? 'text-green-600' : 'text-gray-300'}`} />
                </td>
                <td className="px-4 py-4">
                  {selectedChapterId === chapter.id ? (
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                      value={chapter.originalChapterId || ''}
                      onChange={(e) => {
                        linkMutation.mutate({
                          chapterId: chapter.id,
                          originalChapterId: e.target.value || null,
                        });
                      }}
                      autoFocus
                      onBlur={() => setSelectedChapterId(null)}
                    >
                      <option value="">— არ დააკავშირო —</option>
                      {previousVersionChapters.map((prevChapter) => (
                        <option key={prevChapter.id} value={prevChapter.id}>
                          {prevChapter.order}. {prevChapter.title}
                        </option>
                      ))}
                    </select>
                  ) : chapter.originalChapter ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">
                        {chapter.originalChapter.title}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">არ არის დაკავშირებული</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    onClick={() => setSelectedChapterId(chapter.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    {chapter.originalChapterId ? (
                      <>
                        <Link2 className="w-4 h-4" />
                        შეცვლა
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        დაკავშირება
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">როგორ მუშაობს პროგრესის გადატანა?</p>
            <p className="mt-1 text-blue-700">
              როდესაც სტუდენტი განაახლებს კურსს ახალ ვერსიაზე, მათი პროგრესი ავტომატურად გადავა
              დაკავშირებულ თავებზე. მაგალითად, თუ „შესავალი" თავი v1-დან დაკავშირებულია
              „შესავალი" თავთან v2-ში, სტუდენტის პროგრესი შენარჩუნდება.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChapterLinkingTab;
