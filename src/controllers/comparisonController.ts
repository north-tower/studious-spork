import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import {
  compareRetailers,
  saveComparison,
  getUserComparisons,
  getComparisonById,
} from '../services/comparisonService';

export const compare = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { retailers, country } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Validate input
  if (!retailers || !Array.isArray(retailers) || retailers.length === 0) {
    res.status(400).json({ error: 'Retailers array is required and must not be empty' });
    return;
  }

  if (retailers.length > 10) {
    res.status(400).json({ error: 'Maximum 10 retailers allowed per comparison' });
    return;
  }

  if (!country) {
    res.status(400).json({ error: 'Country is required' });
    return;
  }

  // Validate retailers exist
  const retailerCount = await prisma.retailer.count({
    where: { id: { in: retailers } },
  });

  if (retailerCount !== retailers.length) {
    res.status(400).json({ error: 'One or more retailers not found' });
    return;
  }

  // Validate country exists
  const countryRecord = await prisma.country.findUnique({
    where: { id: country },
  });

  if (!countryRecord) {
    res.status(400).json({ error: 'Country not found' });
    return;
  }

  // Perform comparison
  const results = await compareRetailers(retailers, country);

  // Save comparison to history
  const comparison = await saveComparison(userId, retailers, country, results);

  res.json({
    comparison: {
      id: comparison.id,
      retailers,
      country: countryRecord.name,
      results,
      createdAt: comparison.createdAt,
    },
  });
});

export const getComparisonHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const comparisons = await getUserComparisons(userId);

  res.json({ comparisons });
});

export const getComparisonByIdController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!id) {
    res.status(400).json({ error: 'Comparison ID is required' });
    return;
  }

  const comparison = await getComparisonById(id, userId);

  if (!comparison) {
    res.status(404).json({ error: 'Comparison not found' });
    return;
  }

  res.json({ comparison });
});

