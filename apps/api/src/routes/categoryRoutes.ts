import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} from '../controllers/categoryController';

const router = express.Router();

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin routes
router.use(requireAuth, requireAdmin);

router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.post('/reorder', reorderCategories);

export default router;
