import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller';
import { validateRequest } from '../middleware/validateRequest';
import { createPayinSchema, createPayinWithWalletSchema, orderIdParamSchema } from '../schemas/orders.schema';

const router = Router();

router.post(
  '/payin',
  validateRequest({ body: createPayinSchema }),
  ordersController.createPayin
);

router.post(
  '/payin-wallet',
  validateRequest({ body: createPayinWithWalletSchema }),
  ordersController.createPayinWithWallet
);

router.get(
  '/:orderId',
  validateRequest({ params: orderIdParamSchema }),
  ordersController.getOrderDetails
);

export default router;
