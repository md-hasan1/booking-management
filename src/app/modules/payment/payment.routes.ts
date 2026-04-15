import express from 'express';
import { paymentController } from './payment.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

// Initialize payment (USER only)
router.post(
  '/initialize',
  auth(),
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