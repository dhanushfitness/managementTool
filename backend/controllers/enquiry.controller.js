import Enquiry from '../models/Enquiry.js';
import Member from '../models/Member.js';
import Invoice from '../models/Invoice.js';
import AuditLog from '../models/AuditLog.js';

// Generate enquiry ID
const generateEnquiryId = async (organizationId) => {
  const count = await Enquiry.countDocuments({ organizationId });
  return `ENQ${String(count + 1).padStart(6, '0')}`;
};

export const createEnquiry = async (req, res) => {
  try {
    const enquiryId = await generateEnquiryId(req.organizationId);
    
    const enquiryData = {
      ...req.body,
      organizationId: req.organizationId,
      branchId: req.body.branchId || req.user.branchId,
      enquiryId,
      createdBy: req.user._id
    };

    const enquiry = await Enquiry.create(enquiryData);

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'enquiry.created',
      entityType: 'Enquiry',
      entityId: enquiry._id
    });

    res.status(201).json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEnquiries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      dateFilter,
      startDate,
      endDate,
      enquiryStage,
      leadSource,
      service,
      staffId,
      gender,
      callTag,
      lastCallStatus,
      isMember,
      isLead,
      isArchived
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { organizationId: req.organizationId };

    // Date filter
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = { $gte: today, $lt: tomorrow };
    } else if (dateFilter === 'last7days') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      query.date = { $gte: date };
    } else if (dateFilter === 'last30days') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      query.date = { $gte: date };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Other filters
    if (enquiryStage) query.enquiryStage = enquiryStage;
    if (leadSource) query.leadSource = leadSource;
    if (service) query.service = service;
    if (staffId) query.assignedStaff = staffId;
    if (gender) query.gender = gender;
    if (callTag) query.callTag = callTag;
    if (lastCallStatus) query.lastCallStatus = lastCallStatus;
    if (isMember !== undefined) query.isMember = isMember === 'true';
    if (isLead !== undefined) query.isLead = isLead === 'true';
    if (isArchived !== undefined) query.isArchived = isArchived === 'true';

    const enquiries = await Enquiry.find(query)
      .populate('service', 'name')
      .populate('assignedStaff', 'firstName lastName')
      .populate('convertedToMember', 'memberId firstName lastName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enquiry.countDocuments(query);

    res.json({
      success: true,
      enquiries,
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

export const getEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      _id: req.params.enquiryId,
      organizationId: req.organizationId
    })
      .populate('service')
      .populate('assignedStaff')
      .populate('convertedToMember')
      .populate('createdBy', 'firstName lastName');

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      _id: req.params.enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    Object.assign(enquiry, req.body);
    await enquiry.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'enquiry.updated',
      entityType: 'Enquiry',
      entityId: enquiry._id
    });

    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      _id: req.params.enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    await Enquiry.deleteOne({ _id: enquiry._id });

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'enquiry.deleted',
      entityType: 'Enquiry',
      entityId: enquiry._id
    });

    res.json({ success: true, message: 'Enquiry deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const convertToMember = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { planId, startDate } = req.body;

    const enquiry = await Enquiry.findOne({
      _id: enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (enquiry.convertedToMember) {
      return res.status(400).json({ success: false, message: 'Enquiry already converted' });
    }

    // Create member from enquiry
    const Member = (await import('../models/Member.js')).default;
    const generateMemberId = async (organizationId) => {
      const count = await Member.countDocuments({ organizationId });
      return `MEM${String(count + 1).padStart(6, '0')}`;
    };

    const memberId = await generateMemberId(req.organizationId);
    
    const member = await Member.create({
      organizationId: req.organizationId,
      branchId: enquiry.branchId,
      memberId,
      firstName: enquiry.name.split(' ')[0] || enquiry.name,
      lastName: enquiry.name.split(' ').slice(1).join(' ') || '',
      phone: enquiry.phone,
      email: enquiry.email,
      gender: enquiry.gender,
      source: enquiry.leadSource,
      membershipStatus: 'pending',
      createdBy: req.user._id
    });

    // Update enquiry
    enquiry.convertedToMember = member._id;
    enquiry.convertedAt = new Date();
    enquiry.enquiryStage = 'converted';
    enquiry.isMember = true;
    enquiry.isLead = false;
    await enquiry.save();

    // Create invoice if planId provided
    let invoice = null;
    if (planId) {
      const Plan = (await import('../models/Plan.js')).default;
      const plan = await Plan.findById(planId);
      
      if (plan) {
        const Invoice = (await import('../models/Invoice.js')).default;
        const Organization = (await import('../models/Organization.js')).default;
        const org = await Organization.findById(req.organizationId);
        
        const invoiceNumber = `${org.invoiceSettings.prefix || 'INV'}-${String(org.invoiceSettings.nextNumber || 1).padStart(6, '0')}`;
        org.invoiceSettings.nextNumber = (org.invoiceSettings.nextNumber || 1) + 1;
        await org.save();

        const subtotal = plan.price;
        const taxAmount = (subtotal * (plan.taxRate || 0)) / 100;
        const total = subtotal + taxAmount;

        invoice = await Invoice.create({
          organizationId: req.organizationId,
          branchId: enquiry.branchId,
          invoiceNumber,
          memberId: member._id,
          planId: plan._id,
          type: 'membership',
          items: [{
            description: `Membership - ${plan.name}`,
            quantity: 1,
            unitPrice: plan.price,
            taxRate: plan.taxRate || 0,
            amount: subtotal,
            taxAmount,
            total
          }],
          subtotal,
          tax: {
            rate: plan.taxRate || 0,
            amount: taxAmount
          },
          total,
          status: 'draft',
          currency: org.currency || 'INR',
          createdBy: req.user._id
        });
      }
    }

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'enquiry.converted',
      entityType: 'Enquiry',
      entityId: enquiry._id
    });

    res.json({ success: true, enquiry, member, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const archiveEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      _id: req.params.enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    enquiry.isArchived = true;
    enquiry.archivedAt = new Date();
    enquiry.enquiryStage = 'archived';
    await enquiry.save();

    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEnquiryStats = async (req, res) => {
  try {
    const { dateFilter, startDate, endDate, fromDate, toDate } = req.query;
    
    const dateQuery = {};
    // Support both startDate/endDate and fromDate/toDate
    const from = fromDate || startDate;
    const to = toDate || endDate;
    
    if (from && to) {
      // Custom date range
      const fromDateObj = new Date(from);
      fromDateObj.setHours(0, 0, 0, 0);
      const toDateObj = new Date(to);
      toDateObj.setHours(23, 59, 59, 999);
      dateQuery.date = { $gte: fromDateObj, $lte: toDateObj };
    } else if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateQuery.date = { $gte: today, $lt: tomorrow };
    } else if (dateFilter === 'last7days') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      dateQuery.date = { $gte: date };
    } else if (dateFilter === 'last30days') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      dateQuery.date = { $gte: date };
    } else if (startDate || endDate) {
      dateQuery.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateQuery.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.date.$lte = end;
      }
    }

    const query = { organizationId: req.organizationId, ...dateQuery };

    const total = await Enquiry.countDocuments(query);
    const opened = await Enquiry.countDocuments({ ...query, enquiryStage: 'opened' });
    const converted = await Enquiry.countDocuments({ ...query, enquiryStage: 'converted' });
    const archived = await Enquiry.countDocuments({ ...query, isArchived: true });

    res.json({
      success: true,
      stats: {
        total,
        opened,
        converted,
        archived,
        lost: archived
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const importEnquiries = async (req, res) => {
  try {
    // CSV import logic would go here
    res.json({ success: true, message: 'Import functionality to be implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportEnquiries = async (req, res) => {
  try {
    // CSV export logic would go here
    res.json({ success: true, message: 'Export functionality to be implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkArchive = async (req, res) => {
  try {
    const { enquiryIds } = req.body;

    await Enquiry.updateMany(
      {
        _id: { $in: enquiryIds },
        organizationId: req.organizationId
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          enquiryStage: 'archived'
        }
      }
    );

    res.json({ success: true, message: 'Enquiries archived successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkChangeStaff = async (req, res) => {
  try {
    const { enquiryIds, staffId } = req.body;

    await Enquiry.updateMany(
      {
        _id: { $in: enquiryIds },
        organizationId: req.organizationId
      },
      {
        $set: { assignedStaff: staffId }
      }
    );

    res.json({ success: true, message: 'Staff changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

