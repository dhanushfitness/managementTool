import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Generate invoice number
const generateInvoiceNumber = async (organizationId) => {
  const organization = await Organization.findById(organizationId);
  const prefix = organization.invoiceSettings.prefix || 'INV';
  const number = organization.invoiceSettings.nextNumber || 1;
  
  organization.invoiceSettings.nextNumber = number + 1;
  await organization.save();

  return `${prefix}-${String(number).padStart(6, '0')}`;
};

export const createInvoice = async (req, res) => {
  try {
    const {
      memberId, planId, items, discount, type, invoiceType, isProForma,
      sacCode, discountReason, customerNotes, internalNotes, paymentModes, rounding
    } = req.body;

    const invoiceNumber = await generateInvoiceNumber(req.organizationId);
    const organization = await Organization.findById(req.organizationId);

    // Calculate totals
    let subtotal = 0;
    const invoiceItems = items.map(item => {
      let itemAmount = item.unitPrice * item.quantity;
      
      // Apply item-level discount
      let itemDiscountAmount = 0;
      if (item.discount && item.discount.value > 0) {
        if (item.discount.type === 'flat') {
          itemDiscountAmount = item.discount.value;
        } else if (item.discount.type === 'percentage') {
          itemDiscountAmount = (itemAmount * item.discount.value) / 100;
        }
      }
      
      itemAmount = itemAmount - itemDiscountAmount;
      const taxRate = item.taxRate || organization.taxSettings.taxRate || 0;
      const taxAmount = itemAmount * taxRate / 100;
      const total = itemAmount + taxAmount;
      subtotal += itemAmount;

      return {
        ...item,
        amount: itemAmount,
        taxAmount,
        total,
        discount: item.discount ? { ...item.discount, amount: itemDiscountAmount } : undefined
      };
    });

    // Apply invoice-level discount
    let discountAmount = 0;
    if (discount) {
      if (discount.type === 'flat') {
        discountAmount = discount.value;
      } else if (discount.type === 'percentage') {
        discountAmount = (subtotal * discount.value) / 100;
      }
    }

    const taxRate = organization.taxSettings.taxRate || 0;
    const taxAmount = subtotal * taxRate / 100;
    let total = subtotal - discountAmount + taxAmount;
    
    // Apply rounding
    const roundingAmount = rounding || 0;
    total = Math.round(total + roundingAmount);

    // Calculate pending amount
    let totalPaid = 0;
    if (paymentModes && paymentModes.length > 0) {
      totalPaid = paymentModes.reduce((sum, pm) => sum + (parseFloat(pm.amount) || 0), 0);
    }
    const pending = total - totalPaid;

    const invoice = await Invoice.create({
      organizationId: req.organizationId,
      branchId: req.body.branchId || req.user.branchId,
      invoiceNumber,
      memberId,
      planId,
      type: type || (isProForma ? 'pro-forma' : 'membership'),
      invoiceType: invoiceType || 'service',
      isProForma: isProForma || false,
      items: invoiceItems,
      subtotal,
      discount: discount ? { ...discount, amount: discountAmount } : undefined,
      tax: {
        rate: taxRate,
        amount: taxAmount
      },
      rounding: roundingAmount,
      total,
      pending,
      sacCode: sacCode || undefined,
      discountReason: discountReason || undefined,
      customerNotes: customerNotes || undefined,
      internalNotes: internalNotes || undefined,
      paymentModes: paymentModes || undefined,
      status: totalPaid >= total ? 'paid' : (totalPaid > 0 ? 'partial' : 'draft'),
      currency: organization.currency || 'INR',
      createdBy: req.user._id
    });

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'invoice.created',
      entityType: 'Invoice',
      entityId: invoice._id
    });

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, memberId, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId };
    if (status) query.status = status;
    if (memberId) query.memberId = memberId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      invoices,
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

export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organizationId: req.organizationId
    })
      .populate('memberId')
      .populate('planId')
      .populate('createdBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organizationId: req.organizationId
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot update paid invoice' });
    }

    Object.assign(invoice, req.body);
    await invoice.save();

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organizationId: req.organizationId
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot delete paid invoice' });
    }

    await Invoice.deleteOne({ _id: invoice._id });

    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organizationId: req.organizationId
    }).populate('memberId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();

    // Send via WhatsApp or email
    // Implementation would go here

    res.json({ success: true, message: 'Invoice sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organizationId: req.organizationId
    })
      .populate('memberId')
      .populate('organizationId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Generate PDF
    const doc = new PDFDocument();
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // PDF content
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${invoice.createdAt.toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Member: ${invoice.memberId.firstName} ${invoice.memberId.lastName}`);
    doc.moveDown();

    // Items table
    doc.text('Items:', { underline: true });
    invoice.items.forEach(item => {
      doc.text(`${item.description} - ${item.quantity} x ₹${item.unitPrice} = ₹${item.total}`);
    });

    doc.moveDown();
    doc.text(`Subtotal: ₹${invoice.subtotal}`);
    if (invoice.discount) {
      doc.text(`Discount: -₹${invoice.discount.amount}`);
    }
    doc.text(`Tax: ₹${invoice.tax.amount}`);
    doc.fontSize(14).text(`Total: ₹${invoice.total}`, { underline: true });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvoiceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { organizationId: req.organizationId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const totalInvoices = await Invoice.countDocuments(query);
    const totalAmount = await Invoice.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const byStatus = await Invoice.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$total' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalInvoices,
        totalAmount: totalAmount[0]?.total || 0,
        byStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

