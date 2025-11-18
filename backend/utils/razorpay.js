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

// Verify webhook signature
export const verifyWebhookSignature = (payload, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('Razorpay webhook secret not configured. Skipping signature verification.');
    return true; // Allow in development/test mode
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return expectedSignature === signature;
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
        sms: false, // Disable automatic SMS - SMS will be sent manually via button click
        email: false // Disable automatic email - can be enabled if needed
      },
      reminder_enable: false, // Disable automatic reminders
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

// Create QR code for payment
export const createQRCode = async (amount, currency, description, customer, notes = {}) => {
  try {
    const razorpay = getRazorpay();
    
    // Try creating QR code with minimal required parameters
    const qrCodeParams = {
      type: 'upi_qr',
      name: description || 'Payment QR Code',
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: amount * 100 // Convert to paise
    };
    
    // Add optional parameters only if they exist
    if (customer && customer.name) {
      qrCodeParams.customer = {
        name: customer.name
      };
      if (customer.phone) qrCodeParams.customer.contact = customer.phone;
      if (customer.email) qrCodeParams.customer.email = customer.email;
    }
    
    if (description) {
      qrCodeParams.description = description;
    }
    
    // Set expiry to 1 hour from now
    qrCodeParams.close_by = Math.floor(Date.now() / 1000) + 3600;
    
    if (Object.keys(notes).length > 0) {
      qrCodeParams.notes = notes;
    }
    
    console.log('Creating Razorpay QR code with params:', JSON.stringify(qrCodeParams, null, 2));
    
    const qrCode = await razorpay.qrCode.create(qrCodeParams);
    
    console.log('QR code created successfully:', {
      id: qrCode.id,
      type: qrCode.type,
      status: qrCode.status,
      hasImage: !!qrCode.image_url,
      hasShortUrl: !!qrCode.short_url,
      hasQrString: !!qrCode.qr_string,
      allKeys: Object.keys(qrCode)
    });
    
    return qrCode;
  } catch (error) {
    // Better error logging
    const errorMessage = error.message || error.error?.description || error.error?.message || 'Unknown error';
    const errorDetails = error.error || error.response || error;
    
    console.error('Razorpay QR Code API Error Details:');
    console.error('- Error Message:', errorMessage);
    console.error('- Full Error:', error);
    if (error.error) {
      console.error('- Error.error:', error.error);
    }
    if (error.response) {
      console.error('- Error.response:', error.response);
    }
    console.error('- Status Code:', error.statusCode || error.status || 'N/A');
    console.error('- Error Object (stringified):', JSON.stringify(errorDetails, null, 2));
    
    // Check if it's a feature not available error
    if (error.statusCode === 400 || error.statusCode === 404) {
      throw new Error(`Razorpay QR code feature may not be available for your account. Error: ${errorMessage}`);
    }
    
    throw new Error(`Razorpay QR code creation failed: ${errorMessage}`);
  }
};

// Get QR code details
export const getQRCodeDetails = async (qrCodeId) => {
  try {
    const razorpay = getRazorpay();
    const qrCode = await razorpay.qrCode.fetch(qrCodeId);
    return qrCode;
  } catch (error) {
    throw new Error(`Failed to fetch QR code: ${error.message}`);
  }
};

export default getRazorpay;

