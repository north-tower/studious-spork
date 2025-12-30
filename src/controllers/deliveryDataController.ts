import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { parseCSV, validateCSVData, bulkUpsertDeliveryData } from '../services/csvService';

export const getAllDeliveryData = asyncHandler(async (req: Request, res: Response) => {
  const { retailerId, countryId, method } = req.query;

  const where: any = {};
  if (retailerId) where.retailerId = retailerId as string;
  if (countryId) where.countryId = countryId as string;
  if (method) where.method = { contains: method as string, mode: 'insensitive' };

  const deliveryData = await prisma.deliveryData.findMany({
    where,
    include: {
      retailer: true,
      country: true,
    },
    orderBy: [
      { retailer: { name: 'asc' } },
      { country: { name: 'asc' } },
      { cost: 'asc' },
    ],
  });

  res.json({ deliveryData });
});

export const getDeliveryDataById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deliveryData = await prisma.deliveryData.findUnique({
    where: { id },
    include: {
      retailer: true,
      country: true,
    },
  });

  if (!deliveryData) {
    res.status(404).json({ error: 'Delivery data not found' });
    return;
  }

  res.json({ deliveryData });
});

export const createDeliveryData = asyncHandler(async (req: Request, res: Response) => {
  const {
    retailerId,
    countryId,
    method,
    cost,
    duration,
    freeShippingThreshold,
    carrier,
    additionalNotes,
  } = req.body;

  if (!retailerId || !countryId || !method || !cost || !duration) {
    res.status(400).json({
      error: 'retailerId, countryId, method, cost, and duration are required',
    });
    return;
  }

  const deliveryData = await prisma.deliveryData.create({
    data: {
      retailerId,
      countryId,
      method,
      cost,
      duration,
      freeShippingThreshold,
      carrier,
      additionalNotes,
    },
    include: {
      retailer: true,
      country: true,
    },
  });

  res.status(201).json({ deliveryData });
});

export const updateDeliveryData = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    method,
    cost,
    duration,
    freeShippingThreshold,
    carrier,
    additionalNotes,
    status,
  } = req.body;

  const deliveryData = await prisma.deliveryData.update({
    where: { id },
    data: {
      method,
      cost,
      duration,
      freeShippingThreshold,
      carrier,
      additionalNotes,
      status,
    },
    include: {
      retailer: true,
      country: true,
    },
  });

  res.json({ deliveryData });
});

export const deleteDeliveryData = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.deliveryData.delete({
    where: { id },
  });

  res.json({ message: 'Delivery data deleted successfully' });
});

export const bulkUploadDeliveryData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'CSV file is required' });
    return;
  }

  try {
    // Parse CSV
    const rows = await parseCSV(req.file.buffer);

    // Validate data
    const validation = validateCSVData(rows);
    if (!validation.valid) {
      res.status(400).json({
        error: 'CSV validation failed',
        details: validation.errors,
      });
      return;
    }

    // Bulk upsert
    const result = await bulkUpsertDeliveryData(rows);

    res.status(200).json({
      message: 'CSV uploaded and processed successfully',
      created: result.created,
      updated: result.updated,
      total: rows.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process CSV file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});




