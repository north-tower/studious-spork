import prisma from '../config/database';
import { ComparisonResult } from '../types';

export const compareRetailers = async (
  retailerIds: string[],
  countryId: string
): Promise<ComparisonResult[]> => {
  // Fetch all delivery data for the given retailers and country
  const deliveryData = await prisma.deliveryData.findMany({
    where: {
      retailerId: { in: retailerIds },
      countryId,
    },
    include: {
      retailer: true,
      country: true,
    },
    orderBy: [
      { cost: 'asc' }, // Sort by cost ascending
    ],
  });

  // Group by retailer
  const retailerMap = new Map<string, ComparisonResult>();

  for (const data of deliveryData) {
    const retailerId = data.retailerId;

    if (!retailerMap.has(retailerId)) {
      retailerMap.set(retailerId, {
        retailer: {
          id: data.retailer.id,
          name: data.retailer.name,
        },
        country: {
          id: data.country.id,
          name: data.country.name,
          code: data.country.code,
        },
        methods: [],
      });
    }

    const result = retailerMap.get(retailerId)!;
    result.methods.push({
      method: data.method,
      cost: data.cost,
      duration: data.duration,
      freeShippingThreshold: data.freeShippingThreshold || undefined,
      carrier: data.carrier || undefined,
      additionalNotes: data.additionalNotes || undefined,
    });
  }

  // Find cheapest option for each retailer
  const results = Array.from(retailerMap.values());
  results.forEach((result) => {
    if (result.methods.length > 0) {
      // Sort methods by cost (assuming cost is a string that can be parsed)
      const sortedMethods = [...result.methods].sort((a, b) => {
        const costA = parseFloat(a.cost.replace(/[^0-9.]/g, '')) || 0;
        const costB = parseFloat(b.cost.replace(/[^0-9.]/g, '')) || 0;
        return costA - costB;
      });

      const cheapest = sortedMethods[0];
      if (cheapest) {
        result.cheapestOption = {
          method: cheapest.method,
          cost: cheapest.cost,
          duration: cheapest.duration,
        };
      }
    }
  });

  // Sort results by cheapest option cost
  results.sort((a, b) => {
    if (!a.cheapestOption || !b.cheapestOption) return 0;
    const costA = parseFloat(a.cheapestOption.cost.replace(/[^0-9.]/g, '')) || 0;
    const costB = parseFloat(b.cheapestOption.cost.replace(/[^0-9.]/g, '')) || 0;
    return costA - costB;
  });

  return results;
};

export const saveComparison = async (
  userId: string,
  retailerIds: string[],
  countryId: string,
  results: ComparisonResult[]
) => {
  return prisma.comparison.create({
    data: {
      userId,
      retailers: retailerIds,
      country: countryId,
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

