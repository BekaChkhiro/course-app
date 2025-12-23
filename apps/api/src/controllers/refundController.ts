import { Response } from 'express'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { bogService } from '../services/bog.service'

// ============================================
// STUDENT ENDPOINTS
// ============================================

/**
 * სტუდენტის refund მოთხოვნის შექმნა
 */
export const createRefundRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { purchaseId, reason } = req.body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    if (!purchaseId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'purchaseId და reason აუცილებელია',
      })
    }

    // Purchase-ის მოძიება
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        userId,
        status: 'COMPLETED',
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        refundRequests: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED', 'PROCESSING'],
            },
          },
        },
      },
    })

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'შეძენა ვერ მოიძებნა ან უკვე დაბრუნებულია',
      })
    }

    // შევამოწმოთ უკვე აქვს თუ არა აქტიური refund მოთხოვნა
    if (purchase.refundRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'თქვენ უკვე გაქვთ აქტიური დაბრუნების მოთხოვნა ამ კურსზე',
        code: 'REFUND_ALREADY_REQUESTED',
      })
    }

    // შევამოწმოთ BOG Order ID არსებობს თუ არა
    if (!purchase.bogOrderId) {
      return res.status(400).json({
        success: false,
        message: 'ამ შეძენისთვის თანხის დაბრუნება შეუძლებელია',
        code: 'NO_BOG_ORDER',
      })
    }

    // RefundRequest-ის შექმნა
    const refundRequest = await prisma.refundRequest.create({
      data: {
        purchaseId,
        userId,
        reason,
        requestedAmount: purchase.finalAmount,
        status: 'PENDING',
      },
    })

    console.log(`📝 Refund request created: ${refundRequest.id} for purchase ${purchaseId}`)

    return res.status(201).json({
      success: true,
      message: 'დაბრუნების მოთხოვნა წარმატებით გაიგზავნა',
      data: {
        id: refundRequest.id,
        status: refundRequest.status,
        requestedAmount: refundRequest.requestedAmount,
        courseName: purchase.course.title,
        createdAt: refundRequest.createdAt,
      },
    })
  } catch (error) {
    console.error('Error creating refund request:', error)
    return res.status(500).json({
      success: false,
      message: 'შეცდომა მოთხოვნის გაგზავნისას',
    })
  }
}

/**
 * სტუდენტის refund მოთხოვნების სია
 */
export const getMyRefundRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    const refundRequests = await prisma.refundRequest.findMany({
      where: { userId },
      include: {
        purchase: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json({
      success: true,
      data: refundRequests.map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        requestedAmount: r.requestedAmount,
        refundedAmount: r.refundedAmount,
        rejectionReason: r.rejectionReason,
        course: r.purchase.course,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
    })
  } catch (error) {
    console.error('Error getting refund requests:', error)
    return res.status(500).json({
      success: false,
      message: 'შეცდომა მოთხოვნების მიღებისას',
    })
  }
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * ადმინის - ყველა refund მოთხოვნის სია
 */
export const getAllRefundRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const [refundRequests, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        include: {
          purchase: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  email: true,
                },
              },
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.refundRequest.count({ where }),
    ])

    return res.json({
      success: true,
      data: {
        items: refundRequests.map((r) => ({
          id: r.id,
          status: r.status,
          reason: r.reason,
          requestedAmount: r.requestedAmount,
          refundedAmount: r.refundedAmount,
          adminNotes: r.adminNotes,
          rejectionReason: r.rejectionReason,
          user: r.purchase.user,
          course: r.purchase.course,
          purchaseId: r.purchaseId,
          bogOrderId: r.purchase.bogOrderId,
          createdAt: r.createdAt,
          reviewedAt: r.reviewedAt,
          completedAt: r.completedAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    console.error('Error getting all refund requests:', error)
    return res.status(500).json({
      success: false,
      message: 'შეცდომა მოთხოვნების მიღებისას',
    })
  }
}

/**
 * ადმინის - refund მოთხოვნის დადასტურება
 */
export const approveRefundRequest = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id
    const { id } = req.params
    const { adminNotes } = req.body

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    // RefundRequest-ის მოძიება
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id },
      include: {
        purchase: true,
      },
    })

    if (!refundRequest) {
      return res.status(404).json({
        success: false,
        message: 'მოთხოვნა ვერ მოიძებნა',
      })
    }

    if (refundRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'ეს მოთხოვნა უკვე დამუშავებულია',
      })
    }

    if (!refundRequest.purchase.bogOrderId) {
      return res.status(400).json({
        success: false,
        message: 'BOG Order ID არ არსებობს, დაბრუნება შეუძლებელია',
      })
    }

    // სტატუსის განახლება APPROVED-ზე
    await prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: adminId,
        reviewedAt: new Date(),
        adminNotes,
      },
    })

    // BOG-ში refund-ის გაგზავნა
    try {
      const bogResponse = await bogService.refundOrder({
        bogOrderId: refundRequest.purchase.bogOrderId,
        // amount არ ვუთითებთ - სრული თანხა დაბრუნდება
      })

      // სტატუსის განახლება PROCESSING-ზე
      await prisma.refundRequest.update({
        where: { id },
        data: {
          status: 'PROCESSING',
          bogActionId: bogResponse.action_id,
          bogRefundStatus: bogResponse.key,
          processedAt: new Date(),
        },
      })

      console.log(`✅ Refund approved and sent to BOG: ${id}, actionId: ${bogResponse.action_id}`)

      return res.json({
        success: true,
        message: 'დაბრუნების მოთხოვნა დადასტურდა და BOG-ში გაიგზავნა',
        data: {
          id,
          status: 'PROCESSING',
          bogActionId: bogResponse.action_id,
        },
      })
    } catch (bogError: any) {
      // BOG-ში შეცდომის შემთხვევაში - FAILED სტატუსი
      await prisma.refundRequest.update({
        where: { id },
        data: {
          status: 'FAILED',
          bogRefundStatus: bogError.message,
        },
      })

      console.error(`❌ BOG refund failed for request ${id}:`, bogError.message)

      return res.status(500).json({
        success: false,
        message: 'BOG-ში დაბრუნების გაგზავნა ვერ მოხერხდა',
        error: bogError.message,
      })
    }
  } catch (error) {
    console.error('Error approving refund request:', error)
    return res.status(500).json({
      success: false,
      message: 'შეცდომა მოთხოვნის დადასტურებისას',
    })
  }
}

/**
 * ადმინის - refund მოთხოვნის უარყოფა
 */
export const rejectRefundRequest = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id
    const { id } = req.params
    const { rejectionReason, adminNotes } = req.body

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      })
    }

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'უარყოფის მიზეზი აუცილებელია',
      })
    }

    // RefundRequest-ის მოძიება
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id },
    })

    if (!refundRequest) {
      return res.status(404).json({
        success: false,
        message: 'მოთხოვნა ვერ მოიძებნა',
      })
    }

    if (refundRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'ეს მოთხოვნა უკვე დამუშავებულია',
      })
    }

    // სტატუსის განახლება REJECTED-ზე
    const updated = await prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason,
        adminNotes,
      },
    })

    console.log(`❌ Refund request rejected: ${id}`)

    return res.json({
      success: true,
      message: 'დაბრუნების მოთხოვნა უარყოფილია',
      data: {
        id: updated.id,
        status: updated.status,
        rejectionReason: updated.rejectionReason,
      },
    })
  } catch (error) {
    console.error('Error rejecting refund request:', error)
    return res.status(500).json({
      success: false,
      message: 'შეცდომა მოთხოვნის უარყოფისას',
    })
  }
}

/**
 * ადმინის - refund სტატისტიკა
 */
export const getRefundStats = async (req: AuthRequest, res: Response) => {
  try {
    const [pending, processing, completed, rejected, failed, totalRefunded] = await Promise.all([
      prisma.refundRequest.count({ where: { status: 'PENDING' } }),
      prisma.refundRequest.count({ where: { status: 'PROCESSING' } }),
      prisma.refundRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.refundRequest.count({ where: { status: 'REJECTED' } }),
      prisma.refundRequest.count({ where: { status: 'FAILED' } }),
      prisma.refundRequest.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { refundedAmount: true },
      }),
    ])

    return res.json({
      success: true,
      data: {
        pending,
        processing,
        completed,
        rejected,
        failed,
        totalRefundedAmount: totalRefunded._sum.refundedAmount || 0,
      },
    })
  } catch (error) {
    console.error('Error getting refund stats:', error)
    return res.status(500).json({
      success: false,
      message: 'შეცდომა სტატისტიკის მიღებისას',
    })
  }
}
