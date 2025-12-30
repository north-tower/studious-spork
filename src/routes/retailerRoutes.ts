import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllRetailers,
  getRetailerById,
  createRetailer,
  updateRetailer,
  deleteRetailer,
} from '../controllers/retailerController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /api/retailers:
 *   get:
 *     summary: Get all retailers
 *     tags: [Retailers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search retailers by name
 *     responses:
 *       200:
 *         description: List of retailers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 retailers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Retailer'
 */
router.get('/', getAllRetailers);

/**
 * @swagger
 * /api/retailers/{id}:
 *   get:
 *     summary: Get retailer by ID
 *     tags: [Retailers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Retailer ID
 *     responses:
 *       200:
 *         description: Retailer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 retailer:
 *                   $ref: '#/components/schemas/Retailer'
 *       404:
 *         description: Retailer not found
 */
router.get('/:id', getRetailerById);

/**
 * @swagger
 * /api/retailers:
 *   post:
 *     summary: Create a new retailer (Admin only)
 *     tags: [Retailers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Amazon
 *     responses:
 *       201:
 *         description: Retailer created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  validate([body('name').notEmpty().withMessage('Name is required')]),
  createRetailer
);

/**
 * @swagger
 * /api/retailers/{id}:
 *   put:
 *     summary: Update retailer (Admin only)
 *     tags: [Retailers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Retailer updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/:id',
  authenticate,
  validate([body('name').notEmpty().withMessage('Name is required')]),
  updateRetailer
);

/**
 * @swagger
 * /api/retailers/{id}:
 *   delete:
 *     summary: Delete retailer (Admin only)
 *     tags: [Retailers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Retailer deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticate, deleteRetailer);

export default router;

