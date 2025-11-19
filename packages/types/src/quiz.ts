import { z } from 'zod'

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  order: z.number(),
  quizId: z.string(),
})

export const QuizAnswerSchema = z.object({
  id: z.string(),
  answer: z.string(),
  isCorrect: z.boolean(),
  questionId: z.string(),
})

export const QuizSubmissionSchema = z.object({
  quizId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answerId: z.string(),
    })
  ),
})

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>
export type QuizAnswer = z.infer<typeof QuizAnswerSchema>
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>
