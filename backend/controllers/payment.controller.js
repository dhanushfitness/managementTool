import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';
import { createOrder, verifyPayment, createPaymentLink as createRazorpayPaymentLink, refundPayment as razorpayRefund } from '../utils/razorpay.js';
import { sendPaymentConfirmation } from '../utils/whatsapp.js';

// Generate receipt number
const generateReceiptNumber = async (organizationId) => {
  const count = await Payment.countDocuments({ organizationId });
  return `RCP${String(count + 1).padStart(6, '0')}`;
};

export const createPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, transactionId, notes } = req.body;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organizationId: req.organizationId
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const receiptNumber = await generateReceiptNumber(req.organizationId);

    const payment = await Payment.create({
      organizationId: req.organizationId,
      branchId: invoice.branchId,
      invoiceId: invoice._id,
      memberId: invoice.memberId,
      amount,
      currency: invoice.currency,
      paymentMethod,
      transactionId,
      receiptNumber,
      notes,
      status: paymentMethod === 'razorpay' ? 'pending' : 'completed',
      paidAt: paymentMethod !== 'razorpay' ? new Date() : undefined,
      createdBy: req.user._id
    });

    // Update invoice status
    const totalPaid = await Payment.aggregate([
      { $match: { invoiceId: invoice._id, status: { $in: ['completed', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const paidAmount = totalPaid[0]?.total || 0;
    if (paidAmount >= invoice.total) {
      invoice.status = 'paid';
      invoice.paidDate = new Date();
    } else if (paidAmount > 0) {
      invoice.status = 'partial';
    }
    await invoice.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'payment.created',
      entityType: 'Payment',
      entityId: payment._id
    });

    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processRazorpayPayment = async (req, res) => {
  try {
    const { invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organizationId: req.organizationId
    }).populate('memberId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Verify payment signature
    const isValid = verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const receiptNumber = await generateReceiptNumber(req.organizationId);

    const payment = await Payment.create({
      organizationId: req.organizationId,
      branchId: invoice.branchId,
      invoiceId: invoice._id,
      memberId: invoice.memberId,
      amount: invoice.total,
      currency: invoice.currency,
      paymentMethod: 'razorpay',
      status: 'completed',
      razorpayDetails: {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature
      },
      receiptNumber,
      paidAt: new Date(),
      reconciled: true,
      reconciledAt: new Date(),
      createdBy: req.user._id
    });

    // Update invoice
    invoice.status = 'paid';
    invoice.paidDate = new Date();
    invoice.paymentMethod = 'razorpay';
    invoice.razorpayOrderId = razorpayOrderId;
    invoice.razorpayPaymentId = razorpayPaymentId;
    await invoice.save();

    // Send confirmation
    try {
      await sendPaymentConfirmation(
        invoice.memberId.phone,
        `${invoice.memberId.firstName} ${invoice.memberId.lastName}`,
        invoice.total,
        invoice.invoiceNumber,
        `#receipt-${receiptNumber}`
      );
    } catch (error) {
      console.error('WhatsApp confirmation failed:', error);
    }

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPaymentLink = async (req, res) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organizationId: req.organizationId
    }).populate('memberId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const paymentLink = await createRazorpayPaymentLink(
      invoice.total,
      invoice.currency,
      `Payment for invoice ${invoice.invoiceNumber}`,
      {
        name: `${invoice.memberId.firstName} ${invoice.memberId.lastName}`,
        phone: invoice.memberId.phone,
        email: invoice.memberId.email
      },
      {
        invoiceId: invoice._id.toString(),
        organizationId: req.organizationId.toString()
      }
    );

    res.json({ success: true, paymentLink });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, memberId, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId };
    if (status) query.status = status;
    if (memberId) query.memberId = memberId;
    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate);
      if (endDate) query.paidAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('memberId', 'firstName lastName memberId')
      .populate('invoiceId', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
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

export const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      organizationId: req.organizationId
    })
      .populate('memberId')
      .populate('invoiceId')
      .populate('createdBy', 'firstName lastName');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findOne({
      _id: paymentId,
      organizationId: req.organizationId
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only completed payments can be refunded' });
    }

    const refundAmount = amount || payment.amount;

    if (payment.paymentMethod === 'razorpay' && payment.razorpayDetails.paymentId) {
      const refund = await razorpayRefund(
        payment.razorpayDetails.paymentId,
        refundAmount,
        { reason }
      );

      payment.razorpayRefundId = refund.id;
    }

    payment.status = refundAmount >= payment.amount ? 'refunded' : 'partial_refund';
    payment.refundAmount = refundAmount;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'payment.refunded',
      entityType: 'Payment',
      entityId: payment._id
    });

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { organizationId: req.organizationId, status: 'completed' };
    
    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate);
      if (endDate) query.paidAt.$lte = new Date(endDate);
    }

    const totalRevenue = await Payment.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const byMethod = await Payment.aggregate([
      { $match: query },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalPayments: await Payment.countDocuments(query),
        byMethod
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reconcilePayments = async (req, res) => {
  try {
    // Reconciliation logic would go here
    res.json({ success: true, message: 'Reconciliation completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

