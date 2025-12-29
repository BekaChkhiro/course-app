import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getPublicPageContent,
  getAllPages,
  getPageBySlug,
  upsertPageContent,
  deletePage
} from '../controllers/pageContentController';

const router = express.Router();

// Public routes
router.get('/public/:slug', getPublicPageContent);

// Admin routes
router.use(requireAuth, requireAdmin);

router.get('/', getAllPages);
router.get('/:slug', getPageBySlug);
router.put('/:slug', upsertPageContent);
router.delete('/:slug', deletePage);

export default router;
