import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';
import { sendWelcomeMessage } from '../utils/whatsapp.js';

// Generate unique member ID
const generateMemberId = async (organizationId) => {
  const count = await Member.countDocuments({ organizationId });
  return `MEM${String(count + 1).padStart(6, '0')}`;
};

export const createMember = async (req, res) => {
  try {
    const memberId = await generateMemberId(req.organizationId);
    
    // Process member data
    const memberData = {
      ...req.body,
      organizationId: req.organizationId,
      branchId: req.body.branchId || req.user.branchId,
      memberId,
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
    const { page = 1, limit = 20, status, branchId, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId, isActive: true };
    if (status) query.membershipStatus = status;
    if (branchId) query.branchId = branchId;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    const members = await Member.find(query)
      .populate('currentPlan.planId', 'name price')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Member.countDocuments(query);

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
      .populate('branchId')
      .populate('createdBy', 'firstName lastName');

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
    }).sort({ createdAt: -1 });

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
    }).sort({ createdAt: -1 });

    res.json({ success: true, payments });
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

