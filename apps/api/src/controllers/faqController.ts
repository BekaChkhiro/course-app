import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all FAQs (admin - includes inactive)
export const getAllFAQs = async (req: Request, res: Response) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      orderBy: { order: 'asc' }
    });

    res.json({ faqs });
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
};

// Get active FAQs only (public)
export const getActiveFAQs = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const faqs = await prisma.fAQ.findMany({
      where: {
        isActive: true,
        ...(category && { category: category as string })
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        order: true
      }
    });

    res.json({ faqs });
  } catch (error) {
    console.error('Get active FAQs error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
};

// Get FAQ by ID
export const getFAQById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const faq = await prisma.fAQ.findUnique({
      where: { id }
    });

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ faq });
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ' });
  }
};

// Create FAQ
export const createFAQ = async (req: Request, res: Response) => {
  try {
    const { question, answer, category, order, isActive } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    // Get max order if not provided
    let faqOrder = order;
    if (faqOrder === undefined) {
      const maxOrderFaq = await prisma.fAQ.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      faqOrder = (maxOrderFaq?.order ?? -1) + 1;
    }

    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        category: category || null,
        order: faqOrder,
        isActive: isActive ?? true
      }
    });

    res.status(201).json({
      message: 'FAQ created successfully',
      faq
    });
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
};

// Update FAQ
export const updateFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { question, answer, category, order, isActive } = req.body;

    const existingFaq = await prisma.fAQ.findUnique({
      where: { id }
    });

    if (!existingFaq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    const faq = await prisma.fAQ.update({
      where: { id },
      data: {
        ...(question !== undefined && { question }),
        ...(answer !== undefined && { answer }),
        ...(category !== undefined && { category }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      message: 'FAQ updated successfully',
      faq
    });
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
};

// Delete FAQ
export const deleteFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const faq = await prisma.fAQ.findUnique({
      where: { id }
    });

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    await prisma.fAQ.delete({
      where: { id }
    });

    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
};

// Reorder FAQs
export const reorderFAQs = async (req: Request, res: Response) => {
  try {
    const { faqs } = req.body; // Array of { id, order }

    if (!Array.isArray(faqs)) {
      return res.status(400).json({ error: 'FAQs must be an array' });
    }

    // Update all FAQs in a transaction
    await prisma.$transaction(
      faqs.map(({ id, order }) =>
        prisma.fAQ.update({
          where: { id },
          data: { order }
        })
      )
    );

    res.json({ message: 'FAQs reordered successfully' });
  } catch (error) {
    console.error('Reorder FAQs error:', error);
    res.status(500).json({ error: 'Failed to reorder FAQs' });
  }
};

// Toggle FAQ active status
export const toggleFAQStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const faq = await prisma.fAQ.findUnique({
      where: { id }
    });

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    const updatedFaq = await prisma.fAQ.update({
      where: { id },
      data: { isActive: !faq.isActive }
    });

    res.json({
      message: `FAQ ${updatedFaq.isActive ? 'activated' : 'deactivated'} successfully`,
      faq: updatedFaq
    });
  } catch (error) {
    console.error('Toggle FAQ status error:', error);
    res.status(500).json({ error: 'Failed to toggle FAQ status' });
  }
};

// Get FAQ categories
export const getFAQCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.fAQ.findMany({
      where: {
        category: { not: null }
      },
      select: { category: true },
      distinct: ['category']
    });

    const uniqueCategories = categories
      .map(c => c.category)
      .filter((c): c is string => c !== null);

    res.json({ categories: uniqueCategories });
  } catch (error) {
    console.error('Get FAQ categories error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ categories' });
  }
};
