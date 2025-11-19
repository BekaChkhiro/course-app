import { z } from 'zod'

export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
})

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

export type Pagination = z.infer<typeof PaginationSchema>
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}
