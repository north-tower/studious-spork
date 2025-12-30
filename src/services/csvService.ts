import csv from 'csv-parser';
import { Readable } from 'stream';
import prisma from '../config/database';
import { CSVRow } from '../types';

export const parseCSV = (fileBuffer: Buffer): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    const stream = Readable.from(fileBuffer.toString());

    stream
      .pipe(csv())
      .on('data', (data: any) => {
        // Normalize CSV row data
        // Support multiple column name variations
        const retailer = data.retailer || data.Retailer || data.retailerCanon || data.RetailerCanon || data.retailerScopedNa || data.RetailerScopedNa || '';
        const country = data.countryNorm || data.CountryNorm || data.country || data.Country || '';
        const method = data.method || data.Method || data.service || data.Service || '';
        
        // Prefer PriceValue over PriceRaw, handle "FREE" values
        let cost = data.cost || data.Cost || data.priceValue || data.PriceValue || data.priceRaw || data.PriceRaw || '';
        // Normalize "FREE" values - handle variations like "FREE", "0 FREE", "O FREE", etc.
        if (cost && typeof cost === 'string') {
          cost = cost.trim();
          const upperCost = cost.toUpperCase();
          // If it's essentially "FREE" (just "FREE" or "0 FREE" or "O FREE"), normalize to "Free"
          if (upperCost === 'FREE' || upperCost === '0 FREE' || upperCost === 'O FREE' || upperCost.match(/^[0O]\s+FREE$/)) {
            cost = 'Free';
          }
          // Otherwise keep the original value (e.g., "8.99 $", "10 $", etc.)
        }
        
        const duration = data.duration || data.Duration || data.deliveryDays || data.DeliveryDays || '';
        const freeShippingThreshold = data.freeShippingThreshold || data['Free Shipping Threshold'] || undefined;
        const carrier = data.carrier || data.Carrier || undefined;
        const additionalNotes = data.additionalNotes || data['Additional Notes'] || data.extra || data.Extra || undefined;
        
        const row: CSVRow = {
          retailer,
          country,
          method,
          cost,
          duration,
          freeShippingThreshold,
          carrier,
          additionalNotes,
        };
        results.push(row);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

export const validateCSVData = (rows: CSVRow[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  rows.forEach((row, index) => {
    if (!row.retailer || !row.country || !row.method || !row.cost || !row.duration) {
      errors.push(`Row ${index + 1}: Missing required fields (retailer, country, method, cost, duration)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Helper function to generate a unique country code
const generateUniqueCountryCode = async (countryName: string): Promise<string> => {
  const trimmedName = countryName.trim();
  
  // Try common ISO code mappings first
  const countryCodeMap: { [key: string]: string } = {
    'United States': 'US',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Austria': 'AT',
    'Switzerland': 'CH',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Poland': 'PL',
    'Portugal': 'PT',
    'Ireland': 'IE',
    'Greece': 'GR',
    'Czech Republic': 'CZ',
    'Hungary': 'HU',
    'Romania': 'RO',
    'Japan': 'JP',
    'China': 'CN',
    'India': 'IN',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'South Korea': 'KR',
    'Israel': 'IL',
    'New Zealand': 'NZ',
    'South Africa': 'ZA',
  };

  // Check if we have a mapping
  const mappedCode = countryCodeMap[trimmedName];
  if (mappedCode) {
    // Verify the code is available
    const existing = await prisma.country.findUnique({
      where: { code: mappedCode },
    });
    if (!existing || existing.name === trimmedName) {
      return mappedCode;
    }
  }

  // Generate code from country name
  let baseCode = trimmedName
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);

  // If single word, use first 2 letters
  if (baseCode.length < 2) {
    baseCode = trimmedName.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '');
  }

  // Ensure it's exactly 2 characters
  if (baseCode.length < 2) {
    baseCode = (baseCode + 'XX').substring(0, 2);
  }

  // Check if code is available
  let code = baseCode;
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const existing = await prisma.country.findUnique({
      where: { code },
    });
    
    if (!existing) {
      return code; // Code is available
    }
    
    if (existing.name === trimmedName) {
      return code; // Same country, same code
    }
    
    // Code is taken by different country, try next variation
    attempts++;
    
    if (attempts < 26) {
      // Try variations: baseCode[0] + A-Z
      code = baseCode[0] + String.fromCharCode(65 + (attempts - 1));
    } else if (attempts < 52) {
      // Try variations: A-Z + baseCode[1] or baseCode[0]
      const secondChar = baseCode.length > 1 ? baseCode[1] : baseCode[0];
      code = String.fromCharCode(65 + (attempts - 26)) + secondChar;
    } else {
      // Use hash-based approach as last resort
      const hash = Math.abs(trimmedName.split('').reduce((acc, char) => acc + char.charCodeAt(0), attempts));
      const firstChar = String.fromCharCode(65 + (hash % 26));
      const secondChar = String.fromCharCode(65 + ((hash * 7) % 26));
      code = firstChar + secondChar;
    }
  }

  // Fallback: use hash-based code (shouldn't reach here often)
  const hash = Math.abs(trimmedName.split('').reduce((acc, char) => acc + char.charCodeAt(0), Date.now()));
  return String.fromCharCode(65 + (hash % 26)) + String.fromCharCode(65 + ((hash * 7) % 26));
};

export const bulkUpsertDeliveryData = async (rows: CSVRow[]): Promise<{ created: number; updated: number }> => {
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    if (!row.retailer || !row.country || !row.method || !row.cost || !row.duration) {
      continue; // Skip invalid rows
    }

    // Find or create retailer
    const retailer = await prisma.retailer.upsert({
      where: { name: row.retailer.trim() },
      update: {},
      create: { name: row.retailer.trim() },
    });

    // Find or create country
    const countryName = row.country.trim();
    let country = await prisma.country.findUnique({
      where: { name: countryName },
    });

    if (!country) {
      // Country doesn't exist, create with unique code
      const code = await generateUniqueCountryCode(countryName);
      country = await prisma.country.create({
        data: {
          name: countryName,
          code,
        },
      });
    }

    // Upsert delivery data
    const existing = await prisma.deliveryData.findUnique({
      where: {
        retailerId_countryId_method: {
          retailerId: retailer.id,
          countryId: country.id,
          method: row.method.trim(),
        },
      },
    });

    if (existing) {
      await prisma.deliveryData.update({
        where: { id: existing.id },
        data: {
          cost: row.cost.trim(),
          duration: row.duration.trim(),
          freeShippingThreshold: row.freeShippingThreshold?.trim() || null,
          carrier: row.carrier?.trim() || null,
          additionalNotes: row.additionalNotes?.trim() || null,
          status: 'verified',
        },
      });
      updated++;
    } else {
      await prisma.deliveryData.create({
        data: {
          retailerId: retailer.id,
          countryId: country.id,
          method: row.method.trim(),
          cost: row.cost.trim(),
          duration: row.duration.trim(),
          freeShippingThreshold: row.freeShippingThreshold?.trim() || null,
          carrier: row.carrier?.trim() || null,
          additionalNotes: row.additionalNotes?.trim() || null,
          status: 'verified',
        },
      });
      created++;
    }
  }

  return { created, updated };
};




