import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllCountries,
  getCountryById,
  createCountry,
} from '../controllers/countryController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /api/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Countries]
 *     responses:
 *       200:
 *         description: List of countries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 countries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Country'
 */
router.get('/', getAllCountries);

/**
 * @swagger
 * /api/countries/{id}:
 *   get:
 *     summary: Get country by ID
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Country details
 *       404:
 *         description: Country not found
 */
router.get('/:id', getCountryById);

/**
 * @swagger
 * /api/countries:
 *   post:
 *     summary: Create a new country (Admin only)
 *     tags: [Countries]
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
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 example: United States
 *               code:
 *                 type: string
 *                 example: US
 *     responses:
 *       201:
 *         description: Country created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('code').notEmpty().withMessage('Code is required'),
  ]),
  createCountry
);

export default router;
