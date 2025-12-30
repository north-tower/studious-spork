import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

export const getAllCountries = asyncHandler(async (_req: Request, res: Response) => {
  const countries = await prisma.country.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { deliveryData: true },
      },
    },
  });

  res.json({ countries });
});

export const getCountryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const country = await prisma.country.findUnique({
    where: { id },
    include: {
      deliveryData: {
        include: {
          retailer: true,
        },
      },
    },
  });

  if (!country) {
    res.status(404).json({ error: 'Country not found' });
    return;
  }

  res.json({ country });
});

export const createCountry = asyncHandler(async (req: Request, res: Response) => {
  const { name, code } = req.body;

  if (!name || !code) {
    res.status(400).json({ error: 'Name and code are required' });
    return;
  }

  const country = await prisma.country.create({
    data: { name, code },
  });

  res.status(201).json({ country });
});

