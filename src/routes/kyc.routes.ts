import { Router } from 'express';
import { kycController } from '../controllers/kyc.controller';
import { validateRequest } from '../middleware/validateRequest';
import {
  shareKYCWithTokenSchema,
  submitKYCSchema,
  submitAdvancedKYCSchema,
  kycStatusQuerySchema,
} from '../schemas/kyc.schema';

const router = Router();

/**
 * POST /kyc/share/with-token
 * Share KYC with existing token from another provider
 */
router.post(
  '/share/with-token',
  validateRequest({ body: shareKYCWithTokenSchema }),
  kycController.shareWithToken.bind(kycController)
);

/**
 * POST /kyc/submit
 * Submit standard KYC - returns redirect URL
 */
router.post(
  '/submit',
  validateRequest({ body: submitKYCSchema }),
  kycController.submitKYC.bind(kycController)
);

/**
 * POST /kyc/advanced
 * Submit advanced KYC - returns redirect URL
 */
router.post(
  '/advanced',
  validateRequest({ body: submitAdvancedKYCSchema }),
  kycController.submitAdvancedKYC.bind(kycController)
);

/**
 * GET /kyc/status
 * Get KYC status for a user
 * Query params: email
 */
router.get(
  '/status',
  validateRequest({ query: kycStatusQuerySchema }),
  kycController.getStatus.bind(kycController)
);

export default router;
