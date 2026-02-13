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
  const { retailers, country, currency } = req.body;
  const userId = req.user?.id;
  const startTime = Date.now();

  console.log('\n🔄 ========== COMPARISON REQUEST STARTED ==========');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`👤 User ID: ${userId}`);
  console.log(`🛒 Retailers: ${JSON.stringify(retailers)}`);
  console.log(`🌍 Country: ${country}`);
  console.log(`💵 Currency: ${currency || 'Not specified (will use retailer default)'}`);

  if (!userId) {
    console.log('❌ Error: Unauthorized - No user ID');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Validate input - retailers should now be an array of names (strings)
  if (!retailers || !Array.isArray(retailers) || retailers.length === 0) {
    console.log('❌ Error: Invalid retailers array');
    res.status(400).json({ error: 'Retailers array is required and must not be empty' });
    return;
  }

  if (retailers.length > 10) {
    console.log(`❌ Error: Too many retailers (${retailers.length} > 10)`);
    res.status(400).json({ error: 'Maximum 10 retailers allowed per comparison' });
    return;
  }

  // Validate all retailers are strings (names)
  if (!retailers.every((r) => typeof r === 'string' && r.trim().length > 0)) {
    console.log('❌ Error: Retailers must be valid strings');
    res.status(400).json({ error: 'All retailers must be valid names (strings)' });
    return;
  }

  if (!country) {
    console.log('❌ Error: Country is required');
    res.status(400).json({ error: 'Country is required' });
    return;
  }

  // Country can be either an ID (for existing countries) or a name
  // Try to find country by ID first, then by name
  let countryRecord = await prisma.country.findUnique({
    where: { id: country },
  });

  if (!countryRecord) {
    // Try to find by name
    countryRecord = await prisma.country.findFirst({
      where: { name: { equals: country, mode: 'insensitive' } },
    });
  }

  // If country not found in DB, we'll use the provided name/code
  const countryName = countryRecord?.name || country;
  const countryCode = countryRecord?.code;

  console.log(`🌍 Resolved Country: ${countryName}${countryCode ? ` (${countryCode})` : ''}`);
  console.log(`🤖 Starting AI comparison for ${retailers.length} retailer(s)...`);

  // Perform comparison using AI agent
  // retailers is now an array of retailer names
  const results = await compareRetailers(
    retailers.map((r: string) => r.trim()),
    countryName,
    countryCode,
    currency // Pass currency to comparison service
  );

  const comparisonTime = Date.now() - startTime;
  console.log(`✅ Comparison completed in ${comparisonTime}ms`);
  console.log(`📊 Results: ${results.length} retailer(s) with delivery data`);
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.retailer.name}: ${result.methods.length} method(s)`);
    if (result.cheapestOption) {
      console.log(`      Cheapest: ${result.cheapestOption.method} - ${result.cheapestOption.cost} (${result.cheapestOption.duration})`);
    }
  });

  // Save comparison to history
  const comparison = await saveComparison(userId, retailers, countryName, results);

  const totalTime = Date.now() - startTime;
  console.log(`💾 Comparison saved to history (ID: ${comparison.id})`);
  console.log(`⏱️  Total request time: ${totalTime}ms`);
  console.log('✅ ========== COMPARISON REQUEST COMPLETED ==========\n');

  res.json({
    comparison: {
      id: comparison.id,
      retailers,
      country: countryName,
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
  const id = req.params.id as string;
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

