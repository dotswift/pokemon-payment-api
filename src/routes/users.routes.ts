import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { validateRequest } from '../middleware/validateRequest';
import {
  createIndividualSchema,
  listIndividualsQuerySchema,
  createBusinessSchema,
  listBusinessQuerySchema,
} from '../schemas/users.schema';

const router = Router();

/**
 * POST /users/individual
 * Create an individual user
 */
router.post(
  '/individual',
  validateRequest({ body: createIndividualSchema }),
  usersController.createIndividual.bind(usersController)
);

/**
 * GET /users/individuals
 * List individual users
 * Query params: email, userId, page, limit
 */
router.get(
  '/individuals',
  validateRequest({ query: listIndividualsQuerySchema }),
  usersController.listIndividuals.bind(usersController)
);

/**
 * POST /users/business
 * Create a business user
 */
router.post(
  '/business',
  validateRequest({ body: createBusinessSchema }),
  usersController.createBusiness.bind(usersController)
);

/**
 * GET /users/business
 * List business users
 * Query params: email, userId, page, limit
 */
router.get(
  '/business',
  validateRequest({ query: listBusinessQuerySchema }),
  usersController.listBusiness.bind(usersController)
);

export default router;
