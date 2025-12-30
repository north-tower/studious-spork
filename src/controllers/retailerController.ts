import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

export const getAllRetailers = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const where = search
    ? {
        name: {
          contains: search as string,
          mode: 'insensitive' as const,
        },
      }
    : {};

  const retailers = await prisma.retailer.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { deliveryData: true },
      },
    },
  });

  res.json({ retailers });
});

export const getRetailerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const retailer = await prisma.retailer.findUnique({
    where: { id },
    include: {
      deliveryData: {
        include: {
          country: true,
        },
      },
    },
  });

  if (!retailer) {
    res.status(404).json({ error: 'Retailer not found' });
    return;
  }

  res.json({ retailer });
});

export const createRetailer = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const retailer = await prisma.retailer.create({
    data: { name },
  });

  res.status(201).json({ retailer });
});

export const updateRetailer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const retailer = await prisma.retailer.update({
    where: { id },
    data: { name },
  });

  res.json({ retailer });
});

export const deleteRetailer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.retailer.delete({
    where: { id },
  });

  res.json({ message: 'Retailer deleted successfully' });
});




