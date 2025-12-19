import { Router } from 'express';
import { prefundsController } from '../controllers/prefunds.controller';
import { validateRequest } from '../middleware/validateRequest';
import { getPrefundAddressSchema, createCryptoPrefundSchema } from '../schemas/prefunds.schema';

const router = Router();

router.get(
  '/address',
  validateRequest({ query: getPrefundAddressSchema }),
  prefundsController.getWalletAddress
);

router.post(
  '/',
  validateRequest({ body: createCryptoPrefundSchema }),
  prefundsController.createPrefund
);

export default router;
