import { Router } from 'express';
import { sandboxController } from '../controllers/sandbox.controller';
import { validateRequest } from '../middleware/validateRequest';
import { createSandboxPrefundSchema } from '../schemas/sandbox.schema';

const router = Router();

router.post(
  '/prefund',
  validateRequest({ body: createSandboxPrefundSchema }),
  sandboxController.createPrefund
);

export default router;
