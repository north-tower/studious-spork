import { Response } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import {
  compareRetailers,
  saveComparison,
  getUserComparisons,
  getComparisonById,
} from '../services/comparisonService';

const isCountryCode = (value: string): boolean => /^[A-Za-z]{2}$/.test(value);
const buildTraceId = (): string => `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const compare = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { retailers, country, currency } = req.body;
  const userId = req.user?.id;
  const startTime = Date.now();
  const traceId = buildTraceId();

  console.log(`\n[Trace ${traceId}] 🔄 ========== COMPARISON REQUEST STARTED ==========`);  
  console.log(`[Trace ${traceId}] 📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`[Trace ${traceId}] 👤 User ID: ${userId}`);
  console.log(`[Trace ${traceId}] 🛒 Retailers: ${JSON.stringify(retailers)}`);
  console.log(`[Trace ${traceId}] 🌍 Country: ${country}`);
  console.log(`[Trace ${traceId}] 💵 Currency: ${currency || 'Not specified (will use retailer default)'}`);

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

  // Real-time mode: do not resolve country via DB.
  // Accept either country name ("Austria") or ISO code ("AT") directly.
  const normalizedCountry = String(country).trim();
  const countryCode = isCountryCode(normalizedCountry)
    ? normalizedCountry.toUpperCase()
    : undefined;
  const countryName = countryCode ? normalizedCountry.toUpperCase() : normalizedCountry;

  const normalizedRetailers = retailers
    .map((r: string) => r.trim())
    .filter((r: string) => r.length > 0);

  console.log(`[Trace ${traceId}] 🌍 Resolved Country: ${countryName}${countryCode ? ` (${countryCode})` : ''}`);
  console.log(`[Trace ${traceId}] 🤖 Starting AI comparison for ${normalizedRetailers.length} retailer(s)...`);

  // Perform comparison using AI agent
  // retailers is now an array of retailer names
  const results = await compareRetailers(
    normalizedRetailers,
    countryName,
    countryCode,
    currency, // Pass currency to comparison service
    traceId
  );

  const comparisonTime = Date.now() - startTime;
  console.log(`[Trace ${traceId}] ✅ Comparison completed in ${comparisonTime}ms`);
  console.log(`[Trace ${traceId}] 📊 Results: ${results.length} retailer(s) with delivery data`);
  results.forEach((result, index) => {
    console.log(`[Trace ${traceId}]   ${index + 1}. ${result.retailer.name}: ${result.methods.length} method(s)`);
    if (result.cheapestOption) {
      console.log(`[Trace ${traceId}]      Cheapest: ${result.cheapestOption.method} - ${result.cheapestOption.cost} (${result.cheapestOption.duration})`);
    }
  });

  const persistComparisons = process.env.PERSIST_COMPARISON_HISTORY === 'true';
  const responseCreatedAt = new Date().toISOString();
  let comparisonId = `live-${Date.now()}`;
  let createdAt = responseCreatedAt;

  // Optional persistence (disabled by default to keep comparison path real-time only)
  if (persistComparisons) {
    const comparison = await saveComparison(userId, normalizedRetailers, countryName, results);
    comparisonId = comparison.id;
    createdAt = comparison.createdAt.toISOString();
    console.log(`[Trace ${traceId}] 💾 Comparison saved to history (ID: ${comparison.id})`);
  } else {
    console.log(`[Trace ${traceId}] ⚡ Skipping DB persistence for comparison (PERSIST_COMPARISON_HISTORY != true)`);
  }

  const totalTime = Date.now() - startTime;
  console.log(`[Trace ${traceId}] ⏱️  Total request time: ${totalTime}ms`);
  console.log(`[Trace ${traceId}] ✅ ========== COMPARISON REQUEST COMPLETED ==========\n`);

  res.json({
    comparison: {
      id: comparisonId,
      retailers: normalizedRetailers,
      country: countryName,
      results,
      createdAt,
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

