import { Response, Request } from 'express'
import { prisma } from '../config/database'
import redis from '../config/redis'
import { AuthRequest } from '../middleware/auth'
import { bogService } from '../services/bog.service'
import { v4 as uuidv4 } from 'uuid'
import { ProgressTransferService } from '../services/progressTransferService'

/**
 * გადახდის პროცესის დაწყება
 *
 * Flow:
 * 1. მომხმარებელი აგზავნის courseId-ს
 * 2. ვქმნით Purchase ჩანაწერს PENDING სტატუსით
 * 3. ვაგზავნით მოთხოვნას BOG-ში
 * 4. ვაბრუნებთ redirect URL-ს frontend-ისთვის
 */
export const initiatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { courseId, promoCode } = req.body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'კურსის ID აუცილებელია',
      })
    }

    // კურსის მოძიება აქტიურ ვერსიასთან ერთად
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        versions: {
          where: { isActive: true },
          select: { id: true },
          take: 1,
        },
      },
    })

    const activeVersionId = course?.versions[0]?.id || null

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'კურსი ვერ მოიძებნა',
      })
    }

    // უკვე ჩარიცხულია თუ არა
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    })

    if (existingPurchase?.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'თქვენ უკვე ჩარიცხული ხართ ამ კურსზე',
        code: 'ALREADY_ENROLLED',
      })
    }

    // პრომო კოდის შემოწმება
    let discount = 0
    let promoCodeRecord = null

    if (promoCode) {
      promoCodeRecord = await prisma.promoCode.findFirst({
        where: {
          code: promoCode.toUpperCase(),
          isActive: true,
          validFrom: { lte: new Date() },
          validUntil: { gte: new Date() },
        },
      })

      if (promoCodeRecord) {
        if (!promoCodeRecord.maxUses || promoCodeRecord.usedCount < promoCodeRecord.maxUses) {
          discount = Number(promoCodeRecord.discount)
        }
      }
    }

    // საბოლოო ფასის გამოთვლა
    const originalAmount = Number(course.price)
    const discountAmount = (originalAmount * discount) / 100
    const finalAmount = originalAmount - discountAmount

    // უნიკალური შეკვეთის ID
    const externalOrderId = `ORDER-${uuidv4()}`

    // URL-ები
    const apiUrl = process.env.API_URL || 'http://localhost:4000'
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'

    // Purchase შექმნა/განახლება
    const purchase = await prisma.purchase.upsert({
      where: {
        userId_courseId: { userId, courseId },
      },
      create: {
        userId,
        courseId,
        courseVersionId: activeVersionId, // შესყიდვის მომენტის აქტიური ვერსია
        amount: originalAmount,
        finalAmount,
        status: 'PENDING',
        externalOrderId,
        promoCodeId: promoCodeRecord?.id,
      },
      update: {
        amount: originalAmount,
        finalAmount,
        status: 'PENDING',
        externalOrderId,
        promoCodeId: promoCodeRecord?.id,
        // არ ვაახლებთ courseVersionId-ს თუ უკვე არსებული შესყიდვაა
      },
    })

    // BOG-ში შეკვეთის შექმნა
    const bogOrder = await bogService.createOrder({
      externalOrderId,
      amount: finalAmount,
      currency: 'GEL',
      courseId: course.id,
      courseTitle: course.title,
      callbackUrl: `${apiUrl}/api/purchase/callback`,
      successUrl: `${appUrl}/payment/success?orderId=${externalOrderId}`,
      failUrl: `${appUrl}/payment/failed?orderId=${externalOrderId}`,
      ttl: 15,
      language: 'ka',
    })

    // BOG Order ID შენახვა
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { bogOrderId: bogOrder.id },
    })

    console.log(`✅ Payment initiated for course ${course.slug}, order: ${externalOrderId}`)

    return res.json({
      success: true,
      data: {
        orderId: externalOrderId,
        redirectUrl: bogOrder._links.redirect.href,
        amount: finalAmount,
        originalAmount,
        discount: discountAmount,
      },
    })
  } catch (error: any) {
    console.error('❌ Error initiating payment:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    })
    return res.status(500).json({
      success: false,
      message: error.message || 'გადახდის დაწყება ვერ მოხერხდა',
      error: process.env.NODE_ENV === 'development' ? error.response?.data : undefined,
    })
  }
}

/**
 * BOG Callback Handler
 *
 * BOG ამ endpoint-ს იძახებს გადახდის დასრულების შემდეგ.
 * მნიშვნელოვანი: ეს endpoint არ უნდა მოითხოვდეს authentication-ს!
 */
export const handleBOGCallback = async (req: Request, res: Response) => {
  try {
    console.log('📩 BOG Callback received:', JSON.stringify(req.body, null, 2))

    // Raw body signature-ის ვერიფიკაციისთვის
    const rawBody = JSON.stringify(req.body)
    const signature = req.headers['callback-signature'] as string

    // Signature ვერიფიკაცია (production-ში აუცილებელია!)
    if (process.env.NODE_ENV === 'production' && signature) {
      const isValid = bogService.verifyCallbackSignature(rawBody, signature)
      if (!isValid) {
        console.error('❌ Invalid callback signature')
        return res.status(400).json({ error: 'Invalid signature' })
      }
    }

    const { event, body } = req.body

    // მხოლოდ order_payment event-ს ვამუშავებთ
    if (event !== 'order_payment') {
      console.log('ℹ️ Unknown event type:', event)
      return res.status(200).json({ received: true })
    }

    const {
      order_id: bogOrderId,
      external_order_id: externalOrderId,
      order_status,
      payment_detail,
    } = body

    console.log(`📩 Processing order: ${externalOrderId}, status: ${order_status?.key}`)

    // Check if this is an upgrade payment
    const isUpgradePayment = externalOrderId?.startsWith('UPGRADE-')
    let upgradeIntent: any = null
    let purchase: any = null

    if (isUpgradePayment) {
      // Get upgrade intent from Redis
      if (redis) {
        const intentData = await redis.get(`upgrade:${externalOrderId}`)
        if (intentData) {
          upgradeIntent = JSON.parse(intentData)
          console.log(`📩 Found upgrade intent for ${externalOrderId}`)
        }
      }

      // If not in Redis, try to find in paymentDetails (fallback)
      if (!upgradeIntent) {
        const purchaseWithIntent = await prisma.purchase.findFirst({
          where: {
            paymentDetails: {
              path: ['pendingOrderId'],
              equals: externalOrderId,
            },
          },
        })
        if (purchaseWithIntent?.paymentDetails) {
          const details = purchaseWithIntent.paymentDetails as any
          upgradeIntent = details.pendingUpgrade
          console.log(`📩 Found upgrade intent in database fallback`)
        }
      }

      if (upgradeIntent) {
        // Find the original purchase
        purchase = await prisma.purchase.findUnique({
          where: { id: upgradeIntent.purchaseId },
        })
      }
    } else {
      // Regular purchase - find by order ID
      purchase = await prisma.purchase.findFirst({
        where: {
          OR: [{ bogOrderId }, { externalOrderId }],
        },
      })
    }

    if (!purchase) {
      console.error('❌ Purchase not found for order:', externalOrderId)
      return res.status(404).json({ error: 'Purchase not found' })
    }

    // სტატუსის განახლება
    let newStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' = 'PENDING'

    switch (order_status?.key) {
      case 'completed':
        newStatus = 'COMPLETED'
        break
      case 'rejected':
        newStatus = 'FAILED'
        break
      case 'refunded':
      case 'refunded_partially':
        newStatus = 'REFUNDED'
        break
      default:
        newStatus = 'PENDING'
    }

    // For upgrade payments, update the purchase with new version info on success
    if (isUpgradePayment && upgradeIntent && newStatus === 'COMPLETED') {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          courseVersionId: upgradeIntent.targetVersionId,
          amount: upgradeIntent.amount,
          finalAmount: upgradeIntent.finalAmount,
          isUpgrade: true,
          promoCodeId: upgradeIntent.promoCodeId,
          bogOrderId,
          transactionId: payment_detail?.transaction_id,
          paymentMethod: payment_detail?.transfer_method?.key,
          paymentDetails: body,
          paidAt: new Date(),
        },
      })

      // Clean up Redis entry
      if (redis) {
        await redis.del(`upgrade:${externalOrderId}`)
      }

      console.log(`✅ Upgrade completed: ${purchase.id} → version ${upgradeIntent.targetVersionId}`)
    } else if (isUpgradePayment && upgradeIntent && newStatus === 'FAILED') {
      // Clean up Redis entry on failure too
      if (redis) {
        await redis.del(`upgrade:${externalOrderId}`)
      }
      console.log(`❌ Upgrade payment failed for ${externalOrderId}`)
      return res.status(200).json({ received: true })
    } else {
      // Regular purchase update
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: newStatus,
          bogOrderId,
          transactionId: payment_detail?.transaction_id,
          paymentMethod: payment_detail?.transfer_method?.key,
          paymentDetails: body,
          paidAt: newStatus === 'COMPLETED' ? new Date() : null,
        },
      })
    }

    // პრომო კოდის გამოყენების დათვლა
    const promoCodeId = isUpgradePayment && upgradeIntent ? upgradeIntent.promoCodeId : purchase.promoCodeId
    if (newStatus === 'COMPLETED' && promoCodeId) {
      await prisma.promoCode.update({
        where: { id: promoCodeId },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Create UserVersionAccess for successful purchase/upgrade
    const versionId = isUpgradePayment && upgradeIntent ? upgradeIntent.targetVersionId : purchase.courseVersionId
    if (newStatus === 'COMPLETED' && versionId) {
      try {
        // Create access record for the purchased version
        await prisma.userVersionAccess.upsert({
          where: {
            userId_courseVersionId: {
              userId: purchase.userId,
              courseVersionId: versionId,
            },
          },
          create: {
            userId: purchase.userId,
            courseVersionId: versionId,
            purchaseId: purchase.id,
          },
          update: {
            isActive: true,
            purchaseId: purchase.id,
          },
        })

        // If this is an upgrade, transfer progress from old version
        if (isUpgradePayment && upgradeIntent && upgradeIntent.originalVersionId) {
          // Transfer progress from previous version to new version
          const transferResult = await ProgressTransferService.transferProgress(
            purchase.userId,
            upgradeIntent.originalVersionId,
            versionId
          )
          console.log(`✅ Progress transferred: ${transferResult.transferredCount} chapters`)
        }

        console.log(`✅ UserVersionAccess created for user ${purchase.userId}, version ${versionId}`)
      } catch (accessError) {
        console.error('❌ Error creating UserVersionAccess:', accessError)
        // Don't fail the callback, just log the error
      }
    }

    // Refund-ის შემთხვევაში RefundRequest-ის განახლება
    if (newStatus === 'REFUNDED') {
      const refundAmount = body.purchase_units?.refund_amount
        ? parseFloat(body.purchase_units.refund_amount)
        : null

      // ვეძებთ PROCESSING სტატუსზე მყოფ RefundRequest-ს
      const refundRequest = await prisma.refundRequest.findFirst({
        where: {
          purchaseId: purchase.id,
          status: 'PROCESSING',
        },
      })

      if (refundRequest) {
        await prisma.refundRequest.update({
          where: { id: refundRequest.id },
          data: {
            status: 'COMPLETED',
            refundedAmount: refundAmount,
            bogRefundStatus: order_status?.key,
            completedAt: new Date(),
          },
        })
        console.log(`✅ RefundRequest ${refundRequest.id} completed, amount: ${refundAmount}`)
      }
    }

    console.log(`✅ Purchase ${purchase.id} updated to ${newStatus}`)

    // BOG-ს უნდა დავუბრუნოთ 200 OK
    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('❌ Error processing BOG callback:', error)
    // მაინც ვაბრუნებთ 200-ს რომ BOG-მა არ გაიმეოროს
    return res.status(200).json({ received: true, error: 'Processing error' })
  }
}

/**
 * გადახდის სტატუსის შემოწმება
 * თუ სტატუსი PENDING-ია, BOG-დან პირდაპირ შევამოწმებთ
 */
export const checkPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { orderId } = req.params

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    let purchase = await prisma.purchase.findFirst({
      where: {
        externalOrderId: orderId,
        userId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    })

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'შეკვეთა ვერ მოიძებნა',
      })
    }

    // თუ სტატუსი PENDING-ია და გვაქვს bogOrderId, BOG-დან შევამოწმოთ
    if (purchase.status === 'PENDING' && purchase.bogOrderId) {
      try {
        const bogDetails = await bogService.getOrderDetails(purchase.bogOrderId)

        if (bogDetails.order_status?.key === 'completed') {
          // BOG-ში completed-ია, განვაახლოთ database
          purchase = await prisma.purchase.update({
            where: { id: purchase.id },
            data: {
              status: 'COMPLETED',
              transactionId: bogDetails.payment_detail?.transaction_id,
              paymentMethod: bogDetails.payment_detail?.transfer_method?.key,
              paidAt: new Date(),
            },
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          })
          console.log(`✅ Payment verified from BOG for order: ${orderId}`)
        } else if (bogDetails.order_status?.key === 'rejected') {
          purchase = await prisma.purchase.update({
            where: { id: purchase.id },
            data: { status: 'FAILED' },
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          })
        }
      } catch (bogError) {
        console.error('Error checking BOG status:', bogError)
        // BOG შემოწმება ვერ მოხერხდა, დავაბრუნოთ არსებული სტატუსი
      }
    }

    return res.json({
      success: true,
      data: {
        orderId: purchase.externalOrderId,
        status: purchase.status,
        amount: purchase.finalAmount,
        course: purchase.course,
        paidAt: purchase.paidAt,
      },
    })
  } catch (error) {
    console.error('Error checking payment status:', error)
    return res.status(500).json({
      success: false,
      message: 'სტატუსის შემოწმება ვერ მოხერხდა',
    })
  }
}

/**
 * უფასო კურსზე ჩარიცხვა (გადახდის გარეშე)
 */
export const enrollInCourse = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { courseId } = req.body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'კურსის ID აუცილებელია',
      })
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        versions: {
          where: { isActive: true },
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'კურსი ვერ მოიძებნა',
      })
    }

    const activeVersionId = course.versions[0]?.id || null

    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    })

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'თქვენ უკვე ჩარიცხული ხართ ამ კურსზე',
        code: 'ALREADY_ENROLLED',
      })
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        courseId,
        courseVersionId: activeVersionId, // შესყიდვის მომენტის აქტიური ვერსია
        amount: course.price,
        finalAmount: course.price,
        status: 'COMPLETED',
      },
    })

    return res.status(201).json({
      success: true,
      message: 'კურსზე წარმატებით ჩაირიცხეთ',
      data: {
        purchaseId: purchase.id,
        courseSlug: course.slug,
        courseTitle: course.title,
      },
    })
  } catch (error) {
    console.error('Error enrolling in course:', error)
    return res.status(500).json({
      success: false,
      message: 'შეცდომა კურსზე ჩარიცხვისას',
    })
  }
}

/**
 * ჩარიცხვის სტატუსის შემოწმება
 */
export const checkEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { courseId } = req.params

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    })

    return res.json({
      success: true,
      data: {
        isEnrolled: purchase?.status === 'COMPLETED',
        purchaseStatus: purchase?.status || null,
        enrolledAt: purchase?.createdAt || null,
      },
    })
  } catch (error) {
    console.error('Error checking enrollment:', error)
    return res.status(500).json({
      success: false,
      message: 'შეცდომა ჩარიცხვის შემოწმებისას',
    })
  }
}

/**
 * ვერსიის განახლება (Upgrade to new version)
 * უკვე ნაყიდი კურსის ახალ ვერსიაზე გადასვლა
 */
export const initiateUpgrade = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { courseId, targetVersionId, promoCode } = req.body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    if (!courseId || !targetVersionId) {
      return res.status(400).json({
        success: false,
        message: 'კურსის ID და ვერსიის ID აუცილებელია',
      })
    }

    // Check existing purchase
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
      include: {
        course: true,
        courseVersion: true,
      },
    })

    if (!existingPurchase || existingPurchase.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'კურსი არ გაქვთ შეძენილი',
      })
    }

    // Check if already on the target version
    if (existingPurchase.courseVersionId === targetVersionId) {
      return res.status(400).json({
        success: false,
        message: 'თქვენ უკვე გაქვთ ეს ვერსია',
      })
    }

    // Get target version
    const targetVersion = await prisma.courseVersion.findUnique({
      where: { id: targetVersionId },
    })

    if (!targetVersion || targetVersion.courseId !== courseId) {
      return res.status(404).json({
        success: false,
        message: 'ვერსია ვერ მოიძებნა',
      })
    }

    if (!targetVersion.isActive) {
      return res.status(400).json({
        success: false,
        message: 'ეს ვერსია არ არის აქტიური',
      })
    }

    // Calculate upgrade price (check for time-limited discount first)
    let upgradePrice = 0
    let isDiscountActive = false
    const now = new Date()

    // Check if promotional discount is active
    if (
      targetVersion.upgradeDiscountEndDate &&
      now <= targetVersion.upgradeDiscountEndDate &&
      targetVersion.upgradeDiscountValue &&
      (!targetVersion.upgradeDiscountStartDate || now >= targetVersion.upgradeDiscountStartDate)
    ) {
      isDiscountActive = true
      if (targetVersion.upgradeDiscountType === 'FIXED') {
        upgradePrice = Number(targetVersion.upgradeDiscountValue)
      } else if (targetVersion.upgradeDiscountType === 'PERCENTAGE') {
        const percentage = Number(targetVersion.upgradeDiscountValue)
        upgradePrice = (Number(existingPurchase.course.price) * percentage) / 100
      }
    } else {
      // Use regular upgrade price
      if (targetVersion.upgradePriceType === 'FIXED') {
        upgradePrice = Number(targetVersion.upgradePriceValue) || 0
      } else if (targetVersion.upgradePriceType === 'PERCENTAGE') {
        const percentage = Number(targetVersion.upgradePriceValue) || 0
        upgradePrice = (Number(existingPurchase.course.price) * percentage) / 100
      }
    }

    if (upgradePrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ამ ვერსიას არ აქვს განახლების ფასი მითითებული',
      })
    }

    // Apply promo code if provided
    let discount = 0
    let promoCodeRecord = null

    if (promoCode) {
      promoCodeRecord = await prisma.promoCode.findFirst({
        where: {
          code: promoCode.toUpperCase(),
          isActive: true,
          validFrom: { lte: new Date() },
          validUntil: { gte: new Date() },
        },
      })

      if (promoCodeRecord) {
        if (!promoCodeRecord.maxUses || promoCodeRecord.usedCount < promoCodeRecord.maxUses) {
          discount = Number(promoCodeRecord.discount)
        }
      }
    }

    const discountAmount = (upgradePrice * discount) / 100
    const finalAmount = upgradePrice - discountAmount

    // Create unique order ID
    const externalOrderId = `UPGRADE-${uuidv4()}`

    // URLs
    const apiUrl = process.env.API_URL || 'http://localhost:4000'
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'

    // Store upgrade intent in Redis (don't modify Purchase table until payment completes)
    // This prevents losing the user's original COMPLETED purchase
    const upgradeIntent = {
      userId,
      courseId,
      purchaseId: existingPurchase.id,
      originalVersionId: existingPurchase.courseVersionId,
      targetVersionId,
      amount: upgradePrice,
      finalAmount,
      promoCodeId: promoCodeRecord?.id || null,
      createdAt: new Date().toISOString(),
    }

    if (redis) {
      // Store in Redis with 24 hour expiry
      await redis.setex(
        `upgrade:${externalOrderId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(upgradeIntent)
      )
    } else {
      // Fallback: Store in database with a temporary field
      // For now, we'll add to paymentDetails of the existing purchase
      await prisma.purchase.update({
        where: { id: existingPurchase.id },
        data: {
          paymentDetails: {
            pendingUpgrade: upgradeIntent,
            pendingOrderId: externalOrderId,
          },
        },
      })
    }

    // Create BOG order
    const bogOrder = await bogService.createOrder({
      externalOrderId,
      amount: finalAmount,
      currency: 'GEL',
      courseId: existingPurchase.course.id,
      courseTitle: `${existingPurchase.course.title} - განახლება v${targetVersion.version}`,
      callbackUrl: `${apiUrl}/api/purchase/callback`,
      successUrl: `${appUrl}/payment/success?orderId=${externalOrderId}`,
      failUrl: `${appUrl}/payment/failed?orderId=${externalOrderId}`,
      ttl: 15,
      language: 'ka',
    })

    // Store BOG Order ID with upgrade intent
    if (redis) {
      const updatedIntent = { ...upgradeIntent, bogOrderId: bogOrder.id }
      await redis.setex(
        `upgrade:${externalOrderId}`,
        24 * 60 * 60,
        JSON.stringify(updatedIntent)
      )
    } else {
      await prisma.purchase.update({
        where: { id: existingPurchase.id },
        data: {
          paymentDetails: {
            pendingUpgrade: { ...upgradeIntent, bogOrderId: bogOrder.id },
            pendingOrderId: externalOrderId,
          },
        },
      })
    }

    console.log(`✅ Upgrade payment initiated for course ${existingPurchase.course.slug}, version ${targetVersion.version}, order: ${externalOrderId}`)

    return res.json({
      success: true,
      data: {
        orderId: externalOrderId,
        redirectUrl: bogOrder._links.redirect.href,
        amount: finalAmount,
        originalAmount: upgradePrice,
        discount: discountAmount,
        isPromotionalDiscount: isDiscountActive,
        discountEndsAt: isDiscountActive ? targetVersion.upgradeDiscountEndDate : null,
        targetVersion: {
          id: targetVersion.id,
          version: targetVersion.version,
          title: targetVersion.title,
        },
      },
    })
  } catch (error: any) {
    console.error('❌ Error initiating upgrade:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    })
    return res.status(500).json({
      success: false,
      message: error.message || 'განახლების დაწყება ვერ მოხერხდა',
      error: process.env.NODE_ENV === 'development' ? error.response?.data : undefined,
    })
  }
}
