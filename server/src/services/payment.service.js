import crypto from 'crypto';
import Razorpay from 'razorpay';

let razorpayInstance = null;

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret && key_id.startsWith('rzp_') && key_id !== 'rzp_test_your_key_id') {
    if (!razorpayInstance) {
      razorpayInstance = new Razorpay({
        key_id,
        key_secret,
      });
    }
    return razorpayInstance;
  }
  return null;
};

export const createRazorpayOrder = async ({ amountInINR, receipt, notes = {} }) => {
  const rzp = getRazorpayInstance();
  const amountInPaise = Math.round(amountInINR * 100);

  if (rzp) {
    try {
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes,
      });
      return {
        isMock: false,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      };
    } catch (err) {
      console.warn(`[Razorpay Order Error - Falling back to Mock Order]: ${err.message}`);
    }
  }

  // Graceful zero-configuration mock fallback for portfolio testing
  const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    isMock: true,
    orderId: mockOrderId,
    amount: amountInPaise,
    currency: 'INR',
    keyId: 'rzp_test_mock_chargeshot',
  };
};

export const verifyPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock = false }) => {
  if (isMock || (razorpayOrderId && razorpayOrderId.startsWith('order_mock_'))) {
    return true;
  }

  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) {
    return true; // Fallback in development mode
  }

  const generatedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return generatedSignature === razorpaySignature;
};

export const processRefund = async ({ paymentId, amountInINR }) => {
  const rzp = getRazorpayInstance();
  const amountInPaise = Math.round(amountInINR * 100);

  if (rzp && paymentId && !paymentId.startsWith('pay_mock_')) {
    try {
      const refund = await rzp.payments.refund(paymentId, {
        amount: amountInPaise,
      });
      return { success: true, refundId: refund.id, isMock: false };
    } catch (err) {
      console.error(`[Razorpay Refund Error]: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // Mock refund
  return {
    success: true,
    refundId: `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    isMock: true,
  };
};
