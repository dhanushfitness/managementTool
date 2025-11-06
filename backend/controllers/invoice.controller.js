import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import Member from '../models/Member.js';
import Payment from '../models/Payment.js';
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
    const { 
      page = 1, 
      limit = 20, 
      status, 
      memberId, 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      ptId,
      generalTrainerId,
      invoiceType
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build date query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
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
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const query = { 
      organizationId: req.organizationId,
      ...dateQuery
    };
    
    if (status && status !== 'all') query.status = status;
    if (memberId) query.memberId = memberId;
    if (branchId) query.branchId = branchId;
    if (invoiceType && invoiceType !== 'all') query.invoiceType = invoiceType;
    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        query.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        query.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

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
        { invoiceNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    // Get invoices with populated data
    let invoicesQuery = Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ paidDate: -1, createdAt: -1 });

    // Apply filters for sales rep, PT, general trainer
    // Note: These would need to be stored in invoice or derived from member relationships
    // For now, we'll filter by createdBy for sales rep
    if (salesRepId) {
      invoicesQuery = invoicesQuery.where('createdBy').equals(salesRepId);
    }

    const invoices = await invoicesQuery
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    // Calculate summary statistics
    const summaryQuery = { ...query };
    const allInvoicesForSummary = await Invoice.find(summaryQuery)
      .populate('memberId', 'firstName lastName')
      .populate('items.serviceId', 'name');

    let serviceNonPTSales = 0;
    let servicePTSales = 0;
    let productSales = 0;

    allInvoicesForSummary.forEach(invoice => {
      invoice.items?.forEach(item => {
        const itemTotal = item.total || 0;
        // Determine if it's PT, non-PT service, or product based on item description or service type
        const description = (item.description || '').toLowerCase();
        if (description.includes('pt') || description.includes('personal trainer')) {
          servicePTSales += itemTotal;
        } else if (invoice.invoiceType === 'service') {
          serviceNonPTSales += itemTotal;
        } else if (invoice.invoiceType === 'package' || invoice.invoiceType === 'deal') {
          productSales += itemTotal;
        } else {
          serviceNonPTSales += itemTotal;
        }
      });
    });

    res.json({
      success: true,
      data: {
        invoices,
        summary: {
          serviceNonPTSales,
          servicePTSales,
          productSales
        },
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

export const getPaidInvoices = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      sequence,
      invoiceType
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build date query - use paidDate if available, otherwise createdAt
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.$or = [
        { paidDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { paidDate: null, createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
      ];
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
      dateQuery.$or = [
        { paidDate: { $gte: start, $lte: end } },
        { paidDate: null, createdAt: { $gte: start, $lte: end } }
      ];
    }

    const query = { 
      organizationId: req.organizationId,
      status: 'paid',
      ...dateQuery
    };
    
    if (branchId) query.branchId = branchId;
    if (invoiceType && invoiceType !== 'all') query.invoiceType = invoiceType;
    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        query.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        query.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

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
        { invoiceNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    // Get invoices with populated data
    let invoicesQuery = Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ paidDate: -1, createdAt: -1 });

    if (salesRepId) {
      invoicesQuery = invoicesQuery.where('createdBy').equals(salesRepId);
    }

    const invoices = await invoicesQuery
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    // Calculate tax breakdown and totals
    const summaryQuery = { ...query };
    const allInvoicesForSummary = await Invoice.find(summaryQuery)
      .populate('memberId', 'firstName lastName')
      .populate('items.serviceId', 'name');

    let totalPaid = 0;
    let totalTax = 0;

    // Process invoices with tax breakdown
    const processedInvoices = invoices.map(invoice => {
      const baseValue = invoice.subtotal || 0;
      const taxAmount = invoice.tax?.amount || 0;
      const totalAmount = invoice.total || 0;
      
      totalPaid += totalAmount;
      totalTax += taxAmount;

      // Calculate CGST, SGST, IGST (assuming 50-50 split for CGST/SGST if tax rate is provided)
      const taxRate = invoice.tax?.rate || 0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      
      // For now, split tax equally between CGST and SGST (can be customized based on business logic)
      if (taxRate > 0 && taxAmount > 0) {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      }

      return {
        ...invoice.toObject(),
        baseValue,
        taxAmount,
        cgst,
        sgst,
        igst,
        finalAmount: totalAmount
      };
    });

    res.json({
      success: true,
      data: {
        invoices: processedInvoices,
        summary: {
          totalPaid,
          totalTax
        },
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

export const exportPaidInvoices = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      sequence,
      invoiceType
    } = req.query;

    // Build date query (same as getPaidInvoices)
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.$or = [
        { paidDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { paidDate: null, createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
      ];
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
      dateQuery.$or = [
        { paidDate: { $gte: start, $lte: end } },
        { paidDate: null, createdAt: { $gte: start, $lte: end } }
      ];
    }

    const query = { 
      organizationId: req.organizationId,
      status: 'paid',
      ...dateQuery
    };
    
    if (branchId) query.branchId = branchId;
    if (invoiceType && invoiceType !== 'all') query.invoiceType = invoiceType;
    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        query.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        query.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

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
        { invoiceNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    if (salesRepId) {
      query.createdBy = salesRepId;
    }

    const invoices = await Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ paidDate: -1, createdAt: -1 });

    // Generate CSV
    const headers = [
      'S.No',
      'Invoice Date',
      'Bill Type',
      'Payment Type',
      'Sequence',
      'Member ID',
      'Member Name',
      'GST No',
      'Pro Forma Invoice No.',
      'Paid Invoice No.',
      'Receipt No.',
      'Service',
      'Sales Rep Name',
      'General Trainer Name',
      'PT Name',
      'Created By',
      'Base Value',
      'CGST',
      'SGST',
      'IGST',
      'Fin Arr'
    ];
    
    let csvContent = headers.join(',') + '\n';

    invoices.forEach((invoice, index) => {
      invoice.items?.forEach((item, itemIndex) => {
        const baseValue = invoice.subtotal || 0;
        const taxAmount = invoice.tax?.amount || 0;
        const taxRate = invoice.tax?.rate || 0;
        const cgst = taxRate > 0 ? taxAmount / 2 : 0;
        const sgst = taxRate > 0 ? taxAmount / 2 : 0;
        const igst = 0; // IGST typically for inter-state transactions
        
        const row = [
          index + 1,
          invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString('en-GB') : 
          invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : '',
          invoice.type === 'pro-forma' ? 'Pro Forma' : 
          invoice.type === 'renewal' ? 'Rebooking' : 
          invoice.type === 'membership' ? 'New Booking' : invoice.type || '',
          'New Payment', // Payment Type
          'Branch Sequence', // Sequence
          invoice.memberId?.memberId || '',
          `${invoice.memberId?.firstName || ''} ${invoice.memberId?.lastName || ''}`.trim(),
          invoice.sacCode || '', // GST No
          invoice.isProForma ? invoice.invoiceNumber : '',
          invoice.status === 'paid' ? invoice.invoiceNumber : '',
          '', // Receipt No - would need to be added to model
          item.description || '',
          invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() : '',
          '', // General Trainer
          '', // PT Name
          invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() : '',
          baseValue.toFixed(2),
          cgst.toFixed(2),
          sgst.toFixed(2),
          igst.toFixed(2),
          invoice.total?.toFixed(2) || '0.00'
        ];
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=paid-invoices-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPendingCollections = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      ptId,
      generalTrainerId,
      invoiceType,
      paymentStatus = 'pending'
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build date query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
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
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // Build query for pending invoices
    const query = { 
      organizationId: req.organizationId,
      status: { $in: ['sent', 'partial', 'overdue'] },
      pending: { $gt: 0 }, // Only invoices with pending amount
      ...dateQuery
    };
    
    if (branchId) query.branchId = branchId;
    if (invoiceType && invoiceType !== 'all') query.invoiceType = invoiceType;
    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        query.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        query.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

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
        { invoiceNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    // Get invoices with populated data
    let invoicesQuery = Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ dueDate: 1, createdAt: -1 });

    if (salesRepId) {
      invoicesQuery = invoicesQuery.where('createdBy').equals(salesRepId);
    }

    const invoices = await invoicesQuery
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    // Calculate pending amounts by category
    const summaryQuery = { ...query };
    const allInvoicesForSummary = await Invoice.find(summaryQuery)
      .populate('memberId', 'firstName lastName')
      .populate('items.serviceId', 'name');

    let serviceNonPTPending = 0;
    let servicePTPending = 0;
    let productPending = 0;

    allInvoicesForSummary.forEach(invoice => {
      const pendingAmount = invoice.pending || 0;
      invoice.items?.forEach(item => {
        const itemPending = (pendingAmount / (invoice.items.length || 1));
        const description = (item.description || '').toLowerCase();
        
        if (description.includes('pt') || description.includes('personal trainer')) {
          servicePTPending += itemPending;
        } else if (invoice.invoiceType === 'service') {
          serviceNonPTPending += itemPending;
        } else if (invoice.invoiceType === 'package' || invoice.invoiceType === 'deal') {
          productPending += itemPending;
        } else {
          serviceNonPTPending += itemPending;
        }
      });
    });

    // Get payment details for each invoice
    const invoiceIds = invoices.map(inv => inv._id);
    const payments = await Payment.find({
      invoiceId: { $in: invoiceIds },
      organizationId: req.organizationId,
      status: 'completed'
    }).select('invoiceId amount');

    const paymentsByInvoice = {};
    payments.forEach(payment => {
      const invoiceId = payment.invoiceId.toString();
      if (!paymentsByInvoice[invoiceId]) {
        paymentsByInvoice[invoiceId] = 0;
      }
      paymentsByInvoice[invoiceId] += payment.amount || 0;
    });

    // Add payment details to invoices
    const invoicesWithPayments = invoices.map(invoice => {
      const paidAmount = paymentsByInvoice[invoice._id.toString()] || 0;
      return {
        ...invoice.toObject(),
        paidAmount,
        pendingAmount: invoice.pending || 0
      };
    });

    res.json({
      success: true,
      data: {
        invoices: invoicesWithPayments,
        summary: {
          serviceNonPTPending,
          servicePTPending,
          productPending
        },
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

export const exportPendingCollections = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      invoiceType
    } = req.query;

    // Build date query (same as getPendingCollections)
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
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
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const query = { 
      organizationId: req.organizationId,
      status: { $in: ['sent', 'partial', 'overdue'] },
      pending: { $gt: 0 },
      ...dateQuery
    };
    
    if (branchId) query.branchId = branchId;
    if (invoiceType && invoiceType !== 'all') query.invoiceType = invoiceType;
    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        query.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        query.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

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
        { invoiceNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    if (salesRepId) {
      query.createdBy = salesRepId;
    }

    const invoices = await Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ dueDate: 1, createdAt: -1 });

    // Get payments
    const invoiceIds = invoices.map(inv => inv._id);
    const payments = await Payment.find({
      invoiceId: { $in: invoiceIds },
      organizationId: req.organizationId,
      status: 'completed'
    }).select('invoiceId amount');

    const paymentsByInvoice = {};
    payments.forEach(payment => {
      const invoiceId = payment.invoiceId.toString();
      if (!paymentsByInvoice[invoiceId]) {
        paymentsByInvoice[invoiceId] = 0;
      }
      paymentsByInvoice[invoiceId] += payment.amount || 0;
    });

    // Generate CSV
    const headers = [
      'S.No',
      'Purchase Date',
      'Bill Type',
      'Payment Due Date',
      'Branch Location',
      'Member ID',
      'Member Name',
      'Contact Number',
      'GST No',
      'Pro Forma Invoice No.',
      'Yoactiv Ref No.',
      'Sequence',
      'Cancelled Paid Invoice',
      'Description Service',
      'Start Date',
      'End Date',
      'PT Name',
      'Sales Rep Name',
      'General Trainer'
    ];
    
    let csvContent = headers.join(',') + '\n';

    invoices.forEach((invoice, index) => {
      invoice.items?.forEach((item, itemIndex) => {
        const row = [
          index + 1,
          invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : '',
          invoice.type === 'pro-forma' ? 'Pro Forma' : 
          invoice.type === 'renewal' ? 'Rebooking' : 
          invoice.type === 'membership' ? 'New Booking' : invoice.type || '',
          invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '',
          invoice.branchId?.name || '',
          invoice.memberId?.memberId || '',
          `${invoice.memberId?.firstName || ''} ${invoice.memberId?.lastName || ''}`.trim(),
          invoice.memberId?.phone || '',
          invoice.sacCode || '',
          invoice.isProForma ? invoice.invoiceNumber : '',
          '', // Yoactiv Ref No
          'Branch Sequence',
          invoice.status === 'cancelled' ? 'Yes' : '',
          item.description || '',
          item.startDate ? new Date(item.startDate).toLocaleDateString('en-GB') : '',
          item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : '',
          '', // PT Name
          invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() : '',
          '' // General Trainer
        ];
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=pending-collections-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCancelledInvoices = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      ptId,
      generalTrainerId,
      invoiceType
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build date query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
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
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // Build query for cancelled invoices
    const query = { 
      organizationId: req.organizationId,
      status: 'cancelled',
      ...dateQuery
    };
    
    if (branchId) query.branchId = branchId;
    if (invoiceType && invoiceType !== 'all') query.invoiceType = invoiceType;
    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        query.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        query.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

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
        { invoiceNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    // Get invoices with populated data
    let invoicesQuery = Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ updatedAt: -1, createdAt: -1 });

    if (salesRepId) {
      invoicesQuery = invoicesQuery.where('createdBy').equals(salesRepId);
    }

    const invoices = await invoicesQuery
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    // Calculate sales by category
    const summaryQuery = { ...query };
    const allInvoicesForSummary = await Invoice.find(summaryQuery)
      .populate('memberId', 'firstName lastName')
      .populate('items.serviceId', 'name');

    let serviceNonPTSales = 0;
    let servicePTSales = 0;
    let productSales = 0;

    allInvoicesForSummary.forEach(invoice => {
      const totalAmount = invoice.total || 0;
      invoice.items?.forEach(item => {
        const itemAmount = (totalAmount / (invoice.items.length || 1));
        const description = (item.description || '').toLowerCase();
        
        if (description.includes('pt') || description.includes('personal trainer')) {
          servicePTSales += itemAmount;
        } else if (invoice.invoiceType === 'service') {
          serviceNonPTSales += itemAmount;
        } else if (invoice.invoiceType === 'package' || invoice.invoiceType === 'deal') {
          productSales += itemAmount;
        } else {
          serviceNonPTSales += itemAmount;
        }
      });
    });

    // Get payment details for each invoice
    const invoiceIds = invoices.map(inv => inv._id);
    const payments = await Payment.find({
      invoiceId: { $in: invoiceIds },
      organizationId: req.organizationId,
      status: 'completed'
    }).select('invoiceId amount');

    const paymentsByInvoice = {};
    payments.forEach(payment => {
      const invoiceId = payment.invoiceId.toString();
      if (!paymentsByInvoice[invoiceId]) {
        paymentsByInvoice[invoiceId] = 0;
      }
      paymentsByInvoice[invoiceId] += payment.amount || 0;
    });

    // Get cancelled by info from audit logs
    const auditLogs = await AuditLog.find({
      organizationId: req.organizationId,
      entityType: 'Invoice',
      entityId: { $in: invoiceIds },
      action: 'invoice.cancelled'
    })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 });

    const cancelledByMap = {};
    auditLogs.forEach(log => {
      const invoiceId = log.entityId.toString();
      if (!cancelledByMap[invoiceId]) {
        cancelledByMap[invoiceId] = {
          user: log.userId,
          date: log.createdAt
        };
      }
    });

    // Add payment and cancellation details to invoices
    const invoicesWithDetails = invoices.map(invoice => {
      const paidAmount = paymentsByInvoice[invoice._id.toString()] || 0;
      const cancelledInfo = cancelledByMap[invoice._id.toString()];
      return {
        ...invoice.toObject(),
        paidAmount,
        pendingAmount: (invoice.total || 0) - paidAmount,
        cancelledBy: cancelledInfo?.user,
        cancelledAt: cancelledInfo?.date || invoice.updatedAt,
        cancellationReason: invoice.internalNotes || invoice.notes || ''
      };
    });

    res.json({
      success: true,
      data: {
        invoices: invoicesWithDetails,
        summary: {
          serviceNonPTSales,
          servicePTSales,
          productSales
        },
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

export const exportCancelledInvoices = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      invoiceType
    } = req.query;

    // Build date query (same as getCancelledInvoices)
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
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
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const query = { 
      organizationId: req.organizationId,
      status: 'cancelled',
      ...dateQuery
    };
    
    if (branchId) query.branchId = branchId;
    if (invoiceType && invoiceType !== 'all') query.invoiceType = invoiceType;
    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        query.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        query.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

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
        { invoiceNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    if (salesRepId) {
      query.createdBy = salesRepId;
    }

    const invoices = await Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ updatedAt: -1, createdAt: -1 });

    // Get payments
    const invoiceIds = invoices.map(inv => inv._id);
    const payments = await Payment.find({
      invoiceId: { $in: invoiceIds },
      organizationId: req.organizationId,
      status: 'completed'
    }).select('invoiceId amount');

    const paymentsByInvoice = {};
    payments.forEach(payment => {
      const invoiceId = payment.invoiceId.toString();
      if (!paymentsByInvoice[invoiceId]) {
        paymentsByInvoice[invoiceId] = 0;
      }
      paymentsByInvoice[invoiceId] += payment.amount || 0;
    });

    // Get cancelled by info
    const auditLogs = await AuditLog.find({
      organizationId: req.organizationId,
      entityType: 'Invoice',
      entityId: { $in: invoiceIds },
      action: 'invoice.cancelled'
    })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 });

    const cancelledByMap = {};
    auditLogs.forEach(log => {
      const invoiceId = log.entityId.toString();
      if (!cancelledByMap[invoiceId]) {
        cancelledByMap[invoiceId] = {
          user: log.userId,
          date: log.createdAt
        };
      }
    });

    // Generate CSV
    const headers = [
      'S.No',
      'Purchase Date',
      'Bill Type',
      'Branch Location',
      'Member ID',
      'Member Name',
      'Contact Number',
      'GST No',
      'Pro Forma Invoice No.',
      'Yoactiv Ref No.',
      'Sequence',
      'Cancelled Paid Invoice',
      'Description Service',
      'Start Date',
      'End Date',
      'PT Name',
      'Sales Rep Name',
      'General Trainer',
      'Created By',
      'Amount',
      'Tax Amount',
      'Final Amount',
      'Paid',
      'TDS Amount',
      'Pending',
      'Pay Mode',
      'Cancelled By',
      'Reason'
    ];
    
    let csvContent = headers.join(',') + '\n';

    invoices.forEach((invoice, index) => {
      const paidAmount = paymentsByInvoice[invoice._id.toString()] || 0;
      const cancelledInfo = cancelledByMap[invoice._id.toString()];
      const cancelledByText = cancelledInfo?.user 
        ? `${cancelledInfo.user.firstName || ''} ${cancelledInfo.user.lastName || ''}`.trim()
        : '';
      const cancelledDate = cancelledInfo?.date || invoice.updatedAt;
      const cancelledDateText = cancelledDate 
        ? new Date(cancelledDate).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : '';
      
      invoice.items?.forEach((item, itemIndex) => {
        const row = [
          index + 1,
          invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : '',
          invoice.type === 'pro-forma' ? 'Pro Forma' : 
          invoice.type === 'renewal' ? 'Rebooking' : 
          invoice.type === 'membership' ? 'New Booking' : invoice.type || '',
          invoice.branchId?.name || '',
          invoice.memberId?.memberId || '',
          `${invoice.memberId?.firstName || ''} ${invoice.memberId?.lastName || ''}`.trim(),
          invoice.memberId?.phone || '',
          invoice.sacCode || '',
          invoice.isProForma ? invoice.invoiceNumber : '',
          '', // Yoactiv Ref No
          'Branch Sequence',
          invoice.status === 'cancelled' ? 'Yes' : '',
          item.description || '',
          item.startDate ? new Date(item.startDate).toLocaleDateString('en-GB') : '',
          item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : '',
          '', // PT Name
          invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() : '',
          '', // General Trainer
          invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() : '',
          (invoice.total || 0).toFixed(2),
          (invoice.tax?.amount || 0).toFixed(2),
          (invoice.total || 0).toFixed(2),
          paidAmount.toFixed(2),
          '0.00', // TDS Amount
          ((invoice.total || 0) - paidAmount).toFixed(2),
          invoice.paymentMethod || '',
          cancelledByText ? `${cancelledByText} (${cancelledDateText})` : '',
          invoice.internalNotes || invoice.notes || ''
        ];
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cancelled-invoices-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
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

export const exportInvoices = async (req, res) => {
  try {
    const { 
      status, 
      memberId, 
      startDate, 
      endDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      invoiceType
    } = req.query;

    // Build date query (same as getInvoices)
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
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
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const query = { 
      organizationId: req.organizationId,
      ...dateQuery
    };
    
    if (status && status !== 'all') query.status = status;
    if (memberId) query.memberId = memberId;
    if (branchId) query.branchId = branchId;
    if (invoiceType && invoiceType !== 'all') query.invoiceType = invoiceType;
    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        query.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        query.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

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
        { invoiceNumber: searchRegex },
        { memberId: { $in: memberIds.map(m => m._id) } }
      ];
    }

    if (salesRepId) {
      query.createdBy = salesRepId;
    }

    const invoices = await Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ paidDate: -1, createdAt: -1 });

    // Generate CSV
    const headers = [
      'S.No',
      'Purchase Date',
      'Bill Type',
      'Branch Location',
      'Member ID',
      'Member Name',
      'Contact Number',
      'GST No',
      'Pro Forma Invoice No.',
      'Yoactiv Ref No.',
      'Sequence',
      'Cancelled Paid Invoice',
      'Description Service',
      'Start Date',
      'End Date',
      'PT Name',
      'Sales Rep Name',
      'General Trainer'
    ];
    
    let csvContent = headers.join(',') + '\n';

    invoices.forEach((invoice, index) => {
      invoice.items?.forEach((item, itemIndex) => {
        const row = [
          index + 1,
          invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : '',
          invoice.type === 'pro-forma' ? 'Pro Forma' : 
          invoice.type === 'renewal' ? 'Rebooking' : 
          invoice.type === 'membership' ? 'New Booking' : invoice.type || '',
          invoice.branchId?.name || '',
          invoice.memberId?.memberId || '',
          `${invoice.memberId?.firstName || ''} ${invoice.memberId?.lastName || ''}`.trim(),
          invoice.memberId?.phone || '',
          '', // GST No - would need to be added to model
          invoice.invoiceNumber || '',
          '', // Yoactiv Ref No
          'Branch Sequence', // Sequence
          '', // Cancelled Paid Invoice
          item.description || '',
          item.startDate ? new Date(item.startDate).toLocaleDateString('en-GB') : '',
          item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : '',
          '', // PT Name - would need to be stored or derived
          invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() : '',
          '' // General Trainer
        ];
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=invoices-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

