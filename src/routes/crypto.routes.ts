import { Router } from 'express';
import { cryptoController } from '../controllers/crypto.controller';
import { validateRequest } from '../middleware/validateRequest';
import { cryptoPayinSchema, cryptoPayoutSchema } from '../schemas/crypto.schema';

const router = Router();

router.post(
  '/payin',
  validateRequest({ body: cryptoPayinSchema }),
  cryptoController.createPayin
);

router.post(
  '/payout',
  validateRequest({ body: cryptoPayoutSchema }),
  cryptoController.createPayout
);

export default router;
