import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

export const createStaff = async (req, res) => {
  try {
    const {
      email, password, phone, firstName, lastName, role, branchId, permissions,
      countryCode, gender, dateOfBirth, anniversary, vaccinated, loginAccess,
      resume, employeeType, category, payoutType, grade, salary, jobDesignation,
      adminRights, dateOfJoining, attendanceId, panCard, gstNumber,
      bankAccount, hrmsId, profilePicture
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
    if (!loginAccessEnabled && !password) {
      // Generate a random password for users without login access
      password = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    }

    const staffData = {
      organizationId: req.organizationId,
      branchId: branchId || req.user.branchId,
      email,
      password: loginAccessEnabled ? password : password, // Use generated password if no login access
      phone: countryCode ? `${countryCode}${phone}` : phone,
      firstName,
      lastName,
      role: finalRole,
      permissions: permissions || [],
      countryCode: countryCode || '+91',
      gender,
      dateOfBirth: dateOfBirth || undefined,
      anniversary: anniversary || undefined,
      vaccinated,
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
      attendanceId,
      panCard,
      gstNumber,
      bankAccount: bankAccount || undefined,
      hrmsId,
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
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaff = async (req, res) => {
  try {
    const { role, branchId, employmentStatus } = req.query;
    const query = { 
      organizationId: req.organizationId,
      role: { $ne: 'owner' } // Exclude owner
    };

    if (role) query.role = role;
    if (branchId) query.branchId = branchId;
    if (employmentStatus) query.employmentStatus = employmentStatus;

    const staff = await User.find(query)
      .select('-password')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaffAttendance = async (req, res) => {
  try {
    // Staff attendance tracking would go here
    res.json({ success: true, message: 'Staff attendance tracking to be implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

