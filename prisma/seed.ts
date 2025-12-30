import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create sample retailers
  const retailers = [
    { name: 'Amazon' },
    { name: 'eBay' },
    { name: 'Walmart' },
    { name: 'Target' },
    { name: 'Best Buy' },
  ];

  console.log('Creating retailers...');
  for (const retailer of retailers) {
    await prisma.retailer.upsert({
      where: { name: retailer.name },
      update: {},
      create: retailer,
    });
  }

  // Create sample countries
  const countries = [
    { name: 'United States', code: 'US' },
    { name: 'United Kingdom', code: 'GB' },
    { name: 'Canada', code: 'CA' },
    { name: 'Australia', code: 'AU' },
    { name: 'Germany', code: 'DE' },
  ];

  console.log('Creating countries...');
  for (const country of countries) {
    await prisma.country.upsert({
      where: { name: country.name },
      update: {},
      create: country,
    });
  }

  // Try to load CSV file if it exists
  const csvPath = join(__dirname, 'seed-data.csv');
  if (existsSync(csvPath)) {
    console.log('Loading CSV data...');
    const rows: any[] = [];
    const fileContent = readFileSync(csvPath, 'utf-8');
    const stream = Readable.from(fileContent);

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const row of rows) {
      const retailerName = row.retailer || row.Retailer;
      const countryName = row.country || row.Country;

      if (!retailerName || !countryName) continue;

      const retailer = await prisma.retailer.findUnique({
        where: { name: retailerName.trim() },
      });

      const country = await prisma.country.findUnique({
        where: { name: countryName.trim() },
      });

      if (retailer && country) {
        await prisma.deliveryData.upsert({
          where: {
            retailerId_countryId_method: {
              retailerId: retailer.id,
              countryId: country.id,
              method: (row.method || row.Method || 'Standard').trim(),
            },
          },
          update: {
            cost: (row.cost || row.Cost || '0').trim(),
            duration: (row.duration || row.Duration || 'N/A').trim(),
            freeShippingThreshold: row.freeShippingThreshold || row['Free Shipping Threshold'] || null,
            carrier: row.carrier || row.Carrier || null,
            additionalNotes: row.additionalNotes || row['Additional Notes'] || null,
          },
          create: {
            retailerId: retailer.id,
            countryId: country.id,
            method: (row.method || row.Method || 'Standard').trim(),
            cost: (row.cost || row.Cost || '0').trim(),
            duration: (row.duration || row.Duration || 'N/A').trim(),
            freeShippingThreshold: row.freeShippingThreshold || row['Free Shipping Threshold'] || null,
            carrier: row.carrier || row.Carrier || null,
            additionalNotes: row.additionalNotes || row['Additional Notes'] || null,
          },
        });
      }
    }
  } else {
    console.log('No CSV file found, creating sample delivery data...');
    // Create sample delivery data
    const allRetailers = await prisma.retailer.findMany();
    const allCountries = await prisma.country.findMany();

    for (const retailer of allRetailers) {
      for (const country of allCountries) {
        await prisma.deliveryData.upsert({
          where: {
            retailerId_countryId_method: {
              retailerId: retailer.id,
              countryId: country.id,
              method: 'Standard',
            },
          },
          update: {},
          create: {
            retailerId: retailer.id,
            countryId: country.id,
            method: 'Standard',
            cost: '$5.99',
            duration: '5-7 business days',
            freeShippingThreshold: '$25.00',
            carrier: 'Standard Carrier',
          },
        });

        await prisma.deliveryData.upsert({
          where: {
            retailerId_countryId_method: {
              retailerId: retailer.id,
              countryId: country.id,
              method: 'Express',
            },
          },
          update: {},
          create: {
            retailerId: retailer.id,
            countryId: country.id,
            method: 'Express',
            cost: '$12.99',
            duration: '2-3 business days',
            freeShippingThreshold: '$50.00',
            carrier: 'Express Carrier',
          },
        });
      }
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

