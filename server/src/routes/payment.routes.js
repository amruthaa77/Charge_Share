import express from 'express';
import { createPaymentOrder, verifyPayment, simulateMockPayment } from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.post('/mock-pay', simulateMockPayment);

export default router;
