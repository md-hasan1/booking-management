import express from 'express';
import { paymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { paymentValidation } from './payment.validation';

const router = express.Router();

// Initialize payment (USER only)
router.post(
  '/initialize',
  auth(),
  validateRequest(paymentValidation.initializePayment),
  paymentController.initializePayment
);

// IPN endpoint — must be POST and publicly reachable by PayFast (no auth)
router.post(
  '/handelIpn',
  paymentController.handelIpn
);

// Debug endpoints (development) — remove or protect in production
router.get('/debugSignature', paymentController.debugSignature);
router.post('/verifyUrl', paymentController.verifyUrl);

export const PaymentRoutes = router;