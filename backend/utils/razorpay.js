import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy initialization of Razorpay to avoid errors when env vars are not set
let razorpayInstance = null;

const getRazorpay = () => {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file');
    }
    
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return razorpayInstance;
};

// Create order
export const createOrder = async (amount, currency, receipt, notes = {}) => {
  try {
    const razorpay = getRazorpay();
    const options = {
      amount: amount * 100, // Convert to paise
      currency: currency || 'INR',
      receipt: receipt,
      notes: notes
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    throw new Error(`Razorpay order creation failed: ${error.message}`);
  }
};

// Verify payment signature
export const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keySecret) {
    throw new Error('Razorpay key secret not configured. Cannot verify payment signature.');
  }
  
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === razorpaySignature;
};

// Create payment link
export const createPaymentLink = async (amount, currency, description, customer, notes = {}) => {
  try {
    const razorpay = getRazorpay();
    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100,
      currency: currency || 'INR',
      description: description,
      customer: {
        name: customer.name,
        contact: customer.phone,
        email: customer.email
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      notes: notes
    });

    return paymentLink;
  } catch (error) {
    throw new Error(`Razorpay payment link creation failed: ${error.message}`);
  }
};

// Create subscription
export const createSubscription = async (planId, customer, startAt, notes = {}) => {
  try {
    const razorpay = getRazorpay();
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12, // 12 months
      start_at: startAt || Math.floor(Date.now() / 1000) + 86400,
      notes: notes
    });

    return subscription;
  } catch (error) {
    throw new Error(`Razorpay subscription creation failed: ${error.message}`);
  }
};

// Refund payment
export const refundPayment = async (paymentId, amount, notes = {}) => {
  try {
    const razorpay = getRazorpay();
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100,
      notes: notes
    });

    return refund;
  } catch (error) {
    throw new Error(`Razorpay refund failed: ${error.message}`);
  }
};

// Get payment details
export const getPaymentDetails = async (paymentId) => {
  try {
    const razorpay = getRazorpay();
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
};

export default getRazorpay;

