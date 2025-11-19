import { z } from 'zod'

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ChapterContentType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  PDF = 'PDF',
  QUIZ = 'QUIZ',
}

export const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnail: z.string().nullable(),
  price: z.number(),
  status: z.nativeEnum(CourseStatus),
  categoryId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const ChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  order: z.number(),
  courseVersionId: z.string(),
})

export const ChapterContentSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ChapterContentType),
  title: z.string(),
  content: z.string(),
  duration: z.number().nullable(),
  order: z.number(),
  chapterId: z.string(),
})

export type Course = z.infer<typeof CourseSchema>
export type Chapter = z.infer<typeof ChapterSchema>
export type ChapterContent = z.infer<typeof ChapterContentSchema>
