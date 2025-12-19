import { Router } from 'express';
import { payoutController } from '../controllers/payout.controller';
import { validateRequest } from '../middleware/validateRequest';
import { createContactSchema, createPayoutSchema, emailParamSchema } from '../schemas/payout.schema';

const router = Router();

router.post(
  '/contacts',
  validateRequest({ body: createContactSchema }),
  payoutController.createContact
);

router.get(
  '/contacts/:email',
  validateRequest({ params: emailParamSchema }),
  payoutController.getContact
);

router.delete(
  '/contacts/:email',
  validateRequest({ params: emailParamSchema }),
  payoutController.deleteContact
);

router.post(
  '/',
  validateRequest({ body: createPayoutSchema }),
  payoutController.createPayout
);

export default router;
