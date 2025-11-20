import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all categories with hierarchical structure
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { includeChildren } = req.query;

    if (includeChildren === 'true') {
      // Get all categories with their children
      const categories = await prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: {
            orderBy: { order: 'asc' },
            include: {
              _count: { select: { courses: true } }
            }
          },
          _count: { select: { courses: true } }
        },
        orderBy: { order: 'asc' }
      });

      return res.json({ categories });
    }

    // Get flat list
    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { courses: true, children: true } }
      },
      orderBy: { order: 'asc' }
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get category by ID
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { courses: true } } }
        },
        courses: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            thumbnail: true,
            price: true
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: { select: { courses: true, children: true } }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

// Create category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon, parentId, order } = req.body;

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this slug already exists' });
    }

    // If parentId is provided, verify it exists
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId }
      });

      if (!parentCategory) {
        return res.status(404).json({ error: 'Parent category not found' });
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        icon,
        parentId,
        order: order || 0
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { courses: true, children: true } }
      }
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, parentId, order } = req.body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if slug is being changed and if it's unique
    if (slug && slug !== existingCategory.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug }
      });

      if (slugExists) {
        return res.status(400).json({ error: 'Category with this slug already exists' });
      }
    }

    // Prevent setting itself as parent
    if (parentId === id) {
      return res.status(400).json({ error: 'Category cannot be its own parent' });
    }

    // Prevent circular references
    if (parentId) {
      let currentParent = await prisma.category.findUnique({
        where: { id: parentId },
        include: { parent: true }
      });

      while (currentParent) {
        if (currentParent.id === id) {
          return res.status(400).json({ error: 'Circular parent reference detected' });
        }
        if (!currentParent.parentId) break;
        currentParent = await prisma.category.findUnique({
          where: { id: currentParent.parentId },
          include: { parent: true }
        });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(parentId !== undefined && { parentId }),
        ...(order !== undefined && { order })
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { courses: true, children: true } }
      }
    });

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { courses: true, children: true } }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category._count.courses > 0) {
      return res.status(400).json({ error: 'Cannot delete category with associated courses' });
    }

    if (category._count.children > 0) {
      return res.status(400).json({ error: 'Cannot delete category with child categories' });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// Reorder categories
export const reorderCategories = async (req: Request, res: Response) => {
  try {
    const { categories } = req.body; // Array of { id, order }

    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories must be an array' });
    }

    // Update all categories in a transaction
    await prisma.$transaction(
      categories.map(({ id, order }) =>
        prisma.category.update({
          where: { id },
          data: { order }
        })
      )
    );

    res.json({ message: 'Categories reordered successfully' });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
};
