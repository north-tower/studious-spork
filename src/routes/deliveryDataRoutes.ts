import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import {
  getAllDeliveryData,
  getDeliveryDataById,
  createDeliveryData,
  updateDeliveryData,
  deleteDeliveryData,
  bulkUploadDeliveryData,
} from '../controllers/deliveryDataController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * @swagger
 * /api/delivery-data:
 *   get:
 *     summary: Get all delivery data
 *     tags: [Delivery Data]
 *     parameters:
 *       - in: query
 *         name: retailerId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of delivery data
 */
router.get('/', getAllDeliveryData);

/**
 * @swagger
 * /api/delivery-data/{id}:
 *   get:
 *     summary: Get delivery data by ID
 *     tags: [Delivery Data]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Delivery data details
 *       404:
 *         description: Delivery data not found
 */
router.get('/:id', getDeliveryDataById);

// Admin routes (protected)
router.post(
  '/',
  authenticate,
  validate([
    body('retailerId').notEmpty().withMessage('retailerId is required'),
    body('countryId').notEmpty().withMessage('countryId is required'),
    body('method').notEmpty().withMessage('method is required'),
    body('cost').notEmpty().withMessage('cost is required'),
    body('duration').notEmpty().withMessage('duration is required'),
  ]),
  createDeliveryData
);

router.put(
  '/:id',
  authenticate,
  updateDeliveryData
);

router.delete('/:id', authenticate, deleteDeliveryData);

/**
 * @swagger
 * /api/delivery-data/bulk:
 *   post:
 *     summary: Bulk upload delivery data from CSV (Admin only)
 *     tags: [Delivery Data]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with delivery data
 *     responses:
 *       200:
 *         description: CSV uploaded and processed successfully
 *       400:
 *         description: Validation error or invalid CSV
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/bulk',
  authenticate,
  upload.single('file'),
  bulkUploadDeliveryData
);

export default router;

