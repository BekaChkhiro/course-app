import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getAllSliders,
  getActiveSliders,
  getSliderById,
  createSlider,
  updateSlider,
  deleteSlider,
  reorderSliders,
  toggleSliderStatus
} from '../controllers/sliderController';

const router = express.Router();

// Public routes
router.get('/public', getActiveSliders);

// Admin routes
router.use(requireAuth, requireAdmin);

router.get('/', getAllSliders);
router.get('/:id', getSliderById);
router.post('/', createSlider);
router.put('/:id', updateSlider);
router.delete('/:id', deleteSlider);
router.post('/reorder', reorderSliders);
router.patch('/:id/toggle', toggleSliderStatus);

export default router;
