import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
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

export const getReceipts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      invoiceType,
      salesRepId,
      branchId
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build date query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.paidAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      
      switch (dateRange) {
        case 'last-7-days':
          start.setDate(start.getDate() - 7);
          break;
        case 'last-30-days':
          start.setDate(start.getDate() - 30);
          break;
        case 'last-90-days':
          start.setDate(start.getDate() - 90);
          break;
        case 'this-month':
          start.setDate(1);
          break;
        case 'last-month':
          start.setMonth(start.getMonth() - 1);
          start.setDate(1);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }
      
      start.setHours(0, 0, 0, 0);
      dateQuery.paidAt = {
        $gte: start,
        $lte: end
      };
    }

    const query = { 
      organizationId: req.organizationId,
      status: 'completed',
      ...dateQuery
    };
    
    if (branchId) query.branchId = branchId;

    // Build search query
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const memberIds = await Member.find({
        organizationId: req.organizationId,
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { phone: searchRegex },
          { memberId: searchRegex }
        ]
      }).select('_id');
      
      query.$or = [
        { receiptNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    // Get payments (receipts) with populated data
    let paymentsQuery = Payment.find(query)
      .populate({
        path: 'memberId',
        select: 'firstName lastName phone memberId'
      })
      .populate({
        path: 'invoiceId',
        select: 'invoiceNumber isProForma type invoiceType items',
        populate: [
          { path: 'createdBy', select: 'firstName lastName' },
          { path: 'branchId', select: 'name' }
        ]
      })
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ paidAt: -1, createdAt: -1 });

    if (salesRepId) {
      paymentsQuery = paymentsQuery.where('createdBy').equals(salesRepId);
    }

    const payments = await paymentsQuery
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by invoice type if provided
    let filteredReceipts = payments;
    if (invoiceType && invoiceType !== 'all') {
      filteredReceipts = payments.filter(p => p.invoiceId?.invoiceType === invoiceType);
    }

    // Format receipts data
    const receipts = filteredReceipts.map(payment => ({
      ...payment.toObject(),
      invoice: payment.invoiceId
    }));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        receipts: receipts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportReceipts = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      invoiceType,
      salesRepId,
      branchId
    } = req.query;

    // Build date query (same as getReceipts)
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.paidAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      
      switch (dateRange) {
        case 'last-7-days':
          start.setDate(start.getDate() - 7);
          break;
        case 'last-30-days':
          start.setDate(start.getDate() - 30);
          break;
        case 'last-90-days':
          start.setDate(start.getDate() - 90);
          break;
        case 'this-month':
          start.setDate(1);
          break;
        case 'last-month':
          start.setMonth(start.getMonth() - 1);
          start.setDate(1);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }
      
      start.setHours(0, 0, 0, 0);
      dateQuery.paidAt = {
        $gte: start,
        $lte: end
      };
    }

    const query = { 
      organizationId: req.organizationId,
      status: 'completed',
      ...dateQuery
    };
    
    if (branchId) query.branchId = branchId;

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const memberIds = await Member.find({
        organizationId: req.organizationId,
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { phone: searchRegex },
          { memberId: searchRegex }
        ]
      }).select('_id');
      
      query.$or = [
        { receiptNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    if (salesRepId) {
      query.createdBy = salesRepId;
    }

    const payments = await Payment.find(query)
      .populate({
        path: 'memberId',
        select: 'firstName lastName phone memberId'
      })
      .populate({
        path: 'invoiceId',
        select: 'invoiceNumber isProForma type invoiceType items',
        populate: {
          path: 'createdBy',
          select: 'firstName lastName'
        }
      })
      .populate('createdBy', 'firstName lastName')
      .sort({ paidAt: -1, createdAt: -1 });

    // Filter by invoice type if provided
    let filteredPayments = payments;
    if (invoiceType && invoiceType !== 'all') {
      filteredPayments = payments.filter(p => p.invoiceId?.invoiceType === invoiceType);
    }

    // Format receipts data
    const receipts = filteredPayments.map(payment => ({
      ...payment.toObject(),
      invoice: payment.invoiceId
    }));

    // Generate CSV
    const headers = [
      'S.No',
      'Sequence',
      'Receipt No',
      'Pro Forma Invoice No',
      'Invoice No',
      'Member ID',
      'Member Name',
      'Date',
      'Service',
      'Sales Rep Name',
      'PT Name',
      'Created By',
      'Paid Amount',
      'Pay Mode'
    ];
    
    let csvContent = headers.join(',') + '\n';

    receipts.forEach((receipt, index) => {
      receipt.invoice?.items?.forEach((item, itemIndex) => {
        const paymentMethodLabel = receipt.paymentMethod === 'razorpay' ? 'Online Payment' :
          receipt.paymentMethod === 'cash' ? 'Cash' :
          receipt.paymentMethod === 'card' ? 'Card' :
          receipt.paymentMethod === 'upi' ? 'UPI' :
          receipt.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
          receipt.paymentMethod || 'Other';
        
        const row = [
          index + 1,
          'Branch Sequence',
          receipt.receiptNumber || '',
          receipt.invoice?.isProForma ? receipt.invoice.invoiceNumber : '',
          receipt.invoice?.invoiceNumber || '',
          receipt.memberId?.memberId || '',
          `${receipt.memberId?.firstName || ''} ${receipt.memberId?.lastName || ''}`.trim(),
          receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString('en-GB') : 
          receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString('en-GB') : '',
          item.description || '',
          receipt.createdBy ? `${receipt.createdBy.firstName || ''} ${receipt.createdBy.lastName || ''}`.trim() : '',
          '', // PT Name
          receipt.invoice?.createdBy ? `${receipt.invoice.createdBy.firstName || ''} ${receipt.invoice.createdBy.lastName || ''}`.trim() : '',
          receipt.amount?.toFixed(2) || '0.00',
          paymentMethodLabel
        ];
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=receipts-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

