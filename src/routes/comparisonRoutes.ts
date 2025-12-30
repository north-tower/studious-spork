import { Router } from 'express';
import { body } from 'express-validator';
import {
  compare,
  getComparisonHistory,
  getComparisonByIdController,
} from '../controllers/comparisonController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /api/compare:
 *   post:
 *     summary: Compare retailers for a specific country
 *     tags: [Comparison]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - retailers
 *               - country
 *             properties:
 *               retailers:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["uuid1", "uuid2"]
 *               country:
 *                 type: string
 *                 format: uuid
 *                 example: "country-uuid"
 *     responses:
 *       200:
 *         description: Comparison results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comparison:
 *                   $ref: '#/components/schemas/Comparison'
 *       400:
 *         description: Validation error or invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  validate([
    body('retailers')
      .isArray({ min: 1, max: 10 })
      .withMessage('Retailers must be an array with 1-10 items'),
    body('retailers.*').isString().withMessage('Each retailer must be a string ID'),
    body('country').notEmpty().withMessage('Country is required'),
  ]),
  compare
);

/**
 * @swagger
 * /api/compare/history:
 *   get:
 *     summary: Get user's comparison history
 *     tags: [Comparison]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's comparisons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comparisons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comparison'
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authenticate, getComparisonHistory);

/**
 * @swagger
 * /api/compare/{id}:
 *   get:
 *     summary: Get specific comparison by ID
 *     tags: [Comparison]
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
 *         description: Comparison details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comparison:
 *                   $ref: '#/components/schemas/Comparison'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comparison not found
 */
router.get('/:id', authenticate, getComparisonByIdController);

export default router;

