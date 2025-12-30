import { Router } from 'express';
import multer from 'multer';
import { bulkUploadDeliveryData } from '../controllers/deliveryDataController';
import { authenticate } from '../middleware/auth';

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
 * /api/upload/csv:
 *   post:
 *     summary: Upload and process CSV file (Admin only)
 *     tags: [Upload]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 created:
 *                   type: number
 *                 updated:
 *                   type: number
 *                 total:
 *                   type: number
 *       400:
 *         description: Validation error or invalid CSV
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/csv',
  authenticate,
  upload.single('file'),
  bulkUploadDeliveryData
);

export default router;

