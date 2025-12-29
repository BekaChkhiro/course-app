import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get page content for public (frontend)
export const getPublicPageContent = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const page = await prisma.pageContent.findUnique({
      where: { pageSlug: slug }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    if (!page.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Get public page content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch page content'
    });
  }
};

// Get all pages (admin)
export const getAllPages = async (req: Request, res: Response) => {
  try {
    const pages = await prisma.pageContent.findMany({
      orderBy: { pageSlug: 'asc' }
    });

    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('Get all pages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pages'
    });
  }
};

// Get page by slug (admin)
export const getPageBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const page = await prisma.pageContent.findUnique({
      where: { pageSlug: slug }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Get page by slug error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch page'
    });
  }
};

// Create or update page content (admin)
export const upsertPageContent = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { heroTitle, heroSubtitle, content, isActive } = req.body;

    if (!heroTitle) {
      return res.status(400).json({
        success: false,
        error: 'Hero title is required'
      });
    }

    const page = await prisma.pageContent.upsert({
      where: { pageSlug: slug },
      update: {
        heroTitle,
        ...(heroSubtitle !== undefined && { heroSubtitle }),
        ...(content !== undefined && { content }),
        ...(isActive !== undefined && { isActive })
      },
      create: {
        pageSlug: slug,
        heroTitle,
        heroSubtitle: heroSubtitle || null,
        content: content || null,
        isActive: isActive ?? true
      }
    });

    res.json({
      success: true,
      message: 'Page content updated successfully',
      data: page
    });
  } catch (error) {
    console.error('Upsert page content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update page content'
    });
  }
};

// Delete page (admin)
export const deletePage = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const page = await prisma.pageContent.findUnique({
      where: { pageSlug: slug }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    await prisma.pageContent.delete({
      where: { pageSlug: slug }
    });

    res.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete page'
    });
  }
};
