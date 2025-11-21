import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import StaffTarget from '../models/StaffTarget.js';
import Member from '../models/Member.js';
import Enquiry from '../models/Enquiry.js';
import Appointment from '../models/Appointment.js';
import MemberCallLog from '../models/MemberCallLog.js';
import FollowUp from '../models/FollowUp.js';
import { handleError } from '../utils/errorHandler.js';

const generateStaffAttendanceId = async (organizationId) => {
  const count = await User.countDocuments({
    organizationId,
    role: { $ne: 'owner' }
  });
  return `STF${String(count + 1).padStart(6, '0')}`;
};

export const createStaff = async (req, res) => {
  try {
    const {
      email, password, phone, firstName, lastName, role, branchId, permissions,
      countryCode, gender, dateOfBirth, anniversary, loginAccess,
      resume, employeeType, category, payoutType, grade, salary, jobDesignation,
      adminRights, dateOfJoining, panCard,
      bankAccount, profilePicture
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email, organizationId: req.organizationId });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Map adminRights to role if needed
    let finalRole = role || 'staff';
    if (adminRights === 'full') {
      finalRole = 'manager';
    } else if (adminRights === 'limited') {
      finalRole = 'staff';
    }

    // If login access is disabled, password is not required
    const loginAccessEnabled = loginAccess !== undefined ? loginAccess : true;
    let finalPassword = password;
    if (!loginAccessEnabled && !password) {
      // Generate a random password for users without login access
      finalPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    }

    if (!finalPassword) {
      return res.status(400).json({ success: false, message: 'Password is required for staff with login access' });
    }

    const generatedAttendanceId = await generateStaffAttendanceId(req.organizationId);

    const staffData = {
      organizationId: req.organizationId,
      branchId: branchId || req.user.branchId,
      email,
      password: finalPassword,
      phone: countryCode ? `${countryCode}${phone}` : phone,
      firstName,
      lastName,
      role: finalRole,
      permissions: permissions || [],
      countryCode: countryCode || '+91',
      gender,
      dateOfBirth: dateOfBirth || undefined,
      anniversary: anniversary || undefined,
      loginAccess: loginAccessEnabled,
      resume: resume || undefined,
      employeeType,
      category,
      payoutType,
      grade,
      salary: salary ? parseFloat(salary) : undefined,
      jobDesignation,
      adminRights: adminRights || 'none',
      dateOfJoining: dateOfJoining || undefined,
      attendanceId: generatedAttendanceId,
      panCard,
      bankAccount: bankAccount || undefined,
      profilePicture: profilePicture || undefined
    };

    const staff = await User.create(staffData);

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'staff.created',
      entityType: 'User',
      entityId: staff._id
    });

    const staffResponse = staff.toObject();
    delete staffResponse.password;

    res.status(201).json({ success: true, staff: staffResponse });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const getStaff = async (req, res) => {
  try {
    const { 
      role, branchId, employmentStatus, search, page = 1, limit = 20,
      category, adminRights
    } = req.query;
    
    const query = { 
      organizationId: req.organizationId,
      role: { $ne: 'owner' } // Exclude owner
    };

    if (role) query.role = role;
    if (branchId) query.branchId = branchId;
    if (employmentStatus) query.employmentStatus = employmentStatus;
    if (category) query.category = category;
    if (adminRights) query.adminRights = adminRights;

    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [staff, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('branchId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({ 
      success: true, 
      staff,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const getStaffMember = async (req, res) => {
  try {
    const staff = await User.findOne({
      _id: req.params.staffId,
      organizationId: req.organizationId
    })
      .select('-password')
      .populate('branchId', 'name code');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.json({ success: true, staff });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const updateStaff = async (req, res) => {
  try {
    const staff = await User.findOne({
      _id: req.params.staffId,
      organizationId: req.organizationId,
      role: { $ne: 'owner' }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Don't allow updating owner role
    if (req.body.role === 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot assign owner role' });
    }

    Object.assign(staff, req.body);
    await staff.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'staff.updated',
      entityType: 'User',
      entityId: staff._id
    });

    const staffResponse = staff.toObject();
    delete staffResponse.password;

    res.json({ success: true, staff: staffResponse });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const staff = await User.findOne({
      _id: req.params.staffId,
      organizationId: req.organizationId,
      role: { $ne: 'owner' }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    staff.isActive = false;
    staff.employmentStatus = 'terminated';
    await staff.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'staff.deleted',
      entityType: 'User',
      entityId: staff._id
    });

    res.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const assignShift = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { day, shifts } = req.body;

    const staff = await User.findOne({
      _id: staffId,
      organizationId: req.organizationId
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (staff.shiftSchedule && day) {
      staff.shiftSchedule[day] = shifts;
      await staff.save();
    }

    res.json({ success: true, staff });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const getStaffShifts = async (req, res) => {
  try {
    const staff = await User.findOne({
      _id: req.params.staffId,
      organizationId: req.organizationId
    }).select('shiftSchedule firstName lastName');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.json({ success: true, shifts: staff.shiftSchedule });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const getStaffAttendance = async (req, res) => {
  try {
    // Staff attendance tracking would go here
    res.json({ success: true, message: 'Staff attendance tracking to be implemented' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const updateStaffPermissions = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { permissions } = req.body;

    const staff = await User.findOne({
      _id: staffId,
      organizationId: req.organizationId,
      role: { $ne: 'owner' }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    staff.permissions = permissions;
    await staff.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'staff.permissions.updated',
      entityType: 'User',
      entityId: staff._id
    });

    res.json({ success: true, staff });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Staff Targets
export const getStaffTargets = async (req, res) => {
  try {
    const { staffId, targetType, salesType, year } = req.query;
    const query = { organizationId: req.organizationId };
    
    if (staffId) query.staffId = staffId;
    if (targetType) query.targetType = targetType;
    if (salesType) query.salesType = salesType;
    if (year) query.year = parseInt(year);

    const targets = await StaffTarget.find(query)
      .populate('staffId', 'firstName lastName')
      .sort({ year: -1, createdAt: -1 });

    res.json({ success: true, targets });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const createStaffTarget = async (req, res) => {
  try {
    const { staffId, targetType, salesType, year, monthlyTargets } = req.body;

    if (!staffId || !targetType || !year) {
      return res.status(400).json({ success: false, message: 'staffId, targetType, and year are required' });
    }

    // Check if target already exists
    const existing = await StaffTarget.findOne({
      organizationId: req.organizationId,
      staffId,
      targetType,
      salesType,
      year
    });

    if (existing) {
      // Update existing target
      Object.assign(existing, { monthlyTargets, updatedAt: new Date() });
      await existing.save();
      return res.json({ success: true, target: existing });
    }

    const target = await StaffTarget.create({
      organizationId: req.organizationId,
      staffId,
      targetType,
      salesType,
      year: parseInt(year),
      monthlyTargets: monthlyTargets || {},
      createdBy: req.user._id
    });

    const populated = await target.populate('staffId', 'firstName lastName');
    res.status(201).json({ success: true, target: populated });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Bulk Rep Change
export const bulkRepChange = async (req, res) => {
  try {
    const { fromStaffId, toStaffId, changes } = req.body;

    if (!fromStaffId || !toStaffId || !changes) {
      return res.status(400).json({ success: false, message: 'fromStaffId, toStaffId, and changes are required' });
    }

    const results = { updated: 0, errors: [] };

    // Update Member Manager
    if (changes.memberManager && changes.memberManager.count > 0) {
      const updated = await Member.updateMany(
        { 
          organizationId: req.organizationId,
          memberManager: fromStaffId
        },
        { $set: { memberManager: toStaffId } },
        { limit: changes.memberManager.count }
      );
      results.updated += updated.modifiedCount;
    }

    // Update Sales Rep
    if (changes.salesRep && changes.salesRep.count > 0) {
      const updated = await Member.updateMany(
        { 
          organizationId: req.organizationId,
          salesRep: fromStaffId
        },
        { $set: { salesRep: toStaffId } },
        { limit: changes.salesRep.count }
      );
      results.updated += updated.modifiedCount;
    }

    // Update General Trainer
    if (changes.generalTrainer && changes.generalTrainer.count > 0) {
      const updated = await Member.updateMany(
        { 
          organizationId: req.organizationId,
          generalTrainer: fromStaffId
        },
        { $set: { generalTrainer: toStaffId } },
        { limit: changes.generalTrainer.count }
      );
      results.updated += updated.modifiedCount;
    }

    // Note: Personal Trainer is typically assigned per plan/invoice, not stored directly in member
    // This would need to be handled through invoice/plan updates if needed

    // Update Member Appointments
    if (changes.memberAppointments && changes.memberAppointments.count > 0) {
      const updated = await Appointment.updateMany(
        { 
          organizationId: req.organizationId,
          staffId: fromStaffId,
          memberId: { $exists: true }
        },
        { $set: { staffId: toStaffId } },
        { limit: changes.memberAppointments.count }
      );
      results.updated += updated.modifiedCount;
    }

    // Update Member Call Logs
    if (changes.memberCallLog && changes.memberCallLog.count > 0) {
      const updated = await MemberCallLog.updateMany(
        { 
          organizationId: req.organizationId,
          calledBy: fromStaffId
        },
        { $set: { calledBy: toStaffId } },
        { limit: changes.memberCallLog.count }
      );
      results.updated += updated.modifiedCount;
    }

    // Update Enquiry Follow-ups
    if (changes.enquiryFollowUp && changes.enquiryFollowUp.count > 0) {
      const updated = await FollowUp.updateMany(
        { 
          organizationId: req.organizationId,
          assignedStaff: fromStaffId
        },
        { $set: { assignedStaff: toStaffId } },
        { limit: changes.enquiryFollowUp.count }
      );
      results.updated += updated.modifiedCount;
    }

    // Update Enquiry Assigned Staff
    if (changes.enquiryAssigned && changes.enquiryAssigned.count > 0) {
      const updated = await Enquiry.updateMany(
        { 
          organizationId: req.organizationId,
          assignedStaff: fromStaffId
        },
        { $set: { assignedStaff: toStaffId } },
        { limit: changes.enquiryAssigned.count }
      );
      results.updated += updated.modifiedCount;
    }

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'staff.bulkRepChange',
      entityType: 'User',
      entityId: fromStaffId,
      metadata: { toStaffId, changes, results }
    });

    res.json({ success: true, results });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Get rep change counts
export const getRepChangeCounts = async (req, res) => {
  try {
    const { staffId } = req.params;

    const counts = {
      memberManager: await Member.countDocuments({ organizationId: req.organizationId, memberManager: staffId }),
      salesRep: await Member.countDocuments({ organizationId: req.organizationId, salesRep: staffId }),
      generalTrainer: await Member.countDocuments({ organizationId: req.organizationId, generalTrainer: staffId }),
      personalTrainer: 0, // Personal trainer assignments are typically in invoices/plans
      memberAppointments: await Appointment.countDocuments({ organizationId: req.organizationId, staffId, memberId: { $exists: true } }),
      memberCallLog: await MemberCallLog.countDocuments({ organizationId: req.organizationId, calledBy: staffId }),
      enquiryFollowUp: await FollowUp.countDocuments({ organizationId: req.organizationId, assignedStaff: staffId }),
      enquiryAssigned: await Enquiry.countDocuments({ organizationId: req.organizationId, assignedStaff: staffId })
    };

    res.json({ success: true, counts });
  } catch (error) {
    handleError(error, res, 500);
  }
};

