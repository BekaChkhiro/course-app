import { Request, Response } from 'express';
import {
  dashboardService,
  revenueService,
  studentService,
  coursePerformanceService,
  learningService,
  engagementService,
  realtimeService,
  reportsService,
  exportService,
  predictiveService,
  liveUsersService
} from '../services/analyticsService';

// ==========================================
// DASHBOARD CONTROLLER
// ==========================================

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const data = await dashboardService.getDashboardOverview(parseInt(period as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview'
    });
  }
};

export const getRevenueTrend = async (req: Request, res: Response) => {
  try {
    const { months = '12' } = req.query;
    const data = await dashboardService.getRevenueTrend(parseInt(months as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get revenue trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue trend'
    });
  }
};

export const getTopCourses = async (req: Request, res: Response) => {
  try {
    const { limit = '5' } = req.query;
    const data = await dashboardService.getTopCourses(parseInt(limit as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get top courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top courses'
    });
  }
};

// ==========================================
// REVENUE ANALYTICS CONTROLLER
// ==========================================

export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const data = await revenueService.getRevenueAnalytics({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      groupBy: groupBy as 'day' | 'week' | 'month' | undefined
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics'
    });
  }
};

export const getRecurringRevenue = async (req: Request, res: Response) => {
  try {
    const data = await revenueService.getRecurringRevenue();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get recurring revenue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recurring revenue'
    });
  }
};

export const getCustomerLifetimeValue = async (req: Request, res: Response) => {
  try {
    const data = await revenueService.getCustomerLifetimeValue();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get CLV error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer lifetime value'
    });
  }
};

export const getConversionRates = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const data = await revenueService.getConversionRates(parseInt(period as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get conversion rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion rates'
    });
  }
};

// ==========================================
// STUDENT ANALYTICS CONTROLLER
// ==========================================

export const getStudentAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const data = await studentService.getStudentAnalytics(parseInt(period as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get student analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student analytics'
    });
  }
};

export const getCohortRetention = async (req: Request, res: Response) => {
  try {
    const data = await studentService.getCohortRetention();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get cohort retention error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cohort retention'
    });
  }
};

// ==========================================
// COURSE PERFORMANCE CONTROLLER
// ==========================================

export const getCoursePerformance = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const data = await coursePerformanceService.getCoursePerformance(courseId);

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Get course performance error:', error);
    if (error.message === 'Course not found') {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course performance'
    });
  }
};

export const getAllCoursesPerformance = async (req: Request, res: Response) => {
  try {
    const data = await coursePerformanceService.getAllCoursesPerformance();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get all courses performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses performance'
    });
  }
};

// ==========================================
// LEARNING ANALYTICS CONTROLLER
// ==========================================

export const getLearningAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const data = await learningService.getLearningAnalytics(parseInt(period as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get learning analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning analytics'
    });
  }
};

// ==========================================
// ENGAGEMENT METRICS CONTROLLER
// ==========================================

export const getEngagementMetrics = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const data = await engagementService.getEngagementMetrics(parseInt(period as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get engagement metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engagement metrics'
    });
  }
};

// ==========================================
// REAL-TIME MONITORING CONTROLLER
// ==========================================

export const getRealtimeActivity = async (req: Request, res: Response) => {
  try {
    const data = await realtimeService.getRealtimeActivity();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get realtime activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch realtime activity'
    });
  }
};

// ==========================================
// CUSTOM REPORTS CONTROLLER
// ==========================================

export const createCustomReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = await reportsService.createReport(userId, req.body);

    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Create custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create custom report'
    });
  }
};

export const getUserReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = await reportsService.getUserReports(userId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user reports'
    });
  }
};

export const getReportTemplates = async (req: Request, res: Response) => {
  try {
    const data = await reportsService.getTemplates();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get report templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report templates'
    });
  }
};

export const updateCustomReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { reportId } = req.params;
    const data = await reportsService.updateReport(reportId, userId, req.body);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Update custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update custom report'
    });
  }
};

export const deleteCustomReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { reportId } = req.params;
    await reportsService.deleteReport(reportId, userId);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete custom report'
    });
  }
};

// ==========================================
// EXPORT CONTROLLER
// ==========================================

export const createExportJob = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { exportType, reportType, filters, startDate, endDate } = req.body;

    const data = await exportService.createExportJob(userId, {
      exportType,
      reportType,
      filters,
      dateRange: startDate && endDate ? {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      } : undefined
    });

    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Create export job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create export job'
    });
  }
};

export const getUserExportJobs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = await exportService.getUserExportJobs(userId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get user export jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch export jobs'
    });
  }
};

export const exportRevenueData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const data = await exportService.generateRevenueCSV(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-${startDate}-${endDate}.csv`);

    // Convert to CSV
    if (data.length === 0) {
      return res.send('No data found for the specified date range');
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    res.send(csv);
  } catch (error) {
    console.error('Export revenue data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export revenue data'
    });
  }
};

export const exportStudentsData = async (req: Request, res: Response) => {
  try {
    const data = await exportService.generateStudentsCSV();

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=students-${new Date().toISOString().split('T')[0]}.csv`);

    // Convert to CSV
    if (data.length === 0) {
      return res.send('No student data found');
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    res.send(csv);
  } catch (error) {
    console.error('Export students data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export students data'
    });
  }
};

// ==========================================
// PREDICTIVE ANALYTICS CONTROLLER
// ==========================================

export const getPredictiveAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '6' } = req.query;
    const data = await predictiveService.getPredictiveAnalytics(parseInt(period as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get predictive analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictive analytics'
    });
  }
};

export const getChurnPrediction = async (req: Request, res: Response) => {
  try {
    const data = await predictiveService.getChurnPrediction();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get churn prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch churn prediction'
    });
  }
};

export const getRevenueForecast = async (req: Request, res: Response) => {
  try {
    const { months = '6' } = req.query;
    const data = await predictiveService.getRevenueForecast(parseInt(months as string));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get revenue forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue forecast'
    });
  }
};

export const getDemandPrediction = async (req: Request, res: Response) => {
  try {
    const data = await predictiveService.getDemandPrediction();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get demand prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demand prediction'
    });
  }
};

// ==========================================
// LIVE USERS CONTROLLER
// ==========================================

export const getLiveUsers = async (req: Request, res: Response) => {
  try {
    const data = await liveUsersService.getLiveUsers();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get live users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live users'
    });
  }
};

// ==========================================
// RUN CUSTOM REPORT CONTROLLER
// ==========================================

export const runCustomReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    // For now, return a placeholder - actual implementation would generate the report
    res.json({
      success: true,
      data: {
        reportId,
        status: 'completed',
        url: `/api/admin/analytics/reports/${reportId}/download`
      }
    });
  } catch (error) {
    console.error('Run custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run custom report'
    });
  }
};

// ==========================================
// EXPORT COURSES CONTROLLER
// ==========================================

export const exportCoursesData = async (req: Request, res: Response) => {
  try {
    const courses = await coursePerformanceService.getAllCoursesPerformance();

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=courses-${new Date().toISOString().split('T')[0]}.csv`);

    // Convert to CSV
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.send('No course data found');
    }

    const headers = ['id', 'title', 'category', 'status', 'revenue', 'enrollments', 'avgRating', 'reviews'];
    const rows = (courses as any[]).map(course => [
      course.id,
      `"${(course.title || '').replace(/"/g, '""')}"`,
      `"${(course.category || '').replace(/"/g, '""')}"`,
      course.status,
      course.revenue || 0,
      course.enrollments || 0,
      course.avgRating || 0,
      course.reviews || 0
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.send(csv);
  } catch (error) {
    console.error('Export courses data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export courses data'
    });
  }
};

// ==========================================
// EXPORT OPTIONS CONTROLLER
// ==========================================

export const getExportOptions = async (req: Request, res: Response) => {
  try {
    const [years, courses] = await Promise.all([
      exportService.getAvailableYears(),
      exportService.getCoursesForExport()
    ]);

    const georgianMonths = [
      { value: 1, label: 'იანვარი' },
      { value: 2, label: 'თებერვალი' },
      { value: 3, label: 'მარტი' },
      { value: 4, label: 'აპრილი' },
      { value: 5, label: 'მაისი' },
      { value: 6, label: 'ივნისი' },
      { value: 7, label: 'ივლისი' },
      { value: 8, label: 'აგვისტო' },
      { value: 9, label: 'სექტემბერი' },
      { value: 10, label: 'ოქტომბერი' },
      { value: 11, label: 'ნოემბერი' },
      { value: 12, label: 'დეკემბერი' }
    ];

    res.json({
      success: true,
      data: {
        years,
        months: georgianMonths,
        courses
      }
    });
  } catch (error) {
    console.error('Get export options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch export options'
    });
  }
};

// ==========================================
// EXPORT MONTHLY PURCHASES CONTROLLER
// ==========================================

export const exportMonthlyPurchases = async (req: Request, res: Response) => {
  try {
    const { year, month, courseId } = req.query;

    // Validate year
    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Year is required'
      });
    }

    const yearNum = parseInt(year as string);
    const currentYear = new Date().getFullYear();

    if (isNaN(yearNum) || yearNum < 2020 || yearNum > currentYear + 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year'
      });
    }

    // Validate month (optional)
    let monthNum: number | undefined;
    if (month) {
      monthNum = parseInt(month as string);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month'
        });
      }
    }

    // Validate courseId (optional)
    const courseIdStr = courseId ? (courseId as string) : undefined;

    // Generate Excel file
    const buffer = await exportService.generateMonthlyPurchasesExcel(
      yearNum,
      monthNum,
      courseIdStr
    );

    // Generate filename
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const filename = monthNum
      ? `purchases-${yearNum}-${monthNames[monthNum - 1]}.xlsx`
      : `purchases-${yearNum}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);

    // Send buffer
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Export monthly purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export purchases data'
    });
  }
};
