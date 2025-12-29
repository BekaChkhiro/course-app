import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SINGLETON_ID = 'singleton';

// Get site settings for public (frontend)
export const getPublicSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: SINGLETON_ID }
    });

    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: SINGLETON_ID }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site settings'
    });
  }
};

// Get site settings (admin)
export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: SINGLETON_ID }
    });

    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: SINGLETON_ID }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site settings'
    });
  }
};

// Update site settings (admin)
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const {
      email,
      phone,
      whatsappNumber,
      facebookUrl,
      instagramUrl,
      tiktokUrl
    } = req.body;

    const settings = await prisma.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(whatsappNumber !== undefined && { whatsappNumber }),
        ...(facebookUrl !== undefined && { facebookUrl }),
        ...(instagramUrl !== undefined && { instagramUrl }),
        ...(tiktokUrl !== undefined && { tiktokUrl })
      },
      create: {
        id: SINGLETON_ID,
        email: email || 'info@kursebi.online',
        phone: phone || '+995 596 89 91 91',
        whatsappNumber: whatsappNumber || '995596899191',
        facebookUrl,
        instagramUrl,
        tiktokUrl
      }
    });

    res.json({
      success: true,
      message: 'Site settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update site settings'
    });
  }
};
