import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import Member from '../models/Member.js';
import Payment from '../models/Payment.js';
import FollowUp from '../models/FollowUp.js';
import MemberCallLog from '../models/MemberCallLog.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { handleError } from '../utils/errorHandler.js';

const normalizeInvoiceDate = (value) => {
  if (!value) return new Date();

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const buildInvoiceDateRangeQuery = (startInput, endInput) => {
  const start = startInput ? new Date(startInput) : null;
  const end = endInput ? new Date(endInput) : null;

  const range = {};
  if (start && !Number.isNaN(start.getTime())) {
    range.$gte = start;
  }
  if (end && !Number.isNaN(end.getTime())) {
    range.$lte = end;
  }

  if (Object.keys(range).length === 0) {
    return {};
  }

  return {
    $or: [
      { dateOfInvoice: range },
      { dateOfInvoice: { $exists: false }, createdAt: range },
      { dateOfInvoice: null, createdAt: range }
    ]
  };
};

const buildPaidDateRangeQuery = (startInput, endInput) => {
  const start = startInput ? new Date(startInput) : null;
  const end = endInput ? new Date(endInput) : null;

  const paidRange = {};
  if (start && !Number.isNaN(start.getTime())) {
    paidRange.$gte = start;
  }
  if (end && !Number.isNaN(end.getTime())) {
    paidRange.$lte = end;
  }

  if (Object.keys(paidRange).length === 0) {
    return {};
  }

  return {
    $or: [
      { paidDate: paidRange },
      {
        $and: [
          { $or: [{ paidDate: null }, { paidDate: { $exists: false } }] },
          buildInvoiceDateRangeQuery(start, end)
        ]
      }
    ]
  };
};

const getInvoiceDateValue = (invoice) => invoice?.dateOfInvoice || invoice?.createdAt;

const applyDateQuery = (query, dateQuery) => {
  if (dateQuery && Object.keys(dateQuery).length > 0) {
    query.$and = [...(query.$and || []), dateQuery];
  }
};

// Helper function to update scheduled calls when expiry date changes
const updateScheduledCallsForExpiryDate = async (memberId, newExpiryDate, organizationId) => {
  try {
    if (!memberId || !newExpiryDate) {
      console.log('Skipping call update: missing memberId or expiryDate');
      return;
    }

    const expiryDate = new Date(newExpiryDate);
    if (isNaN(expiryDate.getTime())) {
      console.log('Skipping call update: invalid expiry date');
      return;
    }

    // Calculate new renewal call date (7 days before expiry)
    const renewalCallDate = new Date(expiryDate);
    renewalCallDate.setDate(renewalCallDate.getDate() - 7);
    renewalCallDate.setHours(10, 0, 0, 0);

    console.log('Updating scheduled calls for member:', memberId);
    console.log('New expiry date:', expiryDate);
    console.log('New renewal call date:', renewalCallDate);

    // Update renewal calls in FollowUp
    const updatedFollowUps = await FollowUp.updateMany(
      {
        organizationId,
        'relatedTo.entityType': 'member',
        'relatedTo.entityId': memberId,
        callType: 'renewal-call',
        callStatus: 'scheduled',
        status: 'pending'
      },
      {
        $set: {
          scheduledTime: renewalCallDate,
          dueDate: renewalCallDate,
          description: `Renewal call scheduled 7 days before membership expiry (${expiryDate.toLocaleDateString()})`
        }
      }
    );

    console.log(`Updated ${updatedFollowUps.modifiedCount} FollowUp renewal calls`);

    // Update renewal calls in MemberCallLog
    const updatedCallLogs = await MemberCallLog.updateMany(
      {
        organizationId,
        memberId,
        callType: 'renewal',
        status: 'scheduled'
      },
      {
        $set: {
          scheduledAt: renewalCallDate
        }
      }
    );

    console.log(`Updated ${updatedCallLogs.modifiedCount} MemberCallLog renewal calls`);
    console.log('Call update completed successfully');
  } catch (error) {
    console.error('Failed to update scheduled calls:', error);
    // Don't throw error - date change should still succeed
  }
};

// Generate invoice number
const generateInvoiceNumber = async (organizationId) => {
  const maxRetries = 10; // Maximum number of retries to avoid infinite loop
  let attempts = 0;

  while (attempts < maxRetries) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    const prefix = organization.invoiceSettings?.prefix || 'INV';
    let number = organization.invoiceSettings?.nextNumber || 1;

    // Generate invoice number
    const invoiceNumber = `${prefix}-${String(number).padStart(6, '0')}`;

    // Check if this invoice number already exists
    const existingInvoice = await Invoice.findOne({ invoiceNumber });

    if (!existingInvoice) {
      // Invoice number is available, update nextNumber and return
      organization.invoiceSettings = organization.invoiceSettings || {};
      organization.invoiceSettings.nextNumber = number + 1;
      organization.invoiceSettings.prefix = prefix;
      await organization.save();

      return invoiceNumber;
    }

    // Invoice number exists, increment and try again
    organization.invoiceSettings = organization.invoiceSettings || {};
    organization.invoiceSettings.nextNumber = number + 1;
    organization.invoiceSettings.prefix = prefix;
    await organization.save();

    attempts++;
  }

  // If we've exhausted retries, find the highest invoice number and use that + 1
  const organization = await Organization.findById(organizationId);
  const prefix = organization.invoiceSettings?.prefix || 'INV';

  // Find the highest invoice number with this prefix
  const highestInvoice = await Invoice.findOne({
    invoiceNumber: { $regex: `^${prefix}-` }
  })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber');

  if (highestInvoice) {
    // Extract number from highest invoice (e.g., "INV-001002" -> 1002)
    const match = highestInvoice.invoiceNumber.match(/\d+$/);
    const highestNumber = match ? parseInt(match[0], 10) : 0;
    const nextNumber = highestNumber + 1;

    // Update organization's nextNumber
    organization.invoiceSettings = organization.invoiceSettings || {};
    organization.invoiceSettings.nextNumber = nextNumber + 1;
    organization.invoiceSettings.prefix = prefix;
    await organization.save();

    return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
  }

  // Fallback: start from 1
  const nextNumber = 1;
  organization.invoiceSettings = organization.invoiceSettings || {};
  organization.invoiceSettings.nextNumber = nextNumber + 1;
  organization.invoiceSettings.prefix = prefix;
  await organization.save();

  return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
};

const generateReceiptNumber = async (organizationId) => {
  const count = await Payment.countDocuments({ organizationId });
  return `RCP${String(count + 1).padStart(6, '0')}`;
};

// Schedule automatic calls for new members
const scheduleAutomaticCalls = async (memberId, invoice, organizationId, branchId, invoiceItems, isFirstInvoice) => {
  try {
    console.log('=== Starting automatic call scheduling ===');
    console.log('memberId:', memberId);
    console.log('isFirstInvoice:', isFirstInvoice);
    console.log('invoiceItems:', JSON.stringify(invoiceItems, null, 2));
    console.log('branchId:', branchId);

    // Get member to find who onboarded them
    const member = await Member.findById(memberId);
    if (!member) {
      console.log('ERROR: Member not found');
      return;
    }

    // Get start date and end date from invoice items
    // Try to find item with dates, otherwise use first item
    let targetItem = invoiceItems.find(item => {
      const hasStartDate = item?.startDate && (item.startDate instanceof Date || typeof item.startDate === 'string');
      const hasExpiryDate = item?.expiryDate && (item.expiryDate instanceof Date || typeof item.expiryDate === 'string');
      return hasStartDate || hasExpiryDate;
    });

    if (!targetItem && invoiceItems.length > 0) {
      targetItem = invoiceItems[0];
    }

    if (!targetItem) {
      console.log('ERROR: No target item found in invoice items');
      console.log('invoiceItems length:', invoiceItems.length);
      return;
    }

    console.log('targetItem found:', {
      hasStartDate: !!targetItem.startDate,
      hasExpiryDate: !!targetItem.expiryDate,
      startDateType: typeof targetItem.startDate,
      expiryDateType: typeof targetItem.expiryDate,
      startDate: targetItem.startDate,
      expiryDate: targetItem.expiryDate
    });

    // Parse dates - handle both string and Date objects
    let startDate = new Date();
    if (targetItem.startDate) {
      // Handle both Date objects and string dates
      const parsedStartDate = targetItem.startDate instanceof Date
        ? targetItem.startDate
        : new Date(targetItem.startDate);

      if (!isNaN(parsedStartDate.getTime())) {
        startDate = parsedStartDate;
      } else {
        console.log('WARNING: Invalid startDate, using current date');
        startDate = new Date();
      }
    }

    let endDate = undefined;
    if (targetItem.expiryDate) {
      // Handle both Date objects and string dates
      const parsedEndDate = targetItem.expiryDate instanceof Date
        ? targetItem.expiryDate
        : new Date(targetItem.expiryDate);

      if (!isNaN(parsedEndDate.getTime())) {
        endDate = parsedEndDate;
      } else {
        console.log('WARNING: Invalid expiryDate');
        endDate = undefined;
      }
    }

    console.log('startDate:', startDate);
    console.log('endDate:', endDate);

    // The person who onboarded the client (member.createdBy) or invoice creator
    const assignedTo = member.createdBy || invoice.createdBy;
    console.log('assignedTo:', assignedTo);

    if (!branchId) {
      console.log('ERROR: branchId is missing');
      return;
    }

    // Helper function to map FollowUp callType to MemberCallLog callType
    const mapCallTypeToMemberCallLog = (followUpCallType) => {
      const mapping = {
        'welcome-call': 'welcome',
        'assessment-call': 'assessment',
        'upgrade-call': 'upgrade',
        'renewal-call': 'renewal',
        'follow-up-call': 'follow-up'
      };
      return mapping[followUpCallType] || 'other';
    };

    // Helper function to create both FollowUp and MemberCallLog entries
    const createCallEntry = async (callData) => {
      // Create FollowUp entry
      const followUp = await FollowUp.create(callData.followUpData);
      console.log(`${callData.title} FollowUp created:`, followUp._id);

      // Create MemberCallLog entry
      const memberCallLogType = mapCallTypeToMemberCallLog(callData.followUpData.callType);
      const memberCallLog = await MemberCallLog.create({
        organizationId,
        memberId,
        callType: memberCallLogType,
        calledBy: assignedTo,
        status: 'scheduled',
        notes: callData.followUpData.description || '',
        scheduledAt: callData.followUpData.scheduledTime,
        createdBy: null // Set to null for auto-scheduled calls so it shows "Auto" in frontend
      });
      console.log(`${callData.title} MemberCallLog created:`, memberCallLog._id);

      return { followUp, memberCallLog };
    };

    // For first invoice: schedule all 4 calls
    if (isFirstInvoice) {
      console.log('Scheduling calls for FIRST invoice');

      // 1. Welcome Call - scheduled on the day client joins (membership start date)
      const welcomeCallDate = new Date(startDate);
      welcomeCallDate.setHours(10, 0, 0, 0); // Set to 10 AM

      console.log('Creating Welcome Call for:', welcomeCallDate);
      await createCallEntry({
        title: 'Welcome Call',
        followUpData: {
          organizationId,
          branchId,
          type: 'follow-up',
          callType: 'welcome-call',
          callStatus: 'scheduled',
          scheduledTime: welcomeCallDate,
          dueDate: welcomeCallDate,
          title: 'Welcome Call',
          description: 'Welcome call for new member',
          relatedTo: {
            entityType: 'member',
            entityId: memberId
          },
          assignedTo,
          priority: 'high',
          createdBy: invoice.createdBy
        }
      });

      // 2. Assessment Call - scheduled 5 days after membership start
      const assessmentCallDate = new Date(startDate);
      assessmentCallDate.setDate(assessmentCallDate.getDate() + 5);
      assessmentCallDate.setHours(10, 0, 0, 0);

      console.log('Creating Assessment Call for:', assessmentCallDate);
      await createCallEntry({
        title: 'Assessment Call',
        followUpData: {
          organizationId,
          branchId,
          type: 'follow-up',
          callType: 'assessment-call',
          callStatus: 'scheduled',
          scheduledTime: assessmentCallDate,
          dueDate: assessmentCallDate,
          title: 'Assessment Call',
          description: 'Assessment call scheduled 5 days after membership start',
          relatedTo: {
            entityType: 'member',
            entityId: memberId
          },
          assignedTo,
          priority: 'medium',
          createdBy: invoice.createdBy
        }
      });

      // 3. Upgrade Call - scheduled 15 days after membership start
      const upgradeCallDate = new Date(startDate);
      upgradeCallDate.setDate(upgradeCallDate.getDate() + 15);
      upgradeCallDate.setHours(10, 0, 0, 0);

      console.log('Creating Upgrade Call for:', upgradeCallDate);
      await createCallEntry({
        title: 'Upgrade Call',
        followUpData: {
          organizationId,
          branchId,
          type: 'follow-up',
          callType: 'upgrade-call',
          callStatus: 'scheduled',
          scheduledTime: upgradeCallDate,
          dueDate: upgradeCallDate,
          title: 'Upgrade Call',
          description: 'Upgrade call scheduled 15 days after membership start',
          relatedTo: {
            entityType: 'member',
            entityId: memberId
          },
          assignedTo,
          priority: 'medium',
          createdBy: invoice.createdBy
        }
      });

      // 4. Renewal Call - scheduled 7 days before membership expiry
      if (endDate) {
        const renewalCallDate = new Date(endDate);
        renewalCallDate.setDate(renewalCallDate.getDate() - 7);
        renewalCallDate.setHours(10, 0, 0, 0);

        console.log('Creating Renewal Call for:', renewalCallDate);
        await createCallEntry({
          title: 'Renewal Call',
          followUpData: {
            organizationId,
            branchId,
            type: 'follow-up',
            callType: 'renewal-call',
            callStatus: 'scheduled',
            scheduledTime: renewalCallDate,
            dueDate: renewalCallDate,
            title: 'Renewal Call',
            description: 'Renewal call scheduled 7 days before membership expiry',
            relatedTo: {
              entityType: 'member',
              entityId: memberId
            },
            assignedTo,
            priority: 'high',
            createdBy: invoice.createdBy
          }
        });
      } else {
        console.log('WARNING: No endDate, skipping Renewal Call');
      }
    } else {
      console.log('Scheduling calls for SUBSEQUENT invoice');
      // For subsequent invoices: schedule only renewal call
      if (endDate) {
        const renewalCallDate = new Date(endDate);
        renewalCallDate.setDate(renewalCallDate.getDate() - 7);
        renewalCallDate.setHours(10, 0, 0, 0);

        console.log('Creating Renewal Call for:', renewalCallDate);
        await createCallEntry({
          title: 'Renewal Call',
          followUpData: {
            organizationId,
            branchId,
            type: 'follow-up',
            callType: 'renewal-call',
            callStatus: 'scheduled',
            scheduledTime: renewalCallDate,
            dueDate: renewalCallDate,
            title: 'Renewal Call',
            description: 'Renewal call scheduled 7 days before membership expiry',
            relatedTo: {
              entityType: 'member',
              entityId: memberId
            },
            assignedTo,
            priority: 'high',
            createdBy: invoice.createdBy
          }
        });
      } else {
        console.log('WARNING: No endDate, skipping Renewal Call');
      }
    }
    console.log('=== Automatic call scheduling completed ===');
  } catch (error) {
    console.error('Failed to schedule automatic calls:', error);
    console.error('Error stack:', error.stack);
    // Don't throw error - invoice creation should still succeed
  }
};

export const createInvoice = async (req, res) => {
  try {
    const {
      memberId, planId, items, discount, type, invoiceType, isProForma,
      sacCode, discountReason, customerNotes, internalNotes, paymentModes, rounding, dateOfInvoice, invoiceDate
    } = req.body;

    console.log('=== Invoice Creation Started ===');
    console.log('memberId:', memberId);
    console.log('isProForma:', isProForma);
    console.log('items from request:', JSON.stringify(items, null, 2));

    const invoiceNumber = await generateInvoiceNumber(req.organizationId);
    const organization = await Organization.findById(req.organizationId);

    // Check if this is the first invoice for this member (before creating the invoice)
    let isFirstInvoice = false;
    if (memberId) {
      const existingInvoiceCount = await Invoice.countDocuments({
        memberId,
        organizationId: req.organizationId,
        status: { $ne: 'cancelled' }
      });
      isFirstInvoice = existingInvoiceCount === 0;
    }

    // Prevent duplicate overlap for active members
    if (memberId) {
      const member = await Member.findOne({
        _id: memberId,
        organizationId: req.organizationId
      }).lean();

      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      // Only prevent if there's an active (unpaid/partial) invoice
      const activeInvoice = await Invoice.findOne({
        memberId,
        organizationId: req.organizationId,
        status: { $in: ['draft', 'sent', 'partial'] } // Only block if invoice is not fully paid
      }).sort({ createdAt: -1 });

      if (activeInvoice) {
        return res.status(400).json({
          success: false,
          message: `Cannot create invoice: Member already has an active unpaid invoice (${activeInvoice.invoiceNumber}) with status "${activeInvoice.status}". Please complete or cancel the existing invoice before creating a new one.`
        });
      }
    }

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

      const processedItem = {
        ...item,
        amount: itemAmount,
        taxAmount,
        total,
        discount: item.discount ? { ...item.discount, amount: itemDiscountAmount } : undefined
      };

      // Preserve dates - ensure they're included in the processed item
      if (item.startDate) {
        processedItem.startDate = item.startDate;
      }
      if (item.expiryDate) {
        processedItem.expiryDate = item.expiryDate;
      }

      return processedItem;
    });

    console.log('Processed invoiceItems (checking dates):', invoiceItems.map(item => ({
      description: item.description,
      startDate: item.startDate,
      expiryDate: item.expiryDate,
      startDateType: typeof item.startDate,
      expiryDateType: typeof item.expiryDate
    })));

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
      dateOfInvoice: normalizeInvoiceDate(dateOfInvoice || invoiceDate),
      sacCode: sacCode || undefined,
      discountReason: discountReason || undefined,
      customerNotes: customerNotes || undefined,
      internalNotes: internalNotes || undefined,
      paymentModes: paymentModes || undefined,
      status: totalPaid >= total ? 'paid' : (totalPaid > 0 ? 'partial' : 'draft'),
      currency: organization.currency || 'INR',
      createdBy: req.user._id
    });

    // Create payment records for any upfront payments captured during invoice creation
    if (paymentModes && paymentModes.length > 0) {
      for (const pm of paymentModes) {
        const method = pm?.method;
        const amount = parseFloat(pm?.amount) || 0;

        if (!method || amount <= 0) {
          continue;
        }

        const receiptNumber = await generateReceiptNumber(req.organizationId);
        await Payment.create({
          organizationId: req.organizationId,
          branchId: invoice.branchId,
          invoiceId: invoice._id,
          memberId: invoice.memberId,
          amount,
          currency: invoice.currency,
          paymentMethod: method,
          receiptNumber,
          status: 'completed',
          paidAt: new Date(),
          createdBy: req.user._id
        });
      }
    }

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'invoice.created',
      entityType: 'Invoice',
      entityId: invoice._id
    });

    // Activate membership if invoice is fully paid at creation
    if (invoice.status === 'paid' && memberId) {
      try {
        const { activateMembershipFromInvoice } = await import('../utils/membership.js');
        // Refresh invoice to get populated data if needed
        const freshInvoice = await Invoice.findById(invoice._id);
        await activateMembershipFromInvoice(freshInvoice);
      } catch (membershipError) {
        console.error('Failed to activate membership after invoice creation:', membershipError);
        // Don't fail the invoice creation if membership activation fails
      }
    }

    // NOTE: Membership activation is also done after payment is confirmed
    // This ensures memberships are activated both when invoice is created with payment
    // and when payments are added later. Activation also happens in payment.controller.js and webhook.controller.js

    // Schedule automatic calls for the member
    // Note: We schedule calls for all invoices (including pro-forma) as they represent actual memberships
    if (memberId) {
      try {
        console.log('Attempting to schedule automatic calls...');
        console.log('isProForma:', isProForma);
        console.log('memberId:', memberId);
        console.log('Invoice created with ID:', invoice._id);
        console.log('Invoice items from saved invoice:', JSON.stringify(invoice.items, null, 2));

        // Use the saved invoice items (with proper Date objects) instead of processed invoiceItems
        await scheduleAutomaticCalls(
          memberId,
          invoice,
          req.organizationId,
          req.body.branchId || req.user.branchId,
          invoice.items, // Use saved invoice items which have proper Date objects
          isFirstInvoice
        );
        console.log('Call scheduling function completed');
      } catch (callSchedulingError) {
        console.error('Failed to schedule automatic calls:', callSchedulingError);
        console.error('Error details:', callSchedulingError.message);
        console.error('Error stack:', callSchedulingError.stack);
        // Don't fail invoice creation if call scheduling fails
      }
    } else {
      console.log('Skipping call scheduling - no memberId');
    }

    // Send invoice via email and SMS after creation
    if (memberId) {
      try {
        const member = await Member.findById(memberId);
        if (member) {
          // Populate invoice for PDF generation
          const populatedInvoice = await Invoice.findById(invoice._id)
            .populate('memberId')
            .populate('organizationId');

          // Generate PDF
          const { generateInvoicePDF } = await import('../utils/pdf.js');
          const pdfBuffer = await generateInvoicePDF(populatedInvoice);

          // Send email with PDF attachment
          const { sendInvoiceEmail } = await import('../utils/email.js');
          // const emailResults = await sendInvoiceEmail(populatedInvoice, member, organization, pdfBuffer);

          if (emailResults.memberEmail.success) {
            console.log('Invoice email sent to member:', member.email);
          }
          if (emailResults.ownerEmail.success) {
            console.log('Invoice email sent to owner');
          }

          // Send SMS notification
          if (member.phone) {
            const { sendSMS } = await import('../utils/sms.js');
            const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
            const formattedTotal = new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: invoice.currency || 'INR',
              minimumFractionDigits: 2
            }).format(invoice.total);

            const smsMessage = `Hi ${memberName},\n\nInvoice ${invoice.invoiceNumber} has been created.\nAmount: ${formattedTotal}\n\nPlease check your email for the invoice PDF.\n\nThank you!`;

            const smsResult = await sendSMS(member.phone, smsMessage, 'msg91');
            if (smsResult.success) {
              console.log('Invoice SMS sent to member:', member.phone);
            }
          }

          // Send WhatsApp notification (if configured)
          if (member.phone) {
            try {
              const { sendInvoiceNotification } = await import('../utils/whatsapp.js');
              const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();

              // Create payment link if pending amount
              let paymentLink = null;
              if (invoice.pending > 0) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                paymentLink = `${frontendUrl}/invoices/${invoice._id}`;
              }

              const whatsappResult = await sendInvoiceNotification(
                member.phone,
                memberName,
                invoice.invoiceNumber,
                invoice.total,
                paymentLink
              );

              if (whatsappResult.success) {
                console.log('Invoice WhatsApp sent to member:', member.phone);
              } else {
                console.log('WhatsApp notification skipped:', whatsappResult.error);
              }
            } catch (whatsappError) {
              // WhatsApp is optional, don't fail invoice creation
              console.log('WhatsApp notification skipped (not configured or failed):', whatsappError.message);
            }
          }
        }
      } catch (notificationError) {
        console.error('Failed to send invoice notifications:', notificationError);
        // Don't fail invoice creation if notifications fail
      }
    }

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    console.error('=== Invoice Creation Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('Error name:', error.name);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }

    // Handle duplicate key error specifically
    if (error.code === 11000 || error.name === 'MongoServerError') {
      const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'invoiceNumber';
      return res.status(409).json({
        success: false,
        message: `Invoice number already exists. Please try again.`,
        error: `Duplicate key error on ${duplicateField}`
      });
    }

    handleError(error, res, 500);
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
      dateQuery = buildInvoiceDateRangeQuery(startDate, endDate);
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
      dateQuery = buildInvoiceDateRangeQuery(start, end);
    }

    const query = {
      organizationId: req.organizationId
    };
    applyDateQuery(query, dateQuery);

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

    // Calculate summary statistics using aggregation for better performance
    const summaryAggregation = await Invoice.aggregate([
      { $match: query },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            invoiceType: '$invoiceType',
            description: '$items.description'
          },
          total: { $sum: { $ifNull: ['$items.total', 0] } }
        }
      },
      {
        $group: {
          _id: null,
          serviceNonPTSales: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$_id.invoiceType', 'service'] },
                    {
                      $and: [
                        { $ne: ['$_id.invoiceType', 'package'] },
                        { $ne: ['$_id.invoiceType', 'deal'] },
                        {
                          $not: {
                            $or: [
                              { $regexMatch: { input: { $toLower: { $ifNull: ['$_id.description', ''] } }, regex: 'pt' } },
                              { $regexMatch: { input: { $toLower: { $ifNull: ['$_id.description', ''] } }, regex: 'personal trainer' } }
                            ]
                          }
                        }
                      ]
                    }
                  ]
                },
                '$total',
                0
              ]
            }
          },
          servicePTSales: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $regexMatch: { input: { $toLower: { $ifNull: ['$_id.description', ''] } }, regex: 'pt' } },
                    { $regexMatch: { input: { $toLower: { $ifNull: ['$_id.description', ''] } }, regex: 'personal trainer' } }
                  ]
                },
                '$total',
                0
              ]
            }
          },
          productSales: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$_id.invoiceType', 'package'] },
                    { $eq: ['$_id.invoiceType', 'deal'] }
                  ]
                },
                '$total',
                0
              ]
            }
          }
        }
      }
    ]);

    const summary = summaryAggregation[0] || {
      serviceNonPTSales: 0,
      servicePTSales: 0,
      productSales: 0
    };

    res.json({
      success: true,
      data: {
        invoices,
        summary: {
          serviceNonPTSales: summary.serviceNonPTSales || 0,
          servicePTSales: summary.servicePTSales || 0,
          productSales: summary.productSales || 0
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
    handleError(error, res, 500);
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organizationId: req.organizationId
    })
      .populate('memberId', 'firstName lastName email phone memberId salesRep attendanceId')
      .populate('memberId.salesRep', 'firstName lastName')
      .populate('planId', 'name duration')
      .populate('branchId', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('organizationId', 'name email phone address logo')
      .populate({
        path: 'items.serviceId',
        populate: {
          path: 'serviceId',
          select: 'name'
        }
      });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, invoice });
  } catch (error) {
    handleError(error, res, 500);
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
    handleError(error, res, 500);
  }
};

export const changeInvoiceItemDate = async (req, res) => {
  try {
    const { invoiceId, itemIndex, startDate, expiryDate } = req.body;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organizationId: req.organizationId
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (typeof itemIndex !== 'number' || itemIndex < 0 || itemIndex >= invoice.items.length) {
      return res.status(400).json({ success: false, message: 'Invalid item index' });
    }

    const item = invoice.items[itemIndex];

    // Store original dates for audit
    const originalStartDate = item.startDate;
    const originalExpiryDate = item.expiryDate;

    // Update dates
    if (startDate) {
      item.startDate = new Date(startDate);
    }
    if (expiryDate) {
      item.expiryDate = new Date(expiryDate);
    }

    // Validate dates
    if (item.startDate && item.expiryDate && item.startDate >= item.expiryDate) {
      return res.status(400).json({ success: false, message: 'Start date must be before expiry date' });
    }

    await invoice.save();

    // Update scheduled calls if expiry date changed
    if (expiryDate && invoice.memberId) {
      await updateScheduledCallsForExpiryDate(
        invoice.memberId,
        item.expiryDate,
        req.organizationId
      );
    }

    // Create audit log
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'invoice.item.date_changed',
      entityType: 'Invoice',
      entityId: invoice._id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        itemIndex,
        originalStartDate,
        originalExpiryDate,
        newStartDate: item.startDate,
        newExpiryDate: item.expiryDate
      }
    });

    res.json({ success: true, invoice, message: 'Invoice item dates updated successfully' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const freezeInvoiceItem = async (req, res) => {
  try {
    const { invoiceId, itemIndex, freezeDays, startDate, endDate, reason } = req.body;

    // Calculate freeze days from date range if provided, otherwise use freezeDays
    let calculatedFreezeDays = freezeDays;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return res.status(400).json({ success: false, message: 'End date must be after start date' });
      }
      const diffTime = end - start;
      calculatedFreezeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    }

    if (!calculatedFreezeDays || calculatedFreezeDays <= 0 || calculatedFreezeDays > 30) {
      return res.status(400).json({ success: false, message: 'Freeze days must be between 1 and 30' });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organizationId: req.organizationId
    }).populate('memberId', 'totalFreezeDaysUsed');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (typeof itemIndex !== 'number' || itemIndex < 0 || itemIndex >= invoice.items.length) {
      return res.status(400).json({ success: false, message: 'Invalid item index' });
    }

    const item = invoice.items[itemIndex];

    if (!item.expiryDate) {
      return res.status(400).json({ success: false, message: 'Item does not have an expiry date' });
    }

    // Check if member has enough remaining freeze days
    if (invoice.memberId) {
      const member = invoice.memberId;
      const usedFreezeDays = member.totalFreezeDaysUsed || 0;
      const remainingFreezeDays = 30 - usedFreezeDays;

      if (calculatedFreezeDays > remainingFreezeDays) {
        return res.status(400).json({
          success: false,
          message: `Cannot freeze. The selected period (${calculatedFreezeDays} days) exceeds remaining freeze days (${remainingFreezeDays} days).`
        });
      }
    }

    // Store original expiry date
    const originalExpiryDate = new Date(item.expiryDate);

    // Extend expiry date by freeze days (freeze with extension)
    const newExpiryDate = new Date(item.expiryDate);
    newExpiryDate.setDate(newExpiryDate.getDate() + calculatedFreezeDays);
    item.expiryDate = newExpiryDate;

    await invoice.save();

    // Update scheduled calls for the new expiry date
    if (invoice.memberId) {
      await updateScheduledCallsForExpiryDate(
        invoice.memberId,
        item.expiryDate,
        req.organizationId
      );
    }

    // Update member's total freeze days used
    if (invoice.memberId) {
      const member = await Member.findById(invoice.memberId);
      if (member) {
        const newTotalFreezeDays = (member.totalFreezeDaysUsed || 0) + calculatedFreezeDays;
        if (newTotalFreezeDays > 30) {
          return res.status(400).json({
            success: false,
            message: `Cannot freeze. Member has already used ${member.totalFreezeDaysUsed || 0} days. Maximum 30 days allowed.`
          });
        }
        member.totalFreezeDaysUsed = newTotalFreezeDays;
        await member.save();
      }
    }

    // Create audit log
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'invoice.item.frozen',
      entityType: 'Invoice',
      entityId: invoice._id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        itemIndex,
        freezeDays: calculatedFreezeDays,
        startDate: startDate || null,
        endDate: endDate || null,
        reason: reason || 'No reason provided',
        originalExpiryDate,
        newExpiryDate
      }
    });

    res.json({
      success: true,
      invoice,
      message: `Invoice item frozen for ${calculatedFreezeDays} days successfully`,
      newExpiryDate,
      freezeDays: calculatedFreezeDays
    });
  } catch (error) {
    handleError(error, res, 500);
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

    const memberId = invoice.memberId;

    // Delete the invoice
    await Invoice.deleteOne({ _id: invoice._id });

    // If the invoice had a member, check if they have any remaining invoices
    // If not, clear their current plan and set status to inactive
    if (memberId) {
      const remainingInvoices = await Invoice.countDocuments({
        memberId: memberId,
        organizationId: req.organizationId,
        status: { $ne: 'cancelled' }
      });

      // If no more invoices, clear the member's current plan
      if (remainingInvoices === 0) {
        await Member.findByIdAndUpdate(memberId, {
          $unset: { currentPlan: 1 },
          membershipStatus: 'inactive'
        });
      } else {
        // If there are remaining invoices, recalculate the current plan from the most recent active invoice
        const latestInvoice = await Invoice.findOne({
          memberId: memberId,
          organizationId: req.organizationId,
          status: { $ne: 'cancelled' }
        })
          .sort({ createdAt: -1 })
          .populate('planId');

        if (latestInvoice && latestInvoice.items && latestInvoice.items.length > 0) {
          // Find the first item with dates to set as current plan
          const planItem = latestInvoice.items.find(item => item.startDate && item.expiryDate);

          if (planItem) {
            const endDate = new Date(planItem.expiryDate);
            const isActive = endDate >= new Date();

            await Member.findByIdAndUpdate(memberId, {
              currentPlan: {
                planId: latestInvoice.planId?._id,
                planName: planItem.description || latestInvoice.planId?.name,
                startDate: planItem.startDate,
                endDate: planItem.expiryDate,
                sessions: planItem.sessions || { used: 0 }
              },
              membershipStatus: isActive ? 'active' : 'inactive'
            });
          } else {
            // No plan item with dates found, clear current plan
            await Member.findByIdAndUpdate(memberId, {
              $unset: { currentPlan: 1 },
              membershipStatus: 'inactive'
            });
          }
        }
      }
    }

    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    doc.text(`Date: ${new Date(getInvoiceDateValue(invoice)).toLocaleDateString()}`);
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
    handleError(error, res, 500);
  }
};

export const sendInvoiceViaEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organizationId: req.organizationId
    })
      .populate('memberId')
      .populate('organizationId')
      .populate('branchId')
      .populate('createdBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Check if member has email
    if (!invoice.memberId || !invoice.memberId.email) {
      return res.status(400).json({
        success: false,
        message: 'Member email not available. Please update member profile with email address.'
      });
    }

    // Generate PDF using the utility function
    const { generateInvoicePDF } = await import('../utils/pdf.js');
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Send email with PDF attachment
    const { sendInvoiceEmail } = await import('../utils/email.js');
    const emailResults = await sendInvoiceEmail(
      invoice,
      invoice.memberId,
      invoice.organizationId,
      pdfBuffer
    );

    if (emailResults.memberEmail.success) {
      res.json({
        success: true,
        message: `Invoice sent successfully to ${invoice.memberId.email}`,
        results: emailResults
      });
    } else {
      res.status(500).json({
        success: false,
        message: emailResults.memberEmail.error || 'Failed to send invoice email',
        results: emailResults
      });
    }
  } catch (error) {
    console.error('Send invoice email error:', error);
    handleError(error, res, 500);
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

    // Build date query - use paidDate if available, otherwise invoice date
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = buildPaidDateRangeQuery(startDate, endDate);
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
      dateQuery = buildPaidDateRangeQuery(start, end);
    }

    const query = {
      organizationId: req.organizationId,
      status: 'paid'
    };
    applyDateQuery(query, dateQuery);

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
    handleError(error, res, 500);
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
      dateQuery = buildPaidDateRangeQuery(startDate, endDate);
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
      dateQuery = buildPaidDateRangeQuery(start, end);
    }

    const query = {
      organizationId: req.organizationId,
      status: 'paid'
    };
    applyDateQuery(query, dateQuery);

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
      'Tax Invoice No.',
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
            getInvoiceDateValue(invoice) ? new Date(getInvoiceDateValue(invoice)).toLocaleDateString('en-GB') : '',
          invoice.type === 'pro-forma' ? 'Tax Invoice' :
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
    handleError(error, res, 500);
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
      dateQuery = buildInvoiceDateRangeQuery(startDate, endDate);
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
      dateQuery = buildInvoiceDateRangeQuery(start, end);
    }

    // Build query for pending invoices
    const query = {
      organizationId: req.organizationId,
      status: { $in: ['sent', 'partial', 'overdue'] },
      pending: { $gt: 0 } // Only invoices with pending amount
    };
    applyDateQuery(query, dateQuery);

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

    // Get invoices with populated data (using lean for better performance)
    let invoicesQuery = Invoice.find(query)
      .populate('memberId', 'firstName lastName phone memberId')
      .populate('planId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    if (salesRepId) {
      invoicesQuery = invoicesQuery.where('createdBy').equals(salesRepId);
    }

    const invoices = await invoicesQuery
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    // Calculate pending amounts by category using aggregation for better performance
    const pendingSummaryAggregation = await Invoice.aggregate([
      { $match: query },
      {
        // Add itemsCount before unwinding (when items is still an array)
        $addFields: {
          itemsCount: {
            $cond: [
              { $isArray: '$items' },
              { $size: '$items' },
              1
            ]
          }
        }
      },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          invoiceType: 1,
          pending: { $ifNull: ['$pending', 0] },
          itemsCount: 1, // Use the pre-calculated count
          description: '$items.description'
        }
      },
      {
        $addFields: {
          itemPending: {
            $divide: [
              '$pending',
              { $max: ['$itemsCount', 1] }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            invoiceType: '$invoiceType',
            description: '$description'
          },
          totalPending: { $sum: '$itemPending' }
        }
      },
      {
        $group: {
          _id: null,
          serviceNonPTPending: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$_id.invoiceType', 'service'] },
                    {
                      $and: [
                        { $ne: ['$_id.invoiceType', 'package'] },
                        { $ne: ['$_id.invoiceType', 'deal'] },
                        {
                          $not: {
                            $or: [
                              { $regexMatch: { input: { $toLower: { $ifNull: ['$_id.description', ''] } }, regex: 'pt' } },
                              { $regexMatch: { input: { $toLower: { $ifNull: ['$_id.description', ''] } }, regex: 'personal trainer' } }
                            ]
                          }
                        }
                      ]
                    }
                  ]
                },
                '$totalPending',
                0
              ]
            }
          },
          servicePTPending: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $regexMatch: { input: { $toLower: { $ifNull: ['$_id.description', ''] } }, regex: 'pt' } },
                    { $regexMatch: { input: { $toLower: { $ifNull: ['$_id.description', ''] } }, regex: 'personal trainer' } }
                  ]
                },
                '$totalPending',
                0
              ]
            }
          },
          productPending: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$_id.invoiceType', 'package'] },
                    { $eq: ['$_id.invoiceType', 'deal'] }
                  ]
                },
                '$totalPending',
                0
              ]
            }
          }
        }
      }
    ]);

    const pendingSummary = pendingSummaryAggregation[0] || {
      serviceNonPTPending: 0,
      servicePTPending: 0,
      productPending: 0
    };

    const serviceNonPTPending = pendingSummary.serviceNonPTPending || 0;
    const servicePTPending = pendingSummary.servicePTPending || 0;
    const productPending = pendingSummary.productPending || 0;

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
        ...invoice,
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
    handleError(error, res, 500);
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
      dateQuery = buildInvoiceDateRangeQuery(startDate, endDate);
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
      dateQuery = buildInvoiceDateRangeQuery(start, end);
    }

    const query = {
      organizationId: req.organizationId,
      status: { $in: ['sent', 'partial', 'overdue'] },
      pending: { $gt: 0 }
    };
    applyDateQuery(query, dateQuery);

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
      'Tax Invoice No.',
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
          getInvoiceDateValue(invoice) ? new Date(getInvoiceDateValue(invoice)).toLocaleDateString('en-GB') : '',
          invoice.type === 'pro-forma' ? 'Tax Invoice' :
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
    handleError(error, res, 500);
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
      dateQuery = buildInvoiceDateRangeQuery(startDate, endDate);
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
      dateQuery = buildInvoiceDateRangeQuery(start, end);
    }

    // Build query for cancelled invoices
    const query = {
      organizationId: req.organizationId,
      status: 'cancelled'
    };
    applyDateQuery(query, dateQuery);

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
    handleError(error, res, 500);
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
      dateQuery = buildInvoiceDateRangeQuery(startDate, endDate);
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
      dateQuery = buildInvoiceDateRangeQuery(start, end);
    }

    const query = {
      organizationId: req.organizationId,
      status: 'cancelled'
    };
    applyDateQuery(query, dateQuery);

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
      'Tax Invoice No.',
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
          getInvoiceDateValue(invoice) ? new Date(getInvoiceDateValue(invoice)).toLocaleDateString('en-GB') : '',
          invoice.type === 'pro-forma' ? 'Tax Invoice' :
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
    handleError(error, res, 500);
  }
};

export const getInvoiceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { organizationId: req.organizationId };

    if (startDate || endDate) {
      applyDateQuery(query, buildInvoiceDateRangeQuery(startDate, endDate));
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
    handleError(error, res, 500);
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
      dateQuery = buildInvoiceDateRangeQuery(startDate, endDate);
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
      dateQuery = buildInvoiceDateRangeQuery(start, end);
    }

    const query = {
      organizationId: req.organizationId
    };
    applyDateQuery(query, dateQuery);

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
      'Tax Invoice No.',
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
          getInvoiceDateValue(invoice) ? new Date(getInvoiceDateValue(invoice)).toLocaleDateString('en-GB') : '',
          invoice.type === 'pro-forma' ? 'Tax Invoice' :
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
    handleError(error, res, 500);
  }
};

