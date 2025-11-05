import WebhookEvent from '../models/WebhookEvent.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Member from '../models/Member.js';
import { verifyPayment } from '../utils/razorpay.js';

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature (simplified - implement proper verification)
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Create webhook event record
    const webhookEvent = await WebhookEvent.create({
      source: 'razorpay',
      eventId: payload.id || `${Date.now()}-${Math.random()}`,
      eventType: event,
      payload,
      signature,
      status: 'pending'
    });

    // Process payment events
    if (event === 'payment.captured' || event === 'payment.authorized') {
      const paymentData = payload.payment.entity;
      
      // Find or create payment record
      const invoice = await Invoice.findOne({
        razorpayOrderId: paymentData.order_id
      });

      if (invoice) {
        const existingPayment = await Payment.findOne({
          'razorpayDetails.paymentId': paymentData.id
        });

        if (!existingPayment) {
          await Payment.create({
            organizationId: invoice.organizationId,
            branchId: invoice.branchId,
            invoiceId: invoice._id,
            memberId: invoice.memberId,
            amount: paymentData.amount / 100, // Convert from paise
            currency: paymentData.currency,
            status: 'completed',
            paymentMethod: 'razorpay',
            razorpayDetails: {
              orderId: paymentData.order_id,
              paymentId: paymentData.id,
              method: paymentData.method,
              bank: paymentData.bank,
              wallet: paymentData.wallet,
              vpa: paymentData.vpa
            },
            paidAt: new Date(paymentData.created_at * 1000),
            reconciled: true,
            reconciledAt: new Date()
          });

          // Update invoice
          invoice.status = 'paid';
          invoice.paidDate = new Date();
          invoice.paymentMethod = 'razorpay';
          invoice.razorpayPaymentId = paymentData.id;
          await invoice.save();
        }
      }
    }

    // Update webhook event status
    webhookEvent.status = 'processed';
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Update webhook event status
    if (req.body.payload?.id) {
      await WebhookEvent.findOneAndUpdate(
        { eventId: req.body.payload.id },
        { status: 'failed', error: error.message, $inc: { retryCount: 1 } }
      );
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleWhatsAppWebhook = async (req, res) => {
  try {
    const webhookEvent = await WebhookEvent.create({
      source: 'whatsapp',
      eventId: `${Date.now()}-${Math.random()}`,
      eventType: req.body.type || 'unknown',
      payload: req.body,
      status: 'processed',
      processedAt: new Date()
    });

    // Process WhatsApp delivery status, read receipts, etc.
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleBiometricWebhook = async (req, res) => {
  try {
    const { memberId, deviceId, timestamp, action } = req.body;

    if (action === 'checkin') {
      // Process biometric check-in
      // This would trigger the check-in flow
    }

    const webhookEvent = await WebhookEvent.create({
      source: 'biometric',
      eventId: `${Date.now()}-${Math.random()}`,
      eventType: action || 'checkin',
      payload: req.body,
      status: 'processed',
      processedAt: new Date()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWebhookEvents = async (req, res) => {
  try {
    const { source, status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId };
    if (source) query.source = source;
    if (status) query.status = status;

    const events = await WebhookEvent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WebhookEvent.countDocuments(query);

    res.json({
      success: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

