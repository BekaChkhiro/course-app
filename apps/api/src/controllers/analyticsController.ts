import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to convert BigInt, Date, and Decimal values for JSON serialization
function serializeQueryResult(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data);
  if (data instanceof Date) return data.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  // Handle Prisma Decimal (has toNumber method) or string numbers from raw queries
  if (typeof data === 'object' && data.constructor?.name === 'Decimal') {
    return data.toNumber();
  }
  if (Array.isArray(data)) return data.map(serializeQueryResult);
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      const value = data[key];
      // First recursively process the value
      const processedValue = serializeQueryResult(value);
      // Then convert numeric strings to numbers
      if (typeof processedValue === 'string' && !isNaN(Number(processedValue)) && processedValue !== '' && !processedValue.includes('-')) {
        result[key] = parseFloat(processedValue);
      } else {
        result[key] = processedValue;
      }
    }
    return result;
  }
  return data;
}

// Get consolidated analytics for the unified dashboard
export const getConsolidatedAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // ===== PAYMENTS SECTION =====

    // Current period revenue
    const currentRevenue = await prisma.purchase.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      _sum: { finalAmount: true },
      _count: true
    });

    // Previous period revenue for comparison
    const previousRevenue = await prisma.purchase.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: prevStartDate, lt: startDate }
      },
      _sum: { finalAmount: true },
      _count: true
    });

    // Calculate growth
    const currentTotal = Number(currentRevenue._sum.finalAmount) || 0;
    const previousTotal = Number(previousRevenue._sum.finalAmount) || 0;
    const revenueGrowth = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)
      : currentTotal > 0 ? '100' : '0';

    // Average order value
    const avgOrderValue = currentRevenue._count > 0
      ? currentTotal / currentRevenue._count
      : 0;

    // Revenue trend for chart
    const revenueTrend = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') as date,
        COALESCE(SUM("finalAmount")::float, 0) as revenue,
        COUNT(*)::int as purchases
      FROM purchases
      WHERE status = 'COMPLETED'
        AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `;

    // Top courses by revenue
    const topCoursesByRevenue = await prisma.$queryRaw`
      SELECT
        c.id,
        c.title,
        c.slug,
        COALESCE(SUM(p."finalAmount")::float, 0) as revenue,
        COUNT(p.id)::int as purchases
      FROM purchases p
      JOIN courses c ON p."courseId" = c.id
      WHERE p.status = 'COMPLETED'
        AND p."createdAt" >= ${startDate}
      GROUP BY c.id, c.title, c.slug
      ORDER BY revenue DESC
      LIMIT 5
    `;

    // ===== USERS SECTION =====

    // Total students
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT' }
    });

    // Previous period total for growth
    const prevTotalStudents = await prisma.user.count({
      where: {
        role: 'STUDENT',
        createdAt: { lt: startDate }
      }
    });

    // New registrations in period
    const newRegistrations = await prisma.user.count({
      where: {
        role: 'STUDENT',
        createdAt: { gte: startDate }
      }
    });

    // Previous period registrations
    const prevRegistrations = await prisma.user.count({
      where: {
        role: 'STUDENT',
        createdAt: { gte: prevStartDate, lt: startDate }
      }
    });

    const registrationGrowth = prevRegistrations > 0
      ? ((newRegistrations - prevRegistrations) / prevRegistrations * 100).toFixed(1)
      : newRegistrations > 0 ? '100' : '0';

    // Active students (with purchases in period)
    const activeStudents = await prisma.purchase.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      select: { userId: true },
      distinct: ['userId']
    });

    // Registration trend for chart
    const registrationTrend = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') as date,
        COUNT(*)::int as registrations
      FROM users
      WHERE role = 'STUDENT' AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `;

    // ===== COURSES SECTION =====

    // Total courses
    const totalCourses = await prisma.course.count({
      where: { status: 'PUBLISHED' }
    });

    // Total enrollments in period
    const totalEnrollments = await prisma.purchase.count({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      }
    });

    // Previous period enrollments
    const prevEnrollments = await prisma.purchase.count({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: prevStartDate, lt: startDate }
      }
    });

    const enrollmentGrowth = prevEnrollments > 0
      ? ((totalEnrollments - prevEnrollments) / prevEnrollments * 100).toFixed(1)
      : totalEnrollments > 0 ? '100' : '0';

    // Average rating
    const avgRating = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: true
    });

    // Completion rate
    const completionStats = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT CASE WHEN pr."isCompleted" = true THEN pr."userId" || '-' || pr."courseVersionId" END) as completed,
        COUNT(DISTINCT pr."userId" || '-' || pr."courseVersionId") as total
      FROM progress pr
    ` as any[];

    const completedCount = Number(completionStats[0]?.completed || 0);
    const totalCount = Number(completionStats[0]?.total || 0);
    const completionRate = totalCount > 0
      ? ((completedCount / totalCount) * 100).toFixed(1)
      : '0';

    // Top courses by enrollments
    const topCoursesByEnrollments = await prisma.$queryRaw`
      SELECT
        c.id,
        c.title,
        c.slug,
        COUNT(p.id)::int as enrollments,
        COALESCE(AVG(r.rating)::float, 0) as avg_rating
      FROM courses c
      LEFT JOIN purchases p ON c.id = p."courseId" AND p.status = 'COMPLETED'
      LEFT JOIN reviews r ON c.id = r."courseId"
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id, c.title, c.slug
      ORDER BY enrollments DESC
      LIMIT 5
    `;

    res.json({
      success: true,
      data: serializeQueryResult({
        payments: {
          totalRevenue: currentTotal,
          purchases: currentRevenue._count,
          avgOrderValue: Math.round(avgOrderValue),
          growth: parseFloat(revenueGrowth as string),
          trend: revenueTrend,
          topCourses: topCoursesByRevenue
        },
        users: {
          total: totalStudents,
          active: activeStudents.length,
          newRegistrations,
          growth: parseFloat(registrationGrowth as string),
          trend: registrationTrend
        },
        courses: {
          total: totalCourses,
          enrollments: totalEnrollments,
          enrollmentGrowth: parseFloat(enrollmentGrowth as string),
          avgRating: avgRating._avg.rating || 0,
          totalReviews: avgRating._count,
          completionRate: parseFloat(completionRate),
          topCourses: topCoursesByEnrollments
        },
        period: days
      })
    });
  } catch (error) {
    console.error('Get consolidated analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
};

// Get admin dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query; // days
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total revenue
    const revenueData = await prisma.purchase.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      _sum: { finalAmount: true },
      _count: true
    });

    // All-time revenue
    const allTimeRevenue = await prisma.purchase.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { finalAmount: true }
    });

    // Active students (purchased courses in period)
    const activeStudents = await prisma.purchase.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      select: { userId: true },
      distinct: ['userId']
    });

    // Total registered students
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT' }
    });

    // Popular courses (by purchases)
    const popularCourses = await prisma.course.findMany({
      take: 5,
      include: {
        _count: { select: { purchases: true } },
        category: { select: { name: true } }
      },
      orderBy: {
        purchases: { _count: 'desc' }
      }
    });

    // Recent comments (unread/all)
    const recentComments = await prisma.comment.count({
      where: {
        createdAt: { gte: startDate }
      }
    });

    // Course completion rates
    const completionData = await prisma.$queryRaw`
      SELECT
        c.id,
        c.title,
        COUNT(DISTINCT p.user_id) as enrolled_students,
        COUNT(DISTINCT CASE WHEN pr.is_completed = true THEN pr.user_id END) as completed_students,
        ROUND(
          COUNT(DISTINCT CASE WHEN pr.is_completed = true THEN pr.user_id END)::numeric /
          NULLIF(COUNT(DISTINCT p.user_id), 0) * 100,
          2
        ) as completion_rate
      FROM courses c
      LEFT JOIN purchases p ON c.id = p.course_id AND p.status = 'COMPLETED'
      LEFT JOIN progress pr ON pr.course_version_id IN (
        SELECT id FROM course_versions WHERE course_id = c.id
      )
      WHERE p.id IS NOT NULL
      GROUP BY c.id, c.title
      ORDER BY completion_rate DESC
      LIMIT 5
    `;

    // Revenue trend by day (last 30 days)
    const revenueTrend = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        SUM(final_amount) as revenue,
        COUNT(*) as purchases
      FROM purchases
      WHERE status = 'COMPLETED'
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Course statistics
    const courseStats = await prisma.course.groupBy({
      by: ['status'],
      _count: true
    });

    res.json({
      revenue: {
        total: revenueData._sum.finalAmount || 0,
        allTime: allTimeRevenue._sum.finalAmount || 0,
        purchases: revenueData._count,
        trend: revenueTrend
      },
      students: {
        active: activeStudents.length,
        total: totalStudents,
        growth: ((activeStudents.length / totalStudents) * 100).toFixed(2)
      },
      courses: {
        popular: popularCourses.map(course => ({
          id: course.id,
          title: course.title,
          category: course.category.name,
          purchases: course._count.purchases
        })),
        byStatus: courseStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count;
          return acc;
        }, {} as Record<string, number>)
      },
      engagement: {
        recentComments,
        completionRates: completionData
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Get revenue analytics
export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let dateFormat = 'DATE(created_at)';
    if (groupBy === 'month') {
      dateFormat = 'DATE_TRUNC(\'month\', created_at)';
    } else if (groupBy === 'week') {
      dateFormat = 'DATE_TRUNC(\'week\', created_at)';
    }

    const whereClause = startDate && endDate
      ? `WHERE status = 'COMPLETED' AND created_at BETWEEN '${startDate}' AND '${endDate}'`
      : `WHERE status = 'COMPLETED'`;

    const revenueData = await prisma.$queryRawUnsafe(`
      SELECT
        ${dateFormat} as period,
        SUM(final_amount) as revenue,
        SUM(amount - final_amount) as discount,
        COUNT(*) as purchases,
        AVG(final_amount) as avg_order_value
      FROM purchases
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `);

    // Revenue by category
    const revenueByCategory = await prisma.$queryRaw`
      SELECT
        cat.name as category,
        SUM(p.final_amount) as revenue,
        COUNT(p.id) as purchases
      FROM purchases p
      JOIN courses c ON p.course_id = c.id
      JOIN categories cat ON c.category_id = cat.id
      WHERE p.status = 'COMPLETED'
      GROUP BY cat.name
      ORDER BY revenue DESC
    `;

    // Top selling courses
    const topCourses = await prisma.$queryRaw`
      SELECT
        c.id,
        c.title,
        SUM(p.final_amount) as revenue,
        COUNT(p.id) as purchases,
        AVG(p.final_amount) as avg_price
      FROM purchases p
      JOIN courses c ON p.course_id = c.id
      WHERE p.status = 'COMPLETED'
      GROUP BY c.id, c.title
      ORDER BY revenue DESC
      LIMIT 10
    `;

    res.json({
      timeline: revenueData,
      byCategory: revenueByCategory,
      topCourses
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
};

// Get student analytics
export const getStudentAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Student registration trend
    const registrationTrend = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as registrations
      FROM users
      WHERE role = 'STUDENT' AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Student engagement (active users by purchases/progress)
    const engagement = await prisma.$queryRaw`
      SELECT
        DATE(last_active_at) as date,
        COUNT(DISTINCT user_id) as active_users
      FROM device_sessions
      WHERE last_active_at >= ${startDate}
      GROUP BY DATE(last_active_at)
      ORDER BY date ASC
    `;

    // Course enrollment distribution
    const enrollmentDistribution = await prisma.$queryRaw`
      SELECT
        COUNT(CASE WHEN purchase_count = 1 THEN 1 END) as one_course,
        COUNT(CASE WHEN purchase_count BETWEEN 2 AND 3 THEN 1 END) as two_to_three,
        COUNT(CASE WHEN purchase_count BETWEEN 4 AND 5 THEN 1 END) as four_to_five,
        COUNT(CASE WHEN purchase_count > 5 THEN 1 END) as more_than_five
      FROM (
        SELECT user_id, COUNT(*) as purchase_count
        FROM purchases
        WHERE status = 'COMPLETED'
        GROUP BY user_id
      ) as user_purchases
    `;

    // Top students by progress
    const topStudents = await prisma.$queryRaw`
      SELECT
        u.id,
        u.name,
        u.surname,
        u.email,
        COUNT(DISTINCT p.course_id) as courses_enrolled,
        COUNT(DISTINCT CASE WHEN pr.is_completed = true THEN pr.chapter_id END) as chapters_completed,
        AVG(CASE WHEN pr.is_completed = true THEN 100 ELSE 0 END) as avg_completion
      FROM users u
      LEFT JOIN purchases p ON u.id = p.user_id AND p.status = 'COMPLETED'
      LEFT JOIN progress pr ON u.id = pr.user_id
      WHERE u.role = 'STUDENT'
      GROUP BY u.id, u.name, u.surname, u.email
      HAVING COUNT(DISTINCT p.course_id) > 0
      ORDER BY avg_completion DESC, chapters_completed DESC
      LIMIT 10
    `;

    res.json({
      registrationTrend,
      engagement,
      enrollmentDistribution: enrollmentDistribution[0],
      topStudents
    });
  } catch (error) {
    console.error('Get student analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch student analytics' });
  }
};

// Get course performance analytics
export const getCourseAnalytics = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    // Course overview
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: true,
        author: { select: { name: true, surname: true } },
        _count: { select: { purchases: true, reviews: true } }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Revenue
    const revenue = await prisma.purchase.aggregate({
      where: { courseId, status: 'COMPLETED' },
      _sum: { finalAmount: true },
      _count: true
    });

    // Rating statistics
    const ratingStats = await prisma.review.groupBy({
      where: { courseId },
      by: ['rating'],
      _count: true
    });

    const avgRating = await prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true }
    });

    // Chapter completion rates
    const chapterStats = await prisma.$queryRaw`
      SELECT
        ch.id,
        ch.title,
        ch.order,
        COUNT(DISTINCT pr.user_id) as started,
        COUNT(DISTINCT CASE WHEN pr.is_completed = true THEN pr.user_id END) as completed,
        ROUND(
          COUNT(DISTINCT CASE WHEN pr.is_completed = true THEN pr.user_id END)::numeric /
          NULLIF(COUNT(DISTINCT pr.user_id), 0) * 100,
          2
        ) as completion_rate
      FROM chapters ch
      JOIN course_versions cv ON ch.course_version_id = cv.id
      LEFT JOIN progress pr ON ch.id = pr.chapter_id
      WHERE cv.course_id = ${courseId}
      GROUP BY ch.id, ch.title, ch.order
      ORDER BY ch.order ASC
    `;

    // Enrollment trend
    const enrollmentTrend = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as enrollments,
        SUM(final_amount) as revenue
      FROM purchases
      WHERE course_id = ${courseId} AND status = 'COMPLETED'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      course: {
        id: course.id,
        title: course.title,
        category: course.category.name,
        author: `${course.author.name} ${course.author.surname}`,
        price: course.price,
        status: course.status
      },
      revenue: {
        total: revenue._sum.finalAmount || 0,
        enrollments: revenue._count
      },
      ratings: {
        average: avgRating._avg.rating || 0,
        total: course._count.reviews,
        distribution: ratingStats.reduce((acc, stat) => {
          acc[`${stat.rating}_star`] = stat._count;
          return acc;
        }, {} as Record<string, number>)
      },
      chapterPerformance: chapterStats,
      enrollmentTrend
    });
  } catch (error) {
    console.error('Get course analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch course analytics' });
  }
};
