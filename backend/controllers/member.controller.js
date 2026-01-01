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
import { handleError } from '../utils/errorHandler.js';

// Normalize phone number for comparison (remove spaces, dashes, and other special characters)
const normalizePhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

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
    // Check for duplicate phone number
    if (req.body.phone) {
      const normalizedPhone = normalizePhone(req.body.phone);
      
      if (normalizedPhone) {
        // Check all members in the organization for duplicate phone
        const allMembers = await Member.find({
          organizationId: req.organizationId,
          isActive: true
        }).select('phone');

        const duplicateMember = allMembers.find(m => {
          const existingNormalized = normalizePhone(m.phone);
          return existingNormalized === normalizedPhone && existingNormalized !== '';
        });

        if (duplicateMember) {
          return res.status(400).json({
            success: false,
            message: 'A member with this contact number already exists. Please use a different contact number.'
          });
        }
      }
    }

    // Check for duplicate email
    if (req.body.email && req.body.email.trim()) {
      const normalizedEmail = req.body.email.toLowerCase().trim();
      
      const existingMember = await Member.findOne({
        organizationId: req.organizationId,
        email: normalizedEmail,
        isActive: true
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'A member with this email already exists. Please use a different email address.'
        });
      }
    }

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
    handleError(error, res, 500);
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
      salesRep,
      generalTrainer,
      invoice,
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
    
    // Service category filter (filter by serviceType from Plan collection)
    if (serviceCategory) {
      const Plan = (await import('../models/Plan.js')).default;
      const plansWithCategory = await Plan.find({ 
        organizationId: req.organizationId, 
        serviceType: serviceCategory 
      }).select('_id');
      const planIds = plansWithCategory.map(p => p._id);
      if (planIds.length > 0) {
        query['currentPlan.planId'] = { $in: planIds };
      } else {
        // No plans found with this category, return empty result
        query['currentPlan.planId'] = null;
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
      .sort({ createdAt: -1 })
      .lean();

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
    handleError(error, res, 500);
  }
};

export const searchMembers = async (req, res) => {
  try {
    const { q, searchType } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, members: [] });
    }

    const searchTerm = q.trim();
    const query = {
      organizationId: req.organizationId,
      isActive: true
    };

    // Build search query based on search type
    switch (searchType) {
      case 'email':
        query.email = { $regex: searchTerm, $options: 'i' };
        break;
      case 'phone':
        query.phone = { $regex: searchTerm, $options: 'i' };
        break;
      case 'member-id':
        query.memberId = { $regex: searchTerm, $options: 'i' };
        break;
      case 'member-name':
      default:
        // Search by name (first name, last name, or full name combination)
        query.$or = [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } }
        ];
        break;
    }

    let members;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    // For member-name, use aggregation to also search full name
    if (searchType === 'member-name' || !searchType) {
      members = await Member.aggregate([
        {
          $match: {
            organizationId: req.organizationId,
            isActive: true
          }
        },
        {
          $addFields: {
            fullName: { 
              $concat: [
                { $ifNull: ['$firstName', ''] }, 
                ' ', 
                { $ifNull: ['$lastName', ''] }
              ] 
            }
          }
        },
        {
          $match: {
            $or: [
              { firstName: { $regex: searchTerm, $options: 'i' } },
              { lastName: { $regex: searchTerm, $options: 'i' } },
              { fullName: { $regex: searchTerm, $options: 'i' } }
            ]
          }
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            phone: 1,
            email: 1,
            memberId: 1,
            membershipStatus: 1,
            profilePicture: 1,
            'currentPlan.endDate': 1
          }
        },
        { $limit: 10 }
      ]);
      
      // Convert aggregation results and calculate actual membership status
      members = members.map(m => {
        // Check if membership has actually expired based on endDate
        let actualStatus = m.membershipStatus;
        if (m.currentPlan?.endDate) {
          const endDate = new Date(m.currentPlan.endDate);
          endDate.setHours(0, 0, 0, 0);
          // If endDate has passed, membership is expired regardless of stored status
          if (endDate < now && actualStatus === 'active') {
            actualStatus = 'expired';
          }
        }
        
        return {
          _id: m._id,
          firstName: m.firstName,
          lastName: m.lastName,
          phone: m.phone,
          email: m.email,
          memberId: m.memberId,
          membershipStatus: actualStatus, // Use calculated status
          profilePicture: m.profilePicture
        };
      });
    } else {
      members = await Member.find(query)
        .select('firstName lastName phone email memberId membershipStatus profilePicture currentPlan.endDate')
        .limit(10)
        .lean();
      
      // Calculate actual membership status for each member
      members = members.map(m => {
        let actualStatus = m.membershipStatus;
        if (m.currentPlan?.endDate) {
          const endDate = new Date(m.currentPlan.endDate);
          endDate.setHours(0, 0, 0, 0);
          // If endDate has passed, membership is expired regardless of stored status
          if (endDate < now && actualStatus === 'active') {
            actualStatus = 'expired';
          }
        }
        return {
          ...m,
          membershipStatus: actualStatus // Use calculated status
        };
      });
    }

    console.log(`Search for "${searchTerm}" (type: ${searchType || 'member-name'}) found ${members.length} members`);
    res.json({ success: true, members });
  } catch (error) {
    console.error('Search members error:', error);
    handleError(error, res, 500);
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

    const now = new Date();
    let currentPlanStatus = null;
    if (member.currentPlan?.startDate && member.currentPlan?.endDate) {
      const start = new Date(member.currentPlan.startDate);
      const end = new Date(member.currentPlan.endDate);
      currentPlanStatus = {
        ...member.currentPlan.toObject?.() ?? member.currentPlan,
        isActive: start <= now && end >= now,
        hasSessionsRemaining: Boolean(member.currentPlan.sessions?.remaining > 0)
      };
    }

    res.json({
      success: true,
      member,
      currentPlanStatus
    });
  } catch (error) {
    handleError(error, res, 500);
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

    // Check for duplicate phone number if phone is being updated
    if (req.body.phone) {
      const normalizedPhone = normalizePhone(req.body.phone);
      const allMembers = await Member.find({
        organizationId: req.organizationId,
        isActive: true,
        _id: { $ne: req.params.memberId } // Exclude current member
      }).select('phone');

      const duplicateMember = allMembers.find(m => {
        const existingNormalized = normalizePhone(m.phone);
        return existingNormalized === normalizedPhone && existingNormalized !== '';
      });

      if (duplicateMember) {
        return res.status(400).json({
          success: false,
          message: 'A member with this contact number already exists. Please use a different contact number.'
        });
      }
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
    handleError(error, res, 500);
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

    // Prevent deletion if member still has an active membership plan
    const hasActivePlan = (() => {
      if (member.membershipStatus === 'active') {
        if (member.currentPlan?.endDate) {
          return new Date(member.currentPlan.endDate) >= new Date();
        }
        return true;
      }
      return false;
    })();

    if (hasActivePlan) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete member while an active membership plan is available. Please end or expire the plan first.'
      });
    }

    const memberId = member._id;
    const organizationId = req.organizationId;

    // Import all related models
    const Invoice = (await import('../models/Invoice.js')).default;
    const Payment = (await import('../models/Payment.js')).default;
    const Attendance = (await import('../models/Attendance.js')).default;
    const FollowUp = (await import('../models/FollowUp.js')).default;
    const MemberCallLog = (await import('../models/MemberCallLog.js')).default;
    const Referral = (await import('../models/Referral.js')).default;
    const Appointment = (await import('../models/Appointment.js')).default;
    const Communication = (await import('../models/Communication.js')).default;
    const Enquiry = (await import('../models/Enquiry.js')).default;

    // Delete all related records
    const deletionResults = {
      invoices: 0,
      payments: 0,
      attendance: 0,
      followUps: 0,
      callLogs: 0,
      referrals: 0,
      appointments: 0,
      communications: 0,
      enquiries: 0
    };

    // Delete Invoices
    const invoiceResult = await Invoice.deleteMany({
      memberId: memberId,
      organizationId: organizationId
    });
    deletionResults.invoices = invoiceResult.deletedCount;

    // Delete Payments
    const paymentResult = await Payment.deleteMany({
      memberId: memberId,
      organizationId: organizationId
    });
    deletionResults.payments = paymentResult.deletedCount;

    // Delete Attendance records
    const attendanceResult = await Attendance.deleteMany({
      memberId: memberId,
      organizationId: organizationId
    });
    deletionResults.attendance = attendanceResult.deletedCount;

    // Delete Follow-ups (where member is the related entity)
    const followUpResult = await FollowUp.deleteMany({
      organizationId: organizationId,
      'relatedTo.entityType': 'member',
      'relatedTo.entityId': memberId
    });
    deletionResults.followUps = followUpResult.deletedCount;

    // Delete Call Logs
    const callLogResult = await MemberCallLog.deleteMany({
      memberId: memberId,
      organizationId: organizationId
    });
    deletionResults.callLogs = callLogResult.deletedCount;

    // Delete Referrals (both as member and referred member)
    const referralResult = await Referral.deleteMany({
      organizationId: organizationId,
      $or: [
        { memberId: memberId },
        { referredMemberId: memberId }
      ]
    });
    deletionResults.referrals = referralResult.deletedCount;

    // Delete Appointments
    const appointmentResult = await Appointment.deleteMany({
      memberId: memberId,
      organizationId: organizationId
    });
    deletionResults.appointments = appointmentResult.deletedCount;

    // Delete Communication recipients (remove member from recipients array)
    const communicationResult = await Communication.updateMany(
      {
        organizationId: organizationId,
        'recipients.memberId': memberId
      },
      {
        $pull: {
          recipients: { memberId: memberId }
        }
      }
    );
    deletionResults.communications = communicationResult.modifiedCount;

    // Update Enquiries (remove convertedToMember reference)
    const enquiryResult = await Enquiry.updateMany(
      {
        organizationId: organizationId,
        convertedToMember: memberId
      },
      {
        $unset: { convertedToMember: '', convertedAt: '' },
        $set: { isMember: false }
      }
    );
    deletionResults.enquiries = enquiryResult.modifiedCount;

    // Finally, delete the member
    await Member.deleteOne({ _id: memberId });

    // Log the deletion
    await AuditLog.create({
      organizationId: organizationId,
      userId: req.user._id,
      action: 'member.deleted',
      entityType: 'Member',
      entityId: memberId,
      details: {
        memberName: `${member.firstName} ${member.lastName}`,
        memberId: member.memberId,
        deletedRecords: deletionResults
      }
    });

    res.json({
      success: true,
      message: 'Member and all related records deleted successfully',
      deletedRecords: deletionResults
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
      .populate({
        path: 'items.serviceId',
        select: 'name serviceId',
        populate: {
          path: 'serviceId',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, invoices });
  } catch (error) {
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
      
      // Calculate TDS (Tax Deducted at Source) if applicable
      // TDS is typically applicable for professional services or specific payment types
      // For gym memberships, TDS is usually not applicable
      // However, if invoice has a TDS field, use it; otherwise it's 0
      const tdsAmount = invoice.tds?.amount || 0;
      
      return {
        ...invoice.toObject(),
        payments: invoicePayments,
        totalPaid,
        tdsAmount,
        writeOff: invoice.writeOff || false
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
    handleError(error, res, 500);
  }
};

export const getMemberStats = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const query = { organizationId, isActive: true };
    
    // Get total members
    const total = await Member.countDocuments(query);
    
    // Calculate active members based on actual invoices (not stored membershipStatus)
    // A member is active if they have at least one invoice that is:
    // 1. Status is 'paid' or 'partial'
    // 2. If invoice has expiryDate, it should be >= today
    // 3. If invoice has no expiryDate, it's considered active if paid/partial
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Find all invoices with active memberships
    const activeInvoices = await Invoice.aggregate([
      {
        $match: {
          organizationId,
          status: { $in: ['paid', 'partial'] },
          'items.0': { $exists: true } // Has at least one item
        }
      },
      {
        $project: {
          memberId: 1,
          status: 1,
          itemExpiryDate: { $arrayElemAt: ['$items.expiryDate', 0] }
        }
      },
      {
        $match: {
          $or: [
            // Has expiry date and it's in the future or today
            {
              itemExpiryDate: { $exists: true, $ne: null, $gte: now }
            },
            // No expiry date or null (session-based memberships) - consider active if paid/partial
            {
              $or: [
                { itemExpiryDate: { $exists: false } },
                { itemExpiryDate: null }
              ]
            }
          ]
        }
      },
      {
        $group: {
          _id: '$memberId'
        }
      }
    ]);
    
    // Get unique member IDs with active memberships
    const activeMemberIds = activeInvoices.map(inv => inv._id);
    
    // Count active members
    const active = activeMemberIds.length > 0 
      ? await Member.countDocuments({ 
          ...query, 
          _id: { $in: activeMemberIds } 
        })
      : 0;
    
    // Inactive = total - active
    const inactive = total - active;

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive
      }
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const importMembers = async (req, res) => {
  try {
    // CSV import logic would go here
    // For now, return success
    res.json({ success: true, message: 'Import functionality to be implemented' });
  } catch (error) {
    handleError(error, res, 500);
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
    handleError(error, res, 500);
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
    handleError(error, res, 500);
  }
};

// Time slot management for expired members
export const setMemberTimeSlots = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { timeSlots } = req.body;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Validate time slots format
    if (timeSlots && Array.isArray(timeSlots)) {
      for (const slot of timeSlots) {
        if (slot.dayOfWeek === undefined || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid dayOfWeek. Must be between 0 (Sunday) and 6 (Saturday)' 
          });
        }
        
        if (!slot.startTime || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(slot.startTime)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid startTime format. Must be HH:MM (24-hour format)' 
          });
        }
        
        if (!slot.endTime || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(slot.endTime)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid endTime format. Must be HH:MM (24-hour format)' 
          });
        }

        // Validate that startTime is before endTime
        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        if (startMinutes >= endMinutes) {
          return res.status(400).json({ 
            success: false, 
            message: 'startTime must be before endTime' 
          });
        }
      }
    }

    // Update time slots
    member.timeSlots = timeSlots || [];
    await member.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'member.timeslots.updated',
      entityType: 'Member',
      entityId: member._id
    });

    res.json({ success: true, member, message: 'Time slots updated successfully' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const getMemberTimeSlots = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    }).select('timeSlots membershipStatus');

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ 
      success: true, 
      timeSlots: member.timeSlots || [],
      membershipStatus: member.membershipStatus
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

