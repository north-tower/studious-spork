import prisma from '../config/database';
import { ComparisonResult } from '../types';
import { fetchMultipleRetailersDeliveryInfo } from './aiService';

/**
 * Compare retailers using AI agent to fetch delivery information
 */
export const compareRetailers = async (
  retailerNames: string[],
  countryName: string,
  countryCode?: string,
  currency?: string
): Promise<ComparisonResult[]> => {
  console.log(`\n📦 [Comparison Service] Starting comparison for ${retailerNames.length} retailer(s)`);
  console.log(`   Retailers: ${retailerNames.join(', ')}`);
  console.log(`   Country: ${countryName}${countryCode ? ` (${countryCode})` : ''}`);
  console.log(`   Currency: ${currency || 'Not specified (will use retailer default)'}`);

  const aiStartTime = Date.now();
  
  // Fetch delivery information for all retailers using AI
  const deliveryInfos = await fetchMultipleRetailersDeliveryInfo(
    retailerNames,
    countryName,
    countryCode,
    currency
  );

  const aiTime = Date.now() - aiStartTime;
  console.log(`🤖 [Comparison Service] AI requests completed in ${aiTime}ms`);
  console.log(`   Received data for ${deliveryInfos.length} retailer(s)`);

  // Transform AI responses to ComparisonResult format
  console.log(`🔄 [Comparison Service] Processing and transforming AI responses...`);
  const results: ComparisonResult[] = deliveryInfos.map((info, index) => {
    console.log(`   Processing ${index + 1}/${deliveryInfos.length}: ${info.retailerName} (${info.methods.length} method(s))`);
    // Find cheapest option
    let cheapestOption: { method: string; cost: string; duration: string } | undefined;

    if (info.methods.length > 0) {
      // Sort methods by cost (extract numeric value for comparison)
      const sortedMethods = [...info.methods].sort((a, b) => {
        // Handle "FREE" or "N/A" costs
        if (a.cost.toUpperCase().includes('FREE') || a.cost === 'N/A') return -1;
        if (b.cost.toUpperCase().includes('FREE') || b.cost === 'N/A') return 1;
        
        const costA = parseFloat(a.cost.replace(/[^0-9.]/g, '')) || Infinity;
        const costB = parseFloat(b.cost.replace(/[^0-9.]/g, '')) || Infinity;
        return costA - costB;
      });

      const cheapest = sortedMethods[0];
      if (cheapest) {
        cheapestOption = {
          method: cheapest.method,
          cost: cheapest.cost,
          duration: cheapest.duration,
        };
      }
    }

    return {
      retailer: {
        id: info.retailerName.toLowerCase().replace(/\s+/g, '-'), // Generate a simple ID from name
        name: info.retailerName,
      },
      country: {
        id: countryCode || countryName.toLowerCase().replace(/\s+/g, '-'),
        name: info.countryName,
        code: countryCode || '',
      },
      methods: info.methods.map((method) => ({
        method: method.method,
        cost: method.cost,
        duration: method.duration,
        freeShippingThreshold: method.freeShippingThreshold,
        carrier: method.carrier,
        additionalNotes: method.additionalNotes,
      })),
      cheapestOption,
    };
  });

  // Sort results by cheapest option cost
  console.log(`📊 [Comparison Service] Sorting results by cheapest option...`);
  results.sort((a, b) => {
    if (!a.cheapestOption || !b.cheapestOption) return 0;
    
    // Handle "FREE" or "N/A" costs
    if (a.cheapestOption.cost.toUpperCase().includes('FREE') || a.cheapestOption.cost === 'N/A') return -1;
    if (b.cheapestOption.cost.toUpperCase().includes('FREE') || b.cheapestOption.cost === 'N/A') return 1;
    
    const costA = parseFloat(a.cheapestOption.cost.replace(/[^0-9.]/g, '')) || Infinity;
    const costB = parseFloat(b.cheapestOption.cost.replace(/[^0-9.]/g, '')) || Infinity;
    return costA - costB;
  });

  console.log(`✅ [Comparison Service] Comparison complete. Returning ${results.length} result(s)`);
  return results;
};

export const saveComparison = async (
  userId: string,
  retailerNames: string[],
  countryName: string,
  results: ComparisonResult[]
) => {
  return prisma.comparison.create({
    data: {
      userId,
      retailers: retailerNames, // Now storing names instead of IDs
      country: countryName, // Now storing country name instead of ID
      results: results as any,
    },
  });
};

export const getUserComparisons = async (userId: string) => {
  return prisma.comparison.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getComparisonById = async (id: string, userId: string) => {
  return prisma.comparison.findFirst({
    where: {
      id,
      userId,
    },
  });
};

