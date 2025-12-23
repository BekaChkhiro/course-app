import { prisma } from '../config/database'
import { bogService } from './bog.service'
import { EmailService } from './emailService'

/**
 * Background job service for automatically checking refund status from BOG
 *
 * Logic:
 * - After admin approves refund (PROCESSING status), first check is scheduled for 1 minute
 * - If still processing, next checks are scheduled every 1 hour
 * - When BOG returns 'refunded' or 'refunded_partially', status is updated to COMPLETED
 */

const CHECK_INTERVAL_MS = 60 * 1000 // Check every 1 minute for pending checks
const FIRST_CHECK_DELAY_MS = 60 * 1000 // First check after 1 minute
const SUBSEQUENT_CHECK_DELAY_MS = 60 * 60 * 1000 // Subsequent checks every 1 hour
const MAX_CHECK_COUNT = 72 // Max 72 checks (3 days with hourly checks)

let isRunning = false
let intervalId: NodeJS.Timeout | null = null

/**
 * Process a single refund request - check BOG status
 */
async function processRefundCheck(refundId: string): Promise<void> {
  try {
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        purchase: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            course: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    if (!refundRequest) {
      console.log(`[RefundJob] Refund ${refundId} not found, skipping`)
      return
    }

    if (refundRequest.status !== 'PROCESSING') {
      console.log(`[RefundJob] Refund ${refundId} is not in PROCESSING status, skipping`)
      return
    }

    if (!refundRequest.purchase.bogOrderId) {
      console.log(`[RefundJob] Refund ${refundId} has no BOG order ID, skipping`)
      return
    }

    console.log(`[RefundJob] Checking BOG status for refund ${refundId}...`)

    // Get order details from BOG
    const bogDetails = await bogService.getOrderDetails(refundRequest.purchase.bogOrderId)

    console.log(`[RefundJob] BOG status for refund ${refundId}:`, {
      orderStatus: bogDetails.order_status?.key,
      refundAmount: bogDetails.purchase_units?.refund_amount,
    })

    // Check if refund is completed
    const isRefunded = bogDetails.order_status?.key === 'refunded' ||
                      bogDetails.order_status?.key === 'refunded_partially'

    if (isRefunded) {
      // Refund is completed!
      const refundAmount = bogDetails.purchase_units?.refund_amount
        ? parseFloat(bogDetails.purchase_units.refund_amount)
        : Number(refundRequest.requestedAmount)

      // Update RefundRequest to COMPLETED
      await prisma.refundRequest.update({
        where: { id: refundId },
        data: {
          status: 'COMPLETED',
          refundedAmount: refundAmount,
          bogRefundStatus: bogDetails.order_status?.key,
          completedAt: new Date(),
          nextCheckAt: null, // No more checks needed
        },
      })

      // Update Purchase status to REFUNDED
      await prisma.purchase.update({
        where: { id: refundRequest.purchaseId },
        data: {
          status: 'REFUNDED',
        },
      })

      console.log(`[RefundJob] Refund ${refundId} completed! Amount: ${refundAmount}`)

      // Send completion email to user
      try {
        await EmailService.sendRefundCompletedEmail(
          refundRequest.purchase.user.email,
          refundRequest.purchase.user.name,
          refundRequest.purchase.course.title,
          refundAmount,
          refundRequest.purchase.user.id
        )
        console.log(`[RefundJob] Completion email sent for refund ${refundId}`)
      } catch (emailError) {
        console.error(`[RefundJob] Failed to send completion email for refund ${refundId}:`, emailError)
      }
    } else {
      // Still processing, schedule next check
      const newCheckCount = refundRequest.checkCount + 1

      if (newCheckCount >= MAX_CHECK_COUNT) {
        console.log(`[RefundJob] Refund ${refundId} reached max check count, stopping auto-checks`)
        await prisma.refundRequest.update({
          where: { id: refundId },
          data: {
            checkCount: newCheckCount,
            nextCheckAt: null, // Stop checking
          },
        })
      } else {
        // Schedule next check in 1 hour
        const nextCheckAt = new Date(Date.now() + SUBSEQUENT_CHECK_DELAY_MS)
        await prisma.refundRequest.update({
          where: { id: refundId },
          data: {
            checkCount: newCheckCount,
            nextCheckAt,
          },
        })
        console.log(`[RefundJob] Refund ${refundId} still processing, next check at ${nextCheckAt.toISOString()}`)
      }
    }
  } catch (error: any) {
    console.error(`[RefundJob] Error processing refund ${refundId}:`, error.message)

    // On error, still schedule next check (don't stop trying)
    try {
      const refund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        select: { checkCount: true },
      })

      if (refund && refund.checkCount < MAX_CHECK_COUNT) {
        await prisma.refundRequest.update({
          where: { id: refundId },
          data: {
            checkCount: refund.checkCount + 1,
            nextCheckAt: new Date(Date.now() + SUBSEQUENT_CHECK_DELAY_MS),
          },
        })
      }
    } catch (updateError) {
      console.error(`[RefundJob] Failed to update check count for refund ${refundId}:`, updateError)
    }
  }
}

/**
 * Main job function - finds and processes refunds that need checking
 */
async function runRefundCheckJob(): Promise<void> {
  if (isRunning) {
    return // Prevent concurrent runs
  }

  isRunning = true

  try {
    // Find all PROCESSING refunds where nextCheckAt <= now
    const refundsToCheck = await prisma.refundRequest.findMany({
      where: {
        status: 'PROCESSING',
        nextCheckAt: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
      },
    })

    if (refundsToCheck.length > 0) {
      console.log(`[RefundJob] Found ${refundsToCheck.length} refund(s) to check`)

      // Process each refund sequentially to avoid rate limiting
      for (const refund of refundsToCheck) {
        await processRefundCheck(refund.id)
        // Small delay between checks to avoid overwhelming the BOG API
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  } catch (error) {
    console.error('[RefundJob] Error in job execution:', error)
  } finally {
    isRunning = false
  }
}

/**
 * Schedule first check for a refund (1 minute after approval)
 */
export async function scheduleFirstRefundCheck(refundId: string): Promise<void> {
  const nextCheckAt = new Date(Date.now() + FIRST_CHECK_DELAY_MS)

  await prisma.refundRequest.update({
    where: { id: refundId },
    data: {
      nextCheckAt,
      checkCount: 0,
    },
  })

  console.log(`[RefundJob] Scheduled first check for refund ${refundId} at ${nextCheckAt.toISOString()}`)
}

/**
 * Start the background job
 */
export function startRefundCheckJob(): void {
  if (intervalId) {
    console.log('[RefundJob] Job already running')
    return
  }

  console.log('[RefundJob] Starting background job...')

  // Run immediately on start
  runRefundCheckJob()

  // Then run every minute
  intervalId = setInterval(runRefundCheckJob, CHECK_INTERVAL_MS)

  console.log('[RefundJob] Background job started, checking every minute')
}

/**
 * Stop the background job
 */
export function stopRefundCheckJob(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('[RefundJob] Background job stopped')
  }
}

export default {
  startRefundCheckJob,
  stopRefundCheckJob,
  scheduleFirstRefundCheck,
}
