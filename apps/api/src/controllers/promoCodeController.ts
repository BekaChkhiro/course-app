import { Response } from 'express'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { Prisma } from '@prisma/client'

/**
 * ყველა პრომო კოდის მიღება (Admin)
 */
export const getAllPromoCodes = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      status = 'all',
      scope = 'all'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // ფილტრების აგება
    const where: Prisma.PromoCodeWhereInput = {}

    // ძებნა კოდით ან აღწერით
    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    // სტატუსის ფილტრი
    const now = new Date()
    if (status === 'active') {
      where.isActive = true
      where.validFrom = { lte: now }
      where.validUntil = { gte: now }
    } else if (status === 'inactive') {
      where.isActive = false
    } else if (status === 'expired') {
      where.validUntil = { lt: now }
    } else if (status === 'upcoming') {
      where.validFrom = { gt: now }
    }

    // Scope ფილტრი
    if (scope !== 'all') {
      where.scope = scope as 'ALL' | 'COURSE' | 'CATEGORY'
    }

    const [promoCodes, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        include: {
          course: {
            select: { id: true, title: true, slug: true }
          },
          category: {
            select: { id: true, name: true, slug: true }
          },
          _count: {
            select: { purchases: true, usages: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.promoCode.count({ where }),
    ])

    // თითოეულ პრომო კოდს დავუმატოთ სტატუსი და სტატისტიკა
    const promoCodesWithStats = promoCodes.map(promo => {
      let computedStatus = 'active'
      if (!promo.isActive) {
        computedStatus = 'inactive'
      } else if (promo.validUntil < now) {
        computedStatus = 'expired'
      } else if (promo.validFrom > now) {
        computedStatus = 'upcoming'
      } else if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        computedStatus = 'exhausted'
      }

      return {
        ...promo,
        computedStatus,
        purchaseCount: promo._count.purchases,
        usageCount: promo._count.usages,
      }
    })

    res.json({
      success: true,
      data: {
        promoCodes: promoCodesWithStats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    console.error('getAllPromoCodes error:', error)
    res.status(500).json({
      success: false,
      message: 'პრომო კოდების მიღება ვერ მოხერხდა',
    })
  }
}

/**
 * ერთი პრომო კოდის მიღება (Admin)
 */
export const getPromoCodeById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const promoCode = await prisma.promoCode.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, slug: true }
        },
        category: {
          select: { id: true, name: true, slug: true }
        },
        purchases: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, surname: true, email: true }
            },
            course: {
              select: { id: true, title: true }
            }
          }
        },
        _count: {
          select: { purchases: true, usages: true }
        }
      },
    })

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'პრომო კოდი ვერ მოიძებნა',
      })
    }

    res.json({
      success: true,
      data: promoCode,
    })
  } catch (error) {
    console.error('getPromoCodeById error:', error)
    res.status(500).json({
      success: false,
      message: 'პრომო კოდის მიღება ვერ მოხერხდა',
    })
  }
}

/**
 * ახალი პრომო კოდის შექმნა (Admin)
 */
export const createPromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      scope,
      courseId,
      categoryId,
      singleUsePerUser,
      minOrderAmount,
      maxUses,
      validFrom,
      validUntil,
      isActive = true,
    } = req.body

    // ვალიდაცია
    if (!code || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'კოდი, ფასდაკლება და ვადები აუცილებელია',
      })
    }

    // კოდის უნიკალურობის შემოწმება
    const existingCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'ეს კოდი უკვე არსებობს',
      })
    }

    // Scope ვალიდაცია
    if (scope === 'COURSE' && !courseId) {
      return res.status(400).json({
        success: false,
        message: 'კურსის არჩევა აუცილებელია COURSE scope-ისთვის',
      })
    }

    if (scope === 'CATEGORY' && !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'კატეგორიის არჩევა აუცილებელია CATEGORY scope-ისთვის',
      })
    }

    // ფასდაკლების ვალიდაცია
    if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({
        success: false,
        message: 'პროცენტი უნდა იყოს 0-დან 100-მდე',
      })
    }

    if (discountType === 'FIXED' && discountValue < 0) {
      return res.status(400).json({
        success: false,
        message: 'ფიქსირებული თანხა არ შეიძლება იყოს უარყოფითი',
      })
    }

    // თარიღების ვალიდაცია
    const validFromDate = new Date(validFrom)
    const validUntilDate = new Date(validUntil)

    if (validUntilDate <= validFromDate) {
      return res.status(400).json({
        success: false,
        message: 'დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ',
      })
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType: discountType || 'PERCENTAGE',
        discountValue,
        scope: scope || 'ALL',
        courseId: scope === 'COURSE' ? courseId : null,
        categoryId: scope === 'CATEGORY' ? categoryId : null,
        singleUsePerUser: singleUsePerUser || false,
        minOrderAmount: minOrderAmount || null,
        maxUses: maxUses || null,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        isActive,
      },
      include: {
        course: {
          select: { id: true, title: true }
        },
        category: {
          select: { id: true, name: true }
        },
      },
    })

    res.status(201).json({
      success: true,
      data: promoCode,
      message: 'პრომო კოდი წარმატებით შეიქმნა',
    })
  } catch (error) {
    console.error('createPromoCode error:', error)
    res.status(500).json({
      success: false,
      message: 'პრომო კოდის შექმნა ვერ მოხერხდა',
    })
  }
}

/**
 * პრომო კოდის რედაქტირება (Admin)
 */
export const updatePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const {
      code,
      description,
      discountType,
      discountValue,
      scope,
      courseId,
      categoryId,
      singleUsePerUser,
      minOrderAmount,
      maxUses,
      validFrom,
      validUntil,
      isActive,
    } = req.body

    // პრომო კოდის არსებობის შემოწმება
    const existingPromo = await prisma.promoCode.findUnique({
      where: { id },
    })

    if (!existingPromo) {
      return res.status(404).json({
        success: false,
        message: 'პრომო კოდი ვერ მოიძებნა',
      })
    }

    // კოდის უნიკალურობის შემოწმება (თუ იცვლება)
    if (code && code.toUpperCase() !== existingPromo.code) {
      const duplicateCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      })

      if (duplicateCode) {
        return res.status(400).json({
          success: false,
          message: 'ეს კოდი უკვე არსებობს',
        })
      }
    }

    // განახლების მონაცემების მომზადება
    const updateData: Prisma.PromoCodeUpdateInput = {}

    if (code !== undefined) updateData.code = code.toUpperCase()
    if (description !== undefined) updateData.description = description
    if (discountType !== undefined) updateData.discountType = discountType
    if (discountValue !== undefined) updateData.discountValue = discountValue
    if (scope !== undefined) updateData.scope = scope
    if (singleUsePerUser !== undefined) updateData.singleUsePerUser = singleUsePerUser
    if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount
    if (maxUses !== undefined) updateData.maxUses = maxUses
    if (isActive !== undefined) updateData.isActive = isActive

    // Scope-ის მიხედვით courseId/categoryId
    if (scope === 'COURSE') {
      updateData.course = courseId ? { connect: { id: courseId } } : undefined
      updateData.category = { disconnect: true }
    } else if (scope === 'CATEGORY') {
      updateData.category = categoryId ? { connect: { id: categoryId } } : undefined
      updateData.course = { disconnect: true }
    } else if (scope === 'ALL') {
      updateData.course = { disconnect: true }
      updateData.category = { disconnect: true }
    }

    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom)
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil)

    const promoCode = await prisma.promoCode.update({
      where: { id },
      data: updateData,
      include: {
        course: {
          select: { id: true, title: true }
        },
        category: {
          select: { id: true, name: true }
        },
      },
    })

    res.json({
      success: true,
      data: promoCode,
      message: 'პრომო კოდი წარმატებით განახლდა',
    })
  } catch (error) {
    console.error('updatePromoCode error:', error)
    res.status(500).json({
      success: false,
      message: 'პრომო კოდის განახლება ვერ მოხერხდა',
    })
  }
}

/**
 * პრომო კოდის წაშლა (Admin)
 */
export const deletePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const promoCode = await prisma.promoCode.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchases: true }
        }
      }
    })

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'პრომო კოდი ვერ მოიძებნა',
      })
    }

    // თუ გამოყენებული კოდია, მხოლოდ გავთიშოთ
    if (promoCode._count.purchases > 0) {
      await prisma.promoCode.update({
        where: { id },
        data: { isActive: false },
      })

      return res.json({
        success: true,
        message: 'პრომო კოდი გაითიშა (არ წაიშალა რადგან გამოყენებულია)',
      })
    }

    // წაშლა თუ არასდროს გამოუყენებიათ
    await prisma.promoCode.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: 'პრომო კოდი წარმატებით წაიშალა',
    })
  } catch (error) {
    console.error('deletePromoCode error:', error)
    res.status(500).json({
      success: false,
      message: 'პრომო კოდის წაშლა ვერ მოხერხდა',
    })
  }
}

/**
 * პრომო კოდის ჩართვა/გამორთვა (Admin)
 */
export const togglePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const promoCode = await prisma.promoCode.findUnique({
      where: { id },
    })

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'პრომო კოდი ვერ მოიძებნა',
      })
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: { isActive: !promoCode.isActive },
    })

    res.json({
      success: true,
      data: updated,
      message: updated.isActive ? 'პრომო კოდი გააქტიურდა' : 'პრომო კოდი გაითიშა',
    })
  } catch (error) {
    console.error('togglePromoCode error:', error)
    res.status(500).json({
      success: false,
      message: 'პრომო კოდის სტატუსის ცვლილება ვერ მოხერხდა',
    })
  }
}

/**
 * პრომო კოდის ვალიდაცია (Checkout-ისთვის)
 */
export const validatePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { code, courseId } = req.body

    if (!code || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'კოდი და კურსის ID აუცილებელია',
      })
    }

    // კურსის მოძიება
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, price: true, categoryId: true, title: true }
    })

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'კურსი ვერ მოიძებნა',
      })
    }

    // პრომო კოდის მოძიება
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!promoCode) {
      return res.status(400).json({
        success: false,
        message: 'არასწორი პრომო კოდი',
        code: 'INVALID_CODE',
      })
    }

    // ვალიდაცია
    const now = new Date()

    // აქტიურობა
    if (!promoCode.isActive) {
      return res.status(400).json({
        success: false,
        message: 'პრომო კოდი გამორთულია',
        code: 'CODE_DISABLED',
      })
    }

    // ვადები
    if (now < promoCode.validFrom) {
      return res.status(400).json({
        success: false,
        message: 'პრომო კოდი ჯერ არ მოქმედებს',
        code: 'CODE_NOT_STARTED',
      })
    }

    if (now > promoCode.validUntil) {
      return res.status(400).json({
        success: false,
        message: 'პრომო კოდი ვადაგასულია',
        code: 'CODE_EXPIRED',
      })
    }

    // გამოყენების ლიმიტი
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return res.status(400).json({
        success: false,
        message: 'პრომო კოდის ლიმიტი ამოწურულია',
        code: 'CODE_EXHAUSTED',
      })
    }

    // ერთჯერადი გამოყენება
    if (promoCode.singleUsePerUser && userId) {
      const usage = await prisma.promoCodeUsage.findUnique({
        where: {
          promoCodeId_userId: {
            promoCodeId: promoCode.id,
            userId,
          }
        }
      })

      if (usage) {
        return res.status(400).json({
          success: false,
          message: 'თქვენ უკვე გამოიყენეთ ეს პრომო კოდი',
          code: 'CODE_ALREADY_USED',
        })
      }
    }

    // Scope შემოწმება
    if (promoCode.scope === 'COURSE' && promoCode.courseId !== courseId) {
      return res.status(400).json({
        success: false,
        message: 'პრომო კოდი არ მოქმედებს ამ კურსზე',
        code: 'CODE_WRONG_COURSE',
      })
    }

    if (promoCode.scope === 'CATEGORY' && promoCode.categoryId !== course.categoryId) {
      return res.status(400).json({
        success: false,
        message: 'პრომო კოდი არ მოქმედებს ამ კატეგორიის კურსებზე',
        code: 'CODE_WRONG_CATEGORY',
      })
    }

    // მინიმალური თანხა
    const originalPrice = Number(course.price)
    if (promoCode.minOrderAmount && originalPrice < Number(promoCode.minOrderAmount)) {
      return res.status(400).json({
        success: false,
        message: `მინიმალური თანხა ${promoCode.minOrderAmount} ლარია`,
        code: 'MIN_ORDER_AMOUNT',
      })
    }

    // ფასდაკლების გამოთვლა
    let discountAmount: number
    if (promoCode.discountType === 'PERCENTAGE') {
      discountAmount = (originalPrice * Number(promoCode.discountValue)) / 100
    } else {
      // FIXED - არ უნდა აღემატებოდეს თავდაპირველ ფასს
      discountAmount = Math.min(Number(promoCode.discountValue), originalPrice)
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount)

    res.json({
      success: true,
      data: {
        valid: true,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: Number(promoCode.discountValue),
        originalPrice,
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalPrice: Math.round(finalPrice * 100) / 100,
        description: promoCode.description,
      },
    })
  } catch (error) {
    console.error('validatePromoCode error:', error)
    res.status(500).json({
      success: false,
      message: 'პრომო კოდის შემოწმება ვერ მოხერხდა',
    })
  }
}

/**
 * პრომო კოდების ანალიტიკა (Admin)
 */
export const getPromoCodeAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date()

    // ზოგადი სტატისტიკა
    const [
      totalCodes,
      activeCodes,
      totalUsage,
      revenueStats,
    ] = await Promise.all([
      prisma.promoCode.count(),
      prisma.promoCode.count({
        where: {
          isActive: true,
          validFrom: { lte: now },
          validUntil: { gte: now },
        }
      }),
      prisma.promoCode.aggregate({
        _sum: { usedCount: true }
      }),
      prisma.purchase.aggregate({
        where: {
          promoCodeId: { not: null },
          status: 'COMPLETED',
        },
        _sum: { amount: true, finalAmount: true },
        _count: true,
      }),
    ])

    // ტოპ კოდები გამოყენების მიხედვით
    const topCodes = await prisma.promoCode.findMany({
      where: { usedCount: { gt: 0 } },
      orderBy: { usedCount: 'desc' },
      take: 5,
      select: {
        id: true,
        code: true,
        usedCount: true,
        discountType: true,
        discountValue: true,
      }
    })

    // დაზოგილი თანხა
    const totalOriginal = Number(revenueStats._sum.amount || 0)
    const totalFinal = Number(revenueStats._sum.finalAmount || 0)
    const totalSaved = totalOriginal - totalFinal

    res.json({
      success: true,
      data: {
        overview: {
          totalCodes,
          activeCodes,
          totalUsage: totalUsage._sum.usedCount || 0,
          purchasesWithPromo: revenueStats._count,
        },
        revenue: {
          totalOriginal,
          totalFinal,
          totalSaved,
          averageDiscount: revenueStats._count > 0
            ? Math.round((totalSaved / revenueStats._count) * 100) / 100
            : 0,
        },
        topCodes,
      },
    })
  } catch (error) {
    console.error('getPromoCodeAnalytics error:', error)
    res.status(500).json({
      success: false,
      message: 'ანალიტიკის მიღება ვერ მოხერხდა',
    })
  }
}

/**
 * კურსებისა და კატეგორიების სია (დროფდაუნისთვის)
 */
export const getPromoCodeOptions = async (req: AuthRequest, res: Response) => {
  try {
    const [courses, categories] = await Promise.all([
      prisma.course.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, slug: true },
        orderBy: { title: 'asc' },
      }),
      prisma.category.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ])

    res.json({
      success: true,
      data: { courses, categories },
    })
  } catch (error) {
    console.error('getPromoCodeOptions error:', error)
    res.status(500).json({
      success: false,
      message: 'ოფციების მიღება ვერ მოხერხდა',
    })
  }
}
