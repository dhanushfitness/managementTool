import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import MemberCallLog from '../models/MemberCallLog.js';
import Referral from '../models/Referral.js';
import Attendance from '../models/Attendance.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';
import { sendWelcomeMessage } from '../utils/whatsapp.js';

// Generate unique member ID
const generateMemberId = async (organizationId) => {
  const count = await Member.countDocuments({ organizationId });
  return `MEM${String(count + 1).padStart(6, '0')}`;
};

const generateMemberAttendanceId = async (organizationId) => {
  const count = await Member.countDocuments({ organizationId });
  return `MAT${String(count + 1).padStart(6, '0')}`;
};

export const createMember = async (req, res) => {
  try {
    const memberId = await generateMemberId(req.organizationId);
    const attendanceId = await generateMemberAttendanceId(req.organizationId);
    
    // Process member data
    const memberData = {
      ...req.body,
      organizationId: req.organizationId,
      branchId: req.body.branchId || req.user.branchId,
      memberId,
      attendanceId,
      createdBy: req.user._id
    };

    // Handle profile picture if provided (base64 or URL)
    if (req.body.profilePicture) {
      memberData.profilePicture = req.body.profilePicture;
    }

    // Ensure fitness profile is properly structured
    if (req.body.fitnessProfile) {
      memberData.fitnessProfile = {
        ...req.body.fitnessProfile,
        measuredAt: req.body.fitnessProfile.measuredAt || new Date()
      };
    }

    const member = await Member.create(memberData);

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'member.created',
      entityType: 'Member',
      entityId: member._id
    });

    // Send welcome message if WhatsApp is connected
    if (member.phone && member.email) {
      try {
        await sendWelcomeMessage(member.phone, `${member.firstName} ${member.lastName}`, memberId);
      } catch (error) {
        console.error('WhatsApp welcome message failed:', error);
      }
    }

    res.status(201).json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMembers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      membershipStatus, 
      branchId, 
      search,
      service,
      ageGroup,
      memberManager,
      leadSource,
      serviceCategory,
      behaviourBased,
      fitnessGoal,
      serviceVariation,
      salesRep,
      generalTrainer,
      invoice,
      purchaseType,
      customGroups,
      gender
    } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId, isActive: true };
    
    // Handle status filter (support both 'status' and 'membershipStatus' for compatibility)
    const memberStatus = membershipStatus || status;
    if (memberStatus) {
      if (memberStatus === 'inactive') {
        // Inactive means not active (expired, frozen, cancelled, pending)
        query.membershipStatus = { $ne: 'active' };
      } else {
        query.membershipStatus = memberStatus;
      }
    }
    
    // Advanced filters
    if (service) query['currentPlan.planId'] = service;
    if (memberManager) query.memberManager = memberManager;
    if (leadSource) query.source = leadSource;
    if (salesRep) query.salesRep = salesRep;
    if (generalTrainer) query.generalTrainer = generalTrainer;
    if (fitnessGoal) query['fitnessProfile.name'] = { $regex: fitnessGoal, $options: 'i' };
    if (gender) {
      const genders = gender.split(',').map(g => g.trim());
      query.gender = { $in: genders };
    }
    
    // Age group filter
    if (ageGroup) {
      const [minAge, maxAge] = ageGroup.split('-').map(a => parseInt(a.trim()));
      if (minAge && maxAge) {
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
        const minDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate());
        query.dateOfBirth = { $gte: minDate, $lte: maxDate };
      } else if (ageGroup === '65+') {
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());
        query.dateOfBirth = { $lte: maxDate };
      }
    }
    
    // Service category filter (based on plan name or category)
    if (serviceCategory) {
      query['currentPlan.planName'] = { $regex: serviceCategory, $options: 'i' };
    }
    
    // Purchase type filter (based on plan billing cycle or duration)
    if (purchaseType) {
      // This will need to be handled based on plan type
      // For now, we'll filter by plan name containing the purchase type
      query['currentPlan.planName'] = { $regex: purchaseType, $options: 'i' };
    }
    
    // Behaviour based filter (based on attendance stats)
    if (behaviourBased) {
      if (behaviourBased === 'highly-active') {
        query['attendanceStats.averageVisitsPerWeek'] = { $gte: 4 };
      } else if (behaviourBased === 'regular') {
        query.$and = [
          { 'attendanceStats.averageVisitsPerWeek': { $gte: 2 } },
          { 'attendanceStats.averageVisitsPerWeek': { $lt: 4 } }
        ];
      } else if (behaviourBased === 'occasional') {
        query.$and = [
          { 'attendanceStats.averageVisitsPerWeek': { $gte: 0.5 } },
          { 'attendanceStats.averageVisitsPerWeek': { $lt: 2 } }
        ];
      } else if (behaviourBased === 'inactive') {
        query.$or = [
          { 'attendanceStats.averageVisitsPerWeek': { $lt: 0.5 } },
          { 'attendanceStats.averageVisitsPerWeek': { $exists: false } },
          { 'attendanceStats.totalCheckIns': 0 }
        ];
      }
    }
    
    // Custom groups filter (based on tags)
    if (customGroups) {
      if (customGroups === 'vip') {
        query.tags = { $in: ['vip', 'VIP'] };
      } else if (customGroups === 'corporate') {
        query.customerType = 'corporate';
      } else if (customGroups === 'referrals') {
        query.source = 'referral';
      }
    }
    
    if (branchId) query.branchId = branchId;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    let membersQuery = Member.find(query)
      .populate('currentPlan.planId', 'name price type duration billingCycle')
      .populate('branchId', 'name code')
      .populate('memberManager', 'firstName lastName')
      .populate('salesRep', 'firstName lastName')
      .populate('generalTrainer', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Filter by invoice status if provided
    if (invoice) {
      const memberIdsWithInvoice = await Invoice.distinct('memberId', {
        organizationId: req.organizationId,
        status: invoice
      });
      membersQuery = membersQuery.where('_id').in(memberIdsWithInvoice);
    }

    const members = await membersQuery
      .skip(skip)
      .limit(parseInt(limit));

    let total;
    if (invoice) {
      const memberIdsWithInvoice = await Invoice.distinct('memberId', {
        organizationId: req.organizationId,
        status: invoice
      });
      total = await Member.countDocuments({ ...query, _id: { $in: memberIdsWithInvoice } });
    } else {
      total = await Member.countDocuments(query);
    }

    res.json({
      success: true,
      members,
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

export const searchMembers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, members: [] });
    }

    const members = await Member.find({
      organizationId: req.organizationId,
      isActive: true,
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { memberId: { $regex: q, $options: 'i' } }
      ]
    })
    .select('firstName lastName phone memberId membershipStatus profilePicture')
    .limit(10);

    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMember = async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.memberId,
      organizationId: req.organizationId
    })
      .populate('currentPlan.planId')
      .populate('branchId', 'name code address')
      .populate('createdBy', 'firstName lastName')
      .populate('salesRep', 'firstName lastName email phone')
      .populate('memberManager', 'firstName lastName email phone')
      .populate('generalTrainer', 'firstName lastName email phone category')
      .populate('mailerList', 'name');

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMember = async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Handle nested objects like termsAndConditions
    if (req.body.termsAndConditions) {
      if (!member.termsAndConditions) {
        member.termsAndConditions = {};
      }
      Object.assign(member.termsAndConditions, req.body.termsAndConditions);
      delete req.body.termsAndConditions;
    }

    Object.assign(member, req.body);
    await member.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'member.updated',
      entityType: 'Member',
      entityId: member._id
    });

    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member.isActive = false;
    member.membershipStatus = 'cancelled';
    await member.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'member.deleted',
      entityType: 'Member',
      entityId: member._id
    });

    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const enrollMember = async (req, res) => {
  try {
    const { memberId, planId, startDate, paymentMethod, discountCode } = req.body;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const plan = await Plan.findById(planId);
    if (!plan || plan.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Calculate dates
    const start = new Date(startDate || Date.now());
    let endDate = new Date(start);

    if (plan.type === 'duration') {
      const { value, unit } = plan.duration;
      switch (unit) {
        case 'days':
          endDate.setDate(endDate.getDate() + value);
          break;
        case 'weeks':
          endDate.setDate(endDate.getDate() + (value * 7));
          break;
        case 'months':
          endDate.setMonth(endDate.getMonth() + value);
          break;
        case 'years':
          endDate.setFullYear(endDate.getFullYear() + value);
          break;
      }
    }

    // Update member
    member.currentPlan = {
      planId: plan._id,
      planName: plan.name,
      startDate: start,
      endDate: endDate,
      sessions: {
        total: plan.sessions || null,
        used: 0,
        remaining: plan.sessions || null
      }
    };
    member.membershipStatus = 'active';
    await member.save();

    // Create invoice (will be handled by invoice controller)
    res.json({ success: true, member, message: 'Member enrolled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const renewMembership = async (req, res) => {
  try {
    const { memberId, planId, startDate } = req.body;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const start = new Date(startDate || member.currentPlan.endDate || Date.now());
    let endDate = new Date(start);

    if (plan.type === 'duration') {
      const { value, unit } = plan.duration;
      switch (unit) {
        case 'days':
          endDate.setDate(endDate.getDate() + value);
          break;
        case 'weeks':
          endDate.setDate(endDate.getDate() + (value * 7));
          break;
        case 'months':
          endDate.setMonth(endDate.getMonth() + value);
          break;
        case 'years':
          endDate.setFullYear(endDate.getFullYear() + value);
          break;
      }
    }

    member.currentPlan = {
      planId: plan._id,
      planName: plan.name,
      startDate: start,
      endDate: endDate,
      sessions: {
        total: plan.sessions || null,
        used: 0,
        remaining: plan.sessions || null
      }
    };
    member.membershipStatus = 'active';
    await member.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'membership.renewed',
      entityType: 'Member',
      entityId: member._id
    });

    res.json({ success: true, member, message: 'Membership renewed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const freezeMembership = async (req, res) => {
  try {
    const { memberId, startDate, endDate, reason } = req.body;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member.membershipStatus = 'frozen';
    member.freezeHistory.push({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      requestedBy: req.user._id
    });

    await member.save();

    res.json({ success: true, member, message: 'Membership frozen successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const unfreezeMembership = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (member.membershipStatus !== 'frozen') {
      return res.status(400).json({ success: false, message: 'Membership is not frozen' });
    }

    // Extend end date by freeze duration
    const activeFreeze = member.freezeHistory.find(f => !f.endDate || f.endDate > new Date());
    if (activeFreeze) {
      const freezeDays = Math.ceil((new Date() - activeFreeze.startDate) / (1000 * 60 * 60 * 24));
      if (member.currentPlan && member.currentPlan.endDate) {
        member.currentPlan.endDate.setDate(member.currentPlan.endDate.getDate() + freezeDays);
      }
      activeFreeze.endDate = new Date();
      activeFreeze.approvedBy = req.user._id;
    }

    member.membershipStatus = 'active';
    await member.save();

    res.json({ success: true, member, message: 'Membership unfrozen successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const upgradeDowngradePlan = async (req, res) => {
  try {
    const { memberId, newPlanId, prorationMethod } = req.body;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Calculate proration (simplified)
    // In production, implement proper proration logic

    member.currentPlan.planId = newPlan._id;
    member.currentPlan.planName = newPlan.name;
    await member.save();

    res.json({ success: true, member, message: 'Plan changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMemberAttendance = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const attendance = await Attendance.find({
      memberId,
      organizationId: req.organizationId
    })
      .sort({ checkInTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments({ memberId, organizationId: req.organizationId });

    res.json({
      success: true,
      attendance,
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

export const getMemberInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      memberId: req.params.memberId,
      organizationId: req.organizationId
    })
      .populate('planId', 'name type duration sessions price')
      .populate('memberId', 'firstName lastName memberId')
      .sort({ createdAt: -1 });

    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMemberPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      memberId: req.params.memberId,
      organizationId: req.organizationId
    })
      .populate('invoiceId', 'invoiceNumber total tax pending status isProForma')
      .sort({ createdAt: -1 });

    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Member Call Logs
export const getMemberCalls = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      organizationId: req.organizationId,
      memberId: req.params.memberId
    };

    // Apply filters
    const { callType, status, startDate, endDate } = req.query;
    if (callType && callType !== 'all') {
      query.callType = callType;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [calls, total] = await Promise.all([
      MemberCallLog.find(query)
        .populate('calledBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ scheduledAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MemberCallLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      calls,
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

export const createMemberCall = async (req, res) => {
  try {
    const { callType, calledBy, status, notes, scheduledAt, durationMinutes } = req.body;
    if (!callType || !calledBy) {
      return res.status(400).json({ success: false, message: 'callType and calledBy are required' });
    }
    const callLog = await MemberCallLog.create({
      organizationId: req.organizationId,
      memberId: req.params.memberId,
      callType,
      calledBy,
      status: status || 'scheduled',
      notes,
      scheduledAt,
      durationMinutes,
      createdBy: req.user._id
    });
    const populated = await callLog.populate('calledBy', 'firstName lastName').populate('createdBy', 'firstName lastName');
    res.status(201).json({ success: true, call: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMemberCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { callType, status, notes, scheduledAt, durationMinutes } = req.body;
    
    const callLog = await MemberCallLog.findOne({
      _id: callId,
      organizationId: req.organizationId,
      memberId: req.params.memberId
    });

    if (!callLog) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }

    if (callType) callLog.callType = callType;
    if (status) callLog.status = status;
    if (notes !== undefined) callLog.notes = notes;
    if (scheduledAt) callLog.scheduledAt = scheduledAt;
    if (durationMinutes !== undefined) callLog.durationMinutes = durationMinutes;

    await callLog.save();

    const populated = await callLog.populate('calledBy', 'firstName lastName').populate('createdBy', 'firstName lastName');
    
    res.json({ success: true, call: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get member invoices with payment details for payments tab
export const getMemberInvoicesWithPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, filter = 'all' } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      memberId: req.params.memberId,
      organizationId: req.organizationId
    };

    // Apply filter
    if (filter !== 'all') {
      if (filter === 'paid') {
        query.status = 'paid';
      } else if (filter === 'pending') {
        query.$or = [{ status: 'partial' }, { status: 'sent' }, { status: 'overdue' }];
      } else if (filter === 'pro-forma') {
        query.isProForma = true;
      }
    }

    const invoices = await Invoice.find(query)
      .populate('planId', 'name')
      .populate('memberId', 'firstName lastName memberId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get payments for each invoice
    const invoiceIds = invoices.map(inv => inv._id);
    const payments = await Payment.find({
      invoiceId: { $in: invoiceIds },
      organizationId: req.organizationId
    })
      .populate('invoiceId', '_id')
      .sort({ createdAt: -1 });

    // Group payments by invoice
    const paymentsByInvoice = {};
    payments.forEach(payment => {
      const invoiceId = payment.invoiceId._id.toString();
      if (!paymentsByInvoice[invoiceId]) {
        paymentsByInvoice[invoiceId] = [];
      }
      paymentsByInvoice[invoiceId].push(payment);
    });

    // Calculate payment totals for each invoice
    const invoicesWithPayments = invoices.map(invoice => {
      const invoicePayments = paymentsByInvoice[invoice._id.toString()] || [];
      const totalPaid = invoicePayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const tdsAmount = 0; // TODO: Calculate TDS if needed
      
      return {
        ...invoice.toObject(),
        payments: invoicePayments,
        totalPaid,
        tdsAmount,
        writeOff: false // TODO: Add write-off field to invoice model
      };
    });

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      invoices: invoicesWithPayments,
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

export const getMemberStats = async (req, res) => {
  try {
    const query = { organizationId: req.organizationId, isActive: true };
    
    const total = await Member.countDocuments(query);
    const active = await Member.countDocuments({ ...query, membershipStatus: 'active' });
    const inactive = await Member.countDocuments({ ...query, membershipStatus: { $ne: 'active' } });

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const importMembers = async (req, res) => {
  try {
    // CSV import logic would go here
    // For now, return success
    res.json({ success: true, message: 'Import functionality to be implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Member Referrals
export const getMemberReferrals = async (req, res) => {
  try {
    const { referralType = 'referred-by' } = req.query;
    
    const query = {
      organizationId: req.organizationId,
      memberId: req.params.memberId,
      referralType
    };

    const referrals = await Referral.find(query)
      .populate('referredMemberId', 'firstName lastName memberId phone email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      referrals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMemberReferral = async (req, res) => {
  try {
    const { referralType, name, email, countryCode, phone, notes, referredMemberId } = req.body;
    
    if (!referralType) {
      return res.status(400).json({ success: false, message: 'referralType is required' });
    }

    // Validate: either referredMemberId (for existing member) or name+phone (for external referral)
    if (!referredMemberId && (!name || !phone)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either referredMemberId or name and phone are required' 
      });
    }

    const referral = await Referral.create({
      organizationId: req.organizationId,
      memberId: req.params.memberId,
      referralType,
      referredMemberId,
      name: name || undefined,
      email: email || undefined,
      countryCode: countryCode || '+91',
      phone: phone || undefined,
      notes,
      createdBy: req.user._id
    });

    const populated = await referral.populate('referredMemberId', 'firstName lastName memberId phone email');
    
    res.status(201).json({ success: true, referral: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

