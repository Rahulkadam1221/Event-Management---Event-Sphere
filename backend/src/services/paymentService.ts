import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

// Initialize Razorpay client. If credentials are missing or invalid,
// we fall back to a mock mode so that the system remains fully testable in local development.
const keyId = config.razorpay.keyId;
const keySecret = config.razorpay.keySecret;

let razorpay: any = null;
const isMockMode = !keyId || !keySecret || keyId === 'rzp_test_dummyKeyId';

if (!isMockMode) {
  try {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    logger.info('Razorpay payment gateway initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Razorpay client', error);
  }
} else {
  logger.warn('Razorpay credentials missing or dummy; running in Payment Sandbox Mock Mode');
}

export const paymentService = {
  createOrder: async (bookingId: string, amount: number) => {
    if (isMockMode || !razorpay) {
      logger.info(`[Mock Payment] Creating simulated order for booking ${bookingId} of ₹${amount}`);
      return {
        id: 'order_mock_' + Math.random().toString(36).substring(2, 10),
        amount: amount * 100,
        currency: 'INR',
        receipt: bookingId,
        status: 'created',
      };
    }

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Razorpay accepts amounts in paise
        currency: 'INR',
        receipt: bookingId,
      });
      return order;
    } catch (error) {
      logger.error(`Failed to create Razorpay order for booking ${bookingId}`, error);
      throw error;
    }
  },

  verifyPayment: (orderId: string, paymentId: string, signature: string): boolean => {
    if (isMockMode || orderId.startsWith('order_mock_')) {
      logger.info(`[Mock Payment] Skipping cryptographic signature verification for mock order ${orderId}`);
      return true;
    }

    try {
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(orderId + '|' + paymentId);
      const generatedSignature = hmac.digest('hex');
      return generatedSignature === signature;
    } catch (error) {
      logger.error('Signature verification error', error);
      return false;
    }
  },

  verifyWebhookSignature: (body: string, signature: string, webhookSecret: string): boolean => {
    try {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(body);
      const generatedSignature = hmac.digest('hex');
      return generatedSignature === signature;
    } catch (error) {
      logger.error('Webhook signature verification error', error);
      return false;
    }
  },

  refundPayment: async (paymentId: string, amount: number) => {
    if (isMockMode || paymentId.startsWith('pay_simulated_') || paymentId.startsWith('pay_mock_')) {
      logger.info(`[Mock Payment] Refunding simulated payment ${paymentId} of ₹${amount}`);
      return {
        id: 'rfnd_mock_' + Math.random().toString(36).substring(2, 10),
        payment_id: paymentId,
        amount: amount * 100,
        status: 'processed',
      };
    }

    try {
      const refund = await razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100),
      });
      return refund;
    } catch (error) {
      logger.error(`Failed to refund Razorpay payment ${paymentId}`, error);
      throw error;
    }
  },
};
