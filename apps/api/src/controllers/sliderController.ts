import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all sliders (admin - includes inactive)
export const getAllSliders = async (req: Request, res: Response) => {
  try {
    const sliders = await prisma.slider.findMany({
      orderBy: { order: 'asc' }
    });

    res.json({ sliders });
  } catch (error) {
    console.error('Get sliders error:', error);
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
};

// Get active sliders only (public)
export const getActiveSliders = async (req: Request, res: Response) => {
  try {
    const sliders = await prisma.slider.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        imageUrl: true,
        linkUrl: true,
        order: true
      }
    });

    res.json({ sliders });
  } catch (error) {
    console.error('Get active sliders error:', error);
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
};

// Get slider by ID
export const getSliderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const slider = await prisma.slider.findUnique({
      where: { id }
    });

    if (!slider) {
      return res.status(404).json({ error: 'Slider not found' });
    }

    res.json({ slider });
  } catch (error) {
    console.error('Get slider error:', error);
    res.status(500).json({ error: 'Failed to fetch slider' });
  }
};

// Create slider
export const createSlider = async (req: Request, res: Response) => {
  try {
    const { imageUrl, linkUrl, order, isActive } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Get max order if not provided
    let sliderOrder = order;
    if (sliderOrder === undefined) {
      const maxOrderSlider = await prisma.slider.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      sliderOrder = (maxOrderSlider?.order ?? -1) + 1;
    }

    const slider = await prisma.slider.create({
      data: {
        imageUrl,
        linkUrl: linkUrl || null,
        order: sliderOrder,
        isActive: isActive ?? true
      }
    });

    res.status(201).json({
      message: 'Slider created successfully',
      slider
    });
  } catch (error) {
    console.error('Create slider error:', error);
    res.status(500).json({ error: 'Failed to create slider' });
  }
};

// Update slider
export const updateSlider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imageUrl, linkUrl, order, isActive } = req.body;

    const existingSlider = await prisma.slider.findUnique({
      where: { id }
    });

    if (!existingSlider) {
      return res.status(404).json({ error: 'Slider not found' });
    }

    const slider = await prisma.slider.update({
      where: { id },
      data: {
        ...(imageUrl !== undefined && { imageUrl }),
        ...(linkUrl !== undefined && { linkUrl }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      message: 'Slider updated successfully',
      slider
    });
  } catch (error) {
    console.error('Update slider error:', error);
    res.status(500).json({ error: 'Failed to update slider' });
  }
};

// Delete slider
export const deleteSlider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const slider = await prisma.slider.findUnique({
      where: { id }
    });

    if (!slider) {
      return res.status(404).json({ error: 'Slider not found' });
    }

    await prisma.slider.delete({
      where: { id }
    });

    res.json({ message: 'Slider deleted successfully' });
  } catch (error) {
    console.error('Delete slider error:', error);
    res.status(500).json({ error: 'Failed to delete slider' });
  }
};

// Reorder sliders
export const reorderSliders = async (req: Request, res: Response) => {
  try {
    const { sliders } = req.body; // Array of { id, order }

    if (!Array.isArray(sliders)) {
      return res.status(400).json({ error: 'Sliders must be an array' });
    }

    // Update all sliders in a transaction
    await prisma.$transaction(
      sliders.map(({ id, order }) =>
        prisma.slider.update({
          where: { id },
          data: { order }
        })
      )
    );

    res.json({ message: 'Sliders reordered successfully' });
  } catch (error) {
    console.error('Reorder sliders error:', error);
    res.status(500).json({ error: 'Failed to reorder sliders' });
  }
};

// Toggle slider active status
export const toggleSliderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const slider = await prisma.slider.findUnique({
      where: { id }
    });

    if (!slider) {
      return res.status(404).json({ error: 'Slider not found' });
    }

    const updatedSlider = await prisma.slider.update({
      where: { id },
      data: { isActive: !slider.isActive }
    });

    res.json({
      message: `Slider ${updatedSlider.isActive ? 'activated' : 'deactivated'} successfully`,
      slider: updatedSlider
    });
  } catch (error) {
    console.error('Toggle slider status error:', error);
    res.status(500).json({ error: 'Failed to toggle slider status' });
  }
};
