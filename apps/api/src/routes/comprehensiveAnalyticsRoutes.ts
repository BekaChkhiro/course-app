import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import * as controller from '../controllers/comprehensiveAnalyticsController';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// ==========================================
// DASHBOARD ROUTES
// ==========================================

// GET /api/admin/analytics/dashboard - Get dashboard overview
router.get('/dashboard', controller.getDashboardOverview);

// GET /api/admin/analytics/dashboard/revenue-trend - Get revenue trend chart data
router.get('/dashboard/revenue-trend', controller.getRevenueTrend);

// GET /api/admin/analytics/dashboard/top-courses - Get top performing courses
router.get('/dashboard/top-courses', controller.getTopCourses);

// ==========================================
// REVENUE ANALYTICS ROUTES
// ==========================================

// GET /api/admin/analytics/revenue - Get comprehensive revenue analytics
router.get('/revenue', controller.getRevenueAnalytics);

// GET /api/admin/analytics/revenue/recurring - Get MRR/ARR
router.get('/revenue/recurring', controller.getRecurringRevenue);

// GET /api/admin/analytics/revenue/clv - Get customer lifetime value
router.get('/revenue/clv', controller.getCustomerLifetimeValue);

// GET /api/admin/analytics/revenue/conversion - Get conversion rates
router.get('/revenue/conversion', controller.getConversionRates);

// ==========================================
// STUDENT ANALYTICS ROUTES
// ==========================================

// GET /api/admin/analytics/students - Get student analytics
router.get('/students', controller.getStudentAnalytics);

// GET /api/admin/analytics/students/cohorts - Get cohort retention analysis
router.get('/students/cohorts', controller.getCohortRetention);

// ==========================================
// COURSE PERFORMANCE ROUTES
// ==========================================

// GET /api/admin/analytics/courses - Get all courses performance
router.get('/courses', controller.getAllCoursesPerformance);

// GET /api/admin/analytics/courses/:courseId - Get specific course performance
router.get('/courses/:courseId', controller.getCoursePerformance);

// ==========================================
// LEARNING ANALYTICS ROUTES
// ==========================================

// GET /api/admin/analytics/learning - Get learning analytics
router.get('/learning', controller.getLearningAnalytics);

// ==========================================
// ENGAGEMENT METRICS ROUTES
// ==========================================

// GET /api/admin/analytics/engagement - Get engagement metrics
router.get('/engagement', controller.getEngagementMetrics);

// ==========================================
// REAL-TIME MONITORING ROUTES
// ==========================================

// GET /api/admin/analytics/realtime - Get real-time activity
router.get('/realtime', controller.getRealtimeActivity);

// ==========================================
// CUSTOM REPORTS ROUTES
// ==========================================

// POST /api/admin/analytics/reports - Create custom report
router.post('/reports', controller.createCustomReport);

// GET /api/admin/analytics/reports - Get user's reports
router.get('/reports', controller.getUserReports);

// GET /api/admin/analytics/reports/templates - Get report templates
router.get('/reports/templates', controller.getReportTemplates);

// PUT /api/admin/analytics/reports/:reportId - Update custom report
router.put('/reports/:reportId', controller.updateCustomReport);

// DELETE /api/admin/analytics/reports/:reportId - Delete custom report
router.delete('/reports/:reportId', controller.deleteCustomReport);

// ==========================================
// EXPORT ROUTES
// ==========================================

// POST /api/admin/analytics/export - Create export job
router.post('/export', controller.createExportJob);

// GET /api/admin/analytics/export - Get user's export jobs
router.get('/export', controller.getUserExportJobs);

// GET /api/admin/analytics/export/revenue - Export revenue data as CSV
router.get('/export/revenue', controller.exportRevenueData);

// GET /api/admin/analytics/export/students - Export students data as CSV
router.get('/export/students', controller.exportStudentsData);

// GET /api/admin/analytics/export/courses - Export courses data as CSV
router.get('/export/courses', controller.exportCoursesData);

// ==========================================
// PREDICTIVE ANALYTICS ROUTES
// ==========================================

// GET /api/admin/analytics/predictive - Get predictive analytics overview
router.get('/predictive', controller.getPredictiveAnalytics);

// GET /api/admin/analytics/predictive/churn - Get churn prediction
router.get('/predictive/churn', controller.getChurnPrediction);

// GET /api/admin/analytics/predictive/revenue-forecast - Get revenue forecast
router.get('/predictive/revenue-forecast', controller.getRevenueForecast);

// GET /api/admin/analytics/predictive/demand - Get demand prediction
router.get('/predictive/demand', controller.getDemandPrediction);

// ==========================================
// LIVE USERS ROUTES
// ==========================================

// GET /api/admin/analytics/realtime/users - Get live users
router.get('/realtime/users', controller.getLiveUsers);

// ==========================================
// RUN CUSTOM REPORT ROUTE
// ==========================================

// POST /api/admin/analytics/reports/:reportId/run - Run custom report
router.post('/reports/:reportId/run', controller.runCustomReport);

export default router;
