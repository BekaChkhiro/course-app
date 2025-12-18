import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getAllFAQs,
  getActiveFAQs,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  reorderFAQs,
  toggleFAQStatus,
  getFAQCategories
} from '../controllers/faqController';

const router = express.Router();

// Public routes
router.get('/public', getActiveFAQs);
router.get('/categories', getFAQCategories);

// Admin routes
router.use(requireAuth, requireAdmin);

router.get('/', getAllFAQs);
router.get('/:id', getFAQById);
router.post('/', createFAQ);
router.put('/:id', updateFAQ);
router.delete('/:id', deleteFAQ);
router.post('/reorder', reorderFAQs);
router.patch('/:id/toggle', toggleFAQStatus);

export default router;
