import WebhookEvent from '../models/WebhookEvent.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Member from '../models/Member.js';
import { verifyPayment, verifyWebhookSignature } from '../utils/razorpay.js';
import { sendPaymentConfirmation } from '../utils/whatsapp.js';

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    if (!verifyWebhookSignature(req.body, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
    
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
          // Generate receipt number
          const receiptCount = await Payment.countDocuments({ organizationId: invoice.organizationId });
          const receiptNumber = `RCP${String(receiptCount + 1).padStart(6, '0')}`;

          const payment = await Payment.create({
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
            receiptNumber,
            paidAt: new Date(paymentData.created_at * 1000),
            reconciled: true,
            reconciledAt: new Date()
          });

          // Update invoice status and pending amount
          const totalPaid = await Payment.aggregate([
            { $match: { invoiceId: invoice._id, status: { $in: ['completed', 'processing'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]);
          const paidAmount = totalPaid[0]?.total || 0;
          const pendingAmount = Math.max(0, invoice.total - paidAmount);
          
          // Update invoice pending field
          invoice.pending = pendingAmount;
          
          if (paidAmount >= invoice.total) {
            invoice.status = 'paid';
            invoice.paidDate = new Date();
            
            // Activate membership only after payment is confirmed
            try {
              const { activateMembershipFromInvoice } = await import('../utils/membership.js');
              await activateMembershipFromInvoice(invoice);
            } catch (membershipError) {
              console.error('Failed to activate membership after payment:', membershipError);
              // Don't fail the payment if membership activation fails
            }
          } else if (paidAmount > 0) {
            invoice.status = 'partial';
          }
          invoice.paymentMethod = 'razorpay';
          invoice.razorpayPaymentId = paymentData.id;
          await invoice.save();

          // Send payment confirmation via WhatsApp
          try {
            const member = await Member.findById(invoice.memberId);
            if (member && member.phone) {
              await sendPaymentConfirmation(
                member.phone,
                `${member.firstName} ${member.lastName}`,
                paymentData.amount / 100,
                invoice.invoiceNumber,
                `#receipt-${receiptNumber}`
              );
            }
          } catch (whatsappError) {
            console.error('WhatsApp confirmation failed:', whatsappError);
          }
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

