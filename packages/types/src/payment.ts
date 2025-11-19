import { z } from 'zod'

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export const PurchaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  courseId: z.string(),
  amount: z.number(),
  status: z.nativeEnum(PaymentStatus),
  promoCodeId: z.string().nullable(),
  createdAt: z.date(),
})

export const PromoCodeSchema = z.object({
  code: z.string().min(3).max(20),
  discount: z.number().min(0).max(100),
  validFrom: z.date(),
  validUntil: z.date(),
  maxUses: z.number().optional(),
})

export type Purchase = z.infer<typeof PurchaseSchema>
export type PromoCodeInput = z.infer<typeof PromoCodeSchema>
