import { prisma } from '../config/database';

interface TransferResult {
  success: boolean;
  transferredCount: number;
  skippedCount: number;
  details: {
    chapterId: string;
    chapterTitle: string;
    status: 'transferred' | 'skipped' | 'no_link';
  }[];
}

interface LinkingResult {
  success: boolean;
  linkedCount: number;
  suggestions: {
    sourceChapterId: string;
    sourceTitle: string;
    targetChapterId: string;
    targetTitle: string;
    similarity: number;
  }[];
}

interface ChapterLinkingSuggestion {
  sourceChapterId: string;
  sourceTitle: string;
  targetChapterId: string;
  targetTitle: string;
  isExactMatch: boolean;
}

export class ProgressTransferService {
  /**
   * Transfer progress from old version to new version based on chapter linking
   */
  static async transferProgress(
    userId: string,
    fromVersionId: string,
    toVersionId: string
  ): Promise<TransferResult> {
    const result: TransferResult = {
      success: true,
      transferredCount: 0,
      skippedCount: 0,
      details: [],
    };

    try {
      // Get all chapters in new version that have originalChapterId set
      const newVersionChapters = await prisma.chapter.findMany({
        where: {
          courseVersionId: toVersionId,
          originalChapterId: { not: null },
        },
        select: {
          id: true,
          title: true,
          originalChapterId: true,
        },
      });

      // Get user's progress for the old version
      const oldProgress = await prisma.progress.findMany({
        where: {
          userId,
          courseVersionId: fromVersionId,
        },
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Create a map of old chapter progress by chapter ID
      const oldProgressMap = new Map(
        oldProgress.map((p) => [p.chapterId, p])
      );

      // Transfer progress for each linked chapter
      for (const newChapter of newVersionChapters) {
        const originalChapterId = newChapter.originalChapterId!;
        const oldChapterProgress = oldProgressMap.get(originalChapterId);

        if (oldChapterProgress) {
          // Check if progress already exists for this chapter
          const existingProgress = await prisma.progress.findUnique({
            where: {
              userId_chapterId: {
                userId,
                chapterId: newChapter.id,
              },
            },
          });

          if (existingProgress) {
            result.skippedCount++;
            result.details.push({
              chapterId: newChapter.id,
              chapterTitle: newChapter.title,
              status: 'skipped',
            });
            continue;
          }

          // Create new progress record with transferred data
          await prisma.progress.create({
            data: {
              userId,
              courseVersionId: toVersionId,
              chapterId: newChapter.id,
              isCompleted: oldChapterProgress.isCompleted,
              lastPosition: oldChapterProgress.lastPosition,
              watchPercentage: oldChapterProgress.watchPercentage,
              totalWatchTime: oldChapterProgress.totalWatchTime,
              canSkipAhead: oldChapterProgress.canSkipAhead,
              firstWatchCompleted: oldChapterProgress.firstWatchCompleted,
            },
          });

          result.transferredCount++;
          result.details.push({
            chapterId: newChapter.id,
            chapterTitle: newChapter.title,
            status: 'transferred',
          });
        } else {
          result.details.push({
            chapterId: newChapter.id,
            chapterTitle: newChapter.title,
            status: 'no_link',
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error transferring progress:', error);
      return {
        ...result,
        success: false,
      };
    }
  }

  /**
   * Auto-link chapters between versions based on title matching
   */
  static async autoLinkChapters(
    sourceVersionId: string,
    targetVersionId: string
  ): Promise<LinkingResult> {
    const result: LinkingResult = {
      success: true,
      linkedCount: 0,
      suggestions: [],
    };

    try {
      // Get chapters from both versions
      const sourceChapters = await prisma.chapter.findMany({
        where: { courseVersionId: sourceVersionId },
        select: { id: true, title: true },
      });

      const targetChapters = await prisma.chapter.findMany({
        where: {
          courseVersionId: targetVersionId,
          originalChapterId: null, // Only unlinked chapters
        },
        select: { id: true, title: true },
      });

      // Create a map for quick lookup
      const sourceChapterMap = new Map(
        sourceChapters.map((c) => [c.title.toLowerCase().trim(), c])
      );

      // Link chapters by exact title match
      for (const targetChapter of targetChapters) {
        const normalizedTitle = targetChapter.title.toLowerCase().trim();
        const matchingSource = sourceChapterMap.get(normalizedTitle);

        if (matchingSource) {
          // Update the target chapter with originalChapterId
          await prisma.chapter.update({
            where: { id: targetChapter.id },
            data: { originalChapterId: matchingSource.id },
          });

          result.linkedCount++;
          result.suggestions.push({
            sourceChapterId: matchingSource.id,
            sourceTitle: matchingSource.title,
            targetChapterId: targetChapter.id,
            targetTitle: targetChapter.title,
            similarity: 100,
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error auto-linking chapters:', error);
      return {
        ...result,
        success: false,
      };
    }
  }

  /**
   * Get chapter linking suggestions (for admin UI)
   */
  static async getChapterLinkingSuggestions(
    targetVersionId: string
  ): Promise<ChapterLinkingSuggestion[]> {
    const suggestions: ChapterLinkingSuggestion[] = [];

    try {
      // Get the target version to find its course and previous version
      const targetVersion = await prisma.courseVersion.findUnique({
        where: { id: targetVersionId },
        select: {
          courseId: true,
          version: true,
        },
      });

      if (!targetVersion) {
        return suggestions;
      }

      // Find the previous version
      const previousVersion = await prisma.courseVersion.findFirst({
        where: {
          courseId: targetVersion.courseId,
          version: targetVersion.version - 1,
        },
        select: { id: true },
      });

      if (!previousVersion) {
        return suggestions;
      }

      // Get chapters from previous version
      const sourceChapters = await prisma.chapter.findMany({
        where: { courseVersionId: previousVersion.id },
        select: { id: true, title: true },
        orderBy: { order: 'asc' },
      });

      // Get unlinked chapters from target version
      const targetChapters = await prisma.chapter.findMany({
        where: {
          courseVersionId: targetVersionId,
          originalChapterId: null,
        },
        select: { id: true, title: true },
        orderBy: { order: 'asc' },
      });

      // Create suggestions based on title similarity
      for (const targetChapter of targetChapters) {
        const targetTitle = targetChapter.title.toLowerCase().trim();

        for (const sourceChapter of sourceChapters) {
          const sourceTitle = sourceChapter.title.toLowerCase().trim();
          const isExactMatch = targetTitle === sourceTitle;

          // Only include exact matches or high similarity
          if (isExactMatch || this.calculateSimilarity(targetTitle, sourceTitle) > 0.7) {
            suggestions.push({
              sourceChapterId: sourceChapter.id,
              sourceTitle: sourceChapter.title,
              targetChapterId: targetChapter.id,
              targetTitle: targetChapter.title,
              isExactMatch,
            });
          }
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting linking suggestions:', error);
      return suggestions;
    }
  }

  /**
   * Link a single chapter to its original
   */
  static async linkChapter(
    chapterId: string,
    originalChapterId: string | null
  ): Promise<boolean> {
    try {
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { originalChapterId },
      });
      return true;
    } catch (error) {
      console.error('Error linking chapter:', error);
      return false;
    }
  }

  /**
   * Get all chapters with their linking status for a version
   */
  static async getVersionChaptersWithLinks(versionId: string) {
    const version = await prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: {
        courseId: true,
        version: true,
      },
    });

    if (!version) {
      return [];
    }

    // Get chapters with their original chapter info
    const chapters = await prisma.chapter.findMany({
      where: { courseVersionId: versionId },
      select: {
        id: true,
        title: true,
        order: true,
        originalChapterId: true,
        originalChapter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Get previous version chapters for dropdown options
    const previousVersion = await prisma.courseVersion.findFirst({
      where: {
        courseId: version.courseId,
        version: version.version - 1,
      },
      include: {
        chapters: {
          select: {
            id: true,
            title: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return {
      chapters,
      previousVersionChapters: previousVersion?.chapters || [],
    };
  }

  /**
   * Simple string similarity calculation (Jaccard similarity)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
}

export default ProgressTransferService;
