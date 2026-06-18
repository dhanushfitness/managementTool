import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import Invoice from '../models/Invoice.js';
import Plan from '../models/Plan.js';
import AuditLog from '../models/AuditLog.js';
import Branch from '../models/Branch.js';

const getHeaderValue = (req, headerName) => req.get(headerName) || req.get(headerName.toLowerCase());

const isValidDeviceSecret = (req) => {
  const configuredSecret = process.env.ZKT_DEVICE_SECRET || process.env.BIOMETRIC_DEVICE_SECRET;

  if (!configuredSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const providedSecret =
    getHeaderValue(req, 'X-ZKT-DEVICE-KEY') ||
    getHeaderValue(req, 'X-BIOMETRIC-DEVICE-KEY') ||
    req.query.deviceKey ||
    req.body?.deviceKey;

  return providedSecret === configuredSecret;
};

const getDeviceIdFromRequest = (req) => {
  const source = { ...req.query, ...(req.body || {}) };
  return source.deviceId || source.device_id || source.sn || source.SN || source.deviceSN || source.DeviceID;
};

const getBiometricIdentifier = (body = {}) => (
  body.fingerprintId ||
  body.fingerprint_id ||
  body.userId ||
  body.user_id ||
  body.uid ||
  body.pin ||
  body.PIN ||
  body.cardNo ||
  body.cardno ||
  body.memberId ||
  body.attendanceId
);

const getPunchTime = (body = {}) => {
  const rawTimestamp = body.timestamp || body.time || body.punchTime || body.punch_time || body.DateTime;
  const parsed = rawTimestamp ? new Date(rawTimestamp) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getMemberAccessStatus = (member, checkInTime, allowManualOverride = false) => {
  if (allowManualOverride) {
    return { status: 'success', blockedReason: null };
  }

  let status = 'success';
  let blockedReason = null;

  if (member.currentPlan && member.currentPlan.endDate) {
    const endDate = new Date(member.currentPlan.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (endDate < checkInTime) {
      status = 'expired';
      blockedReason = 'Membership has expired';
    }
  }

  if (member.membershipStatus === 'expired') {
    const timeSlotValidation = validateTimeSlotAccess(member, checkInTime);
    if (!timeSlotValidation.allowed) {
      status = 'expired';
      blockedReason = timeSlotValidation.message;
    } else {
      status = 'success';
      blockedReason = null;
    }
  } else if (member.membershipStatus === 'frozen') {
    status = 'frozen';
    blockedReason = 'Membership is frozen';
  } else if (member.membershipStatus === 'cancelled') {
    status = 'blocked';
    blockedReason = 'Membership is cancelled';
  } else if (member.membershipStatus !== 'active') {
    status = 'blocked';
    blockedReason = 'Membership is not active';
  }

  return { status, blockedReason };
};

const updateMemberAttendanceStats = async (member, checkInTime) => {
  const previousLastCheckIn = member.attendanceStats?.lastCheckIn
    ? new Date(member.attendanceStats.lastCheckIn)
    : null;

  member.attendanceStats.totalCheckIns = (member.attendanceStats.totalCheckIns || 0) + 1;
  member.attendanceStats.lastCheckIn = checkInTime;

  const yesterday = new Date(checkInTime);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  if (previousLastCheckIn) {
    previousLastCheckIn.setHours(0, 0, 0, 0);
    if (previousLastCheckIn.getTime() === yesterday.getTime()) {
      member.attendanceStats.currentStreak = (member.attendanceStats.currentStreak || 0) + 1;
    } else if (previousLastCheckIn.getTime() < yesterday.getTime()) {
      member.attendanceStats.currentStreak = 1;
    }
  } else {
    member.attendanceStats.currentStreak = 1;
  }

  if ((member.attendanceStats.currentStreak || 0) > (member.attendanceStats.longestStreak || 0)) {
    member.attendanceStats.longestStreak = member.attendanceStats.currentStreak;
  }

  await member.save();
};

export const authenticateBiometricDevice = async (req, res, next) => {
  try {
    const deviceId = getDeviceIdFromRequest(req);

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'Device ID is required' });
    }

    if (!isValidDeviceSecret(req)) {
      return res.status(401).json({ success: false, message: 'Invalid biometric device credentials' });
    }

    const deviceMatch = process.env.NODE_ENV === 'production'
      ? { $elemMatch: { deviceId: String(deviceId), status: 'active' } }
      : { $elemMatch: { deviceId: String(deviceId) } };

    const branch = await Branch.findOne({
      biometricDevices: deviceMatch,
      isActive: true
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Biometric device is not registered to an active branch'
      });
    }

    const device = branch.biometricDevices.find((item) => item.deviceId === String(deviceId));
    if (device) {
      device.lastSeen = new Date();
      if (device.status === 'offline') {
        device.status = 'active';
      }
      await branch.save();
    }

    req.organizationId = branch.organizationId;
    req.biometricDevice = {
      deviceId: String(deviceId),
      deviceName: device?.deviceName,
      branchId: branch._id,
      organizationId: branch.organizationId
    };

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Validate if member can access at the given time based on time slots
 * @param {Object} member - Member object
 * @param {Date} checkInTime - Time to check access for
 * @returns {Object} - { allowed: boolean, message: string, allowedSlots: array }
 */
const validateTimeSlotAccess = (member, checkInTime) => {
  // Active members have no time restrictions
  if (member.membershipStatus === 'active') {
    const now = new Date();
    if (member.currentPlan && member.currentPlan.endDate) {
      const endDate = new Date(member.currentPlan.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (endDate >= now) {
        return { allowed: true, message: 'Access granted' };
      }
    } else if (member.membershipStatus === 'active') {
      return { allowed: true, message: 'Access granted' };
    }
  }

  // For expired members, check time slots
  if (member.membershipStatus === 'expired' && member.timeSlots && member.timeSlots.length > 0) {
    const checkInDate = new Date(checkInTime);
    const dayOfWeek = checkInDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = `${String(checkInDate.getHours()).padStart(2, '0')}:${String(checkInDate.getMinutes()).padStart(2, '0')}`;
    
    // Find enabled time slots for this day
    const daySlots = member.timeSlots.filter(slot => 
      slot.dayOfWeek === dayOfWeek && slot.enabled
    );

    if (daySlots.length === 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return { 
        allowed: false, 
        message: `No access allowed on ${dayNames[dayOfWeek]}. Please check your time slots.`,
        allowedSlots: []
      };
    }

    // Check if current time falls within any enabled slot
    const isWithinSlot = daySlots.some(slot => {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const [currentHour, currentMin] = currentTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const currentMinutes = currentHour * 60 + currentMin;
      
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    });

    if (isWithinSlot) {
      return { allowed: true, message: 'Access granted within time slot' };
    } else {
      // Format allowed slots for the message
      const allowedSlots = daySlots.map(slot => `${slot.startTime} - ${slot.endTime}`).join(', ');
      return { 
        allowed: false, 
        message: `Access denied. Allowed times for today: ${allowedSlots}`,
        allowedSlots: daySlots.map(slot => ({ startTime: slot.startTime, endTime: slot.endTime }))
      };
    }
  }

  // If expired but no time slots configured, deny access
  if (member.membershipStatus === 'expired') {
    return { 
      allowed: false, 
      message: 'Membership has expired. No time slots configured.',
      allowedSlots: []
    };
  }

  // Default: allow access (for other statuses like frozen, cancelled, etc. will be handled separately)
  return { allowed: true, message: 'Access granted' };
};

export const checkIn = async (req, res) => {
  try {
    const { 
      memberId, 
      method, 
      deviceId, 
      deviceName, 
      notes, 
      checkInType = 'current-branch',
      serviceId,
      checkInDate,
      checkInTime,
      allowManualOverride = false
    } = req.body;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    }).populate('currentPlan.planId');

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const now = new Date();
    let checkInDateTime = new Date();
    if (checkInDate && checkInTime) {
      const [hours, minutes] = checkInTime.split(':');
      checkInDateTime = new Date(checkInDate);
      checkInDateTime.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    } else if (checkInDate) {
      checkInDateTime = new Date(checkInDate);
      checkInDateTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
    }

    const { status, blockedReason } = getMemberAccessStatus(member, checkInDateTime, allowManualOverride);

    // Check if already checked in on the same day (if not manual override)
    if (!allowManualOverride) {
      const checkInDay = new Date(checkInDateTime);
      checkInDay.setHours(0, 0, 0, 0);
      const checkInDayEnd = new Date(checkInDay);
      checkInDayEnd.setHours(23, 59, 59, 999);
      
      const existingCheckIn = await Attendance.findOne({
        memberId: member._id,
        checkInTime: { $gte: checkInDay, $lte: checkInDayEnd },
        checkOutTime: null
      });

      if (existingCheckIn && status === 'success') {
        return res.status(400).json({ 
          success: false, 
          message: 'Member already checked in on this date',
          attendance: existingCheckIn
        });
      }
    }

    const attendance = await Attendance.create({
      organizationId: req.organizationId,
      branchId: member.branchId,
      memberId: member._id,
      checkInTime: checkInDateTime,
      method: method || 'manual',
      deviceId,
      deviceName,
      status,
      blockedReason,
      checkedInBy: req.user._id,
      notes,
      serviceId: serviceId || (member.currentPlan?.planId?._id || member.currentPlan?.planId)
    });

    // Update member stats if successful
    if (status === 'success') {
      member.attendanceStats.totalCheckIns += 1;
      member.attendanceStats.lastCheckIn = checkInDateTime;
      
      // Update streak
      const yesterday = new Date(checkInDateTime);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const lastCheckIn = member.attendanceStats.lastCheckIn ? new Date(member.attendanceStats.lastCheckIn) : null;
      if (lastCheckIn) {
        lastCheckIn.setHours(0, 0, 0, 0);
        const checkInDay = new Date(checkInDateTime);
        checkInDay.setHours(0, 0, 0, 0);
        
        if (lastCheckIn.getTime() === yesterday.getTime()) {
          member.attendanceStats.currentStreak += 1;
        } else if (lastCheckIn.getTime() < yesterday.getTime()) {
          member.attendanceStats.currentStreak = 1;
        }
      } else {
        member.attendanceStats.currentStreak = 1;
      }

      if (member.attendanceStats.currentStreak > member.attendanceStats.longestStreak) {
        member.attendanceStats.longestStreak = member.attendanceStats.currentStreak;
      }

      await member.save();
    }

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'attendance.checkin',
      entityType: 'Attendance',
      entityId: attendance._id
    });

    // Populate attendance with member details
    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('memberId', 'firstName lastName memberId phone profilePicture')
      .populate('serviceId', 'name');

    res.json({ 
      success: status === 'success', 
      attendance: populatedAttendance,
      member: {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        memberId: member.memberId,
        profilePicture: member.profilePicture,
        membershipStatus: member.membershipStatus,
        currentPlan: member.currentPlan
      },
      message: status === 'success' ? 'Check-in successful' : blockedReason
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const { attendanceId } = req.body;

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      organizationId: req.organizationId
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ success: false, message: 'Already checked out' });
    }

    attendance.checkOutTime = new Date();
    await attendance.save();

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 20, branchId, startDate, endDate, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId };
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.checkInTime = {};
      if (startDate) query.checkInTime.$gte = new Date(startDate);
      if (endDate) query.checkInTime.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate('memberId', 'firstName lastName memberId profilePicture')
      .populate('branchId', 'name code')
      .sort({ checkInTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(query);

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

export const getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const query = { organizationId: req.organizationId, status: 'success' };
    
    if (branchId) query.branchId = branchId;
    if (startDate || endDate) {
      query.checkInTime = {};
      if (startDate) query.checkInTime.$gte = new Date(startDate);
      if (endDate) query.checkInTime.$lte = new Date(endDate);
    }

    const totalCheckIns = await Attendance.countDocuments(query);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCheckIns = await Attendance.countDocuments({
      ...query,
      checkInTime: { $gte: today }
    });

    const byMethod = await Attendance.aggregate([
      { $match: query },
      { $group: { _id: '$method', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalCheckIns,
        todayCheckIns,
        byMethod
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMemberAttendanceHistory = async (req, res) => {
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

export const getBranchAttendance = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { date } = req.query;

    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      branchId,
      organizationId: req.organizationId,
      checkInTime: { $gte: startDate, $lte: endDate }
    })
      .populate('memberId', 'firstName lastName memberId')
      .sort({ checkInTime: -1 });

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportAttendance = async (req, res) => {
  try {
    // CSV export logic would go here
    res.json({ success: true, message: 'Export functionality to be implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search member by attendance ID
export const searchMemberByAttendanceId = async (req, res) => {
  try {
    const { attendanceId } = req.query;

    if (!attendanceId) {
      return res.status(400).json({ success: false, message: 'Attendance ID is required' });
    }

    const member = await Member.findOne({
      organizationId: req.organizationId,
      $or: [
        { attendanceId: { $regex: attendanceId, $options: 'i' } },
        { memberId: { $regex: attendanceId, $options: 'i' } },
        { phone: { $regex: attendanceId, $options: 'i' } }
      ],
      isActive: true
    })
      .populate('currentPlan.planId', 'name type duration sessions')
      .select('firstName lastName phone memberId attendanceId profilePicture membershipStatus currentPlan');

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get active services for a member
export const getMemberActiveServices = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    }).populate('currentPlan.planId');

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const activeServices = [];

    // Add current plan if active
    if (member.currentPlan && member.currentPlan.planId) {
      const plan = member.currentPlan.planId;
      const now = new Date();
      const endDate = member.currentPlan.endDate ? new Date(member.currentPlan.endDate) : null;
      
      if (member.membershipStatus === 'active' && (!endDate || endDate >= now)) {
        activeServices.push({
          serviceId: plan._id,
          serviceName: plan.name || member.currentPlan.planName,
          serviceVariationName: member.currentPlan.planName || plan.name,
          startDate: member.currentPlan.startDate,
          endDate: member.currentPlan.endDate,
          duration: plan.duration ? `${plan.duration.value} ${plan.duration.unit}` : null,
          sessions: member.currentPlan.sessions,
          status: member.membershipStatus
        });
      }
    }

    // Get active services from paid invoices
    const activeInvoices = await Invoice.find({
      memberId: member._id,
      organizationId: req.organizationId,
      status: { $in: ['paid', 'partial'] }
    })
      .populate('planId', 'name type duration sessions')
      .populate('items.serviceId', 'name');

    activeInvoices.forEach(invoice => {
      invoice.items.forEach(item => {
        if (item.serviceId && item.startDate && item.expiryDate) {
          const now = new Date();
          const expiryDate = new Date(item.expiryDate);
          
          if (expiryDate >= now) {
            // Check if not already added
            const exists = activeServices.some(s => 
              s.serviceId.toString() === item.serviceId._id.toString()
            );
            
            if (!exists) {
              activeServices.push({
                serviceId: item.serviceId._id,
                serviceName: item.serviceId.name,
                serviceVariationName: item.description || item.serviceId.name,
                startDate: item.startDate,
                endDate: item.expiryDate,
                duration: item.duration,
                sessions: item.numberOfSessions ? {
                  total: item.numberOfSessions,
                  used: 0,
                  remaining: item.numberOfSessions
                } : null,
                status: 'active'
              });
            }
          }
        }
      });
    });

    res.json({ success: true, services: activeServices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manual attendance update
export const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { checkInTime, checkOutTime, status, notes, allowManualOverride = true } = req.body;

    if (!allowManualOverride) {
      return res.status(403).json({ 
        success: false, 
        message: 'Manual override not allowed' 
      });
    }

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      organizationId: req.organizationId
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    if (checkInTime) attendance.checkInTime = new Date(checkInTime);
    if (checkOutTime) attendance.checkOutTime = new Date(checkOutTime);
    if (status) attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;

    await attendance.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'attendance.updated',
      entityType: 'Attendance',
      entityId: attendance._id
    });

    const populated = await Attendance.findById(attendance._id)
      .populate('memberId', 'firstName lastName memberId phone profilePicture');

    res.json({ success: true, attendance: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fingerprint/ZKT punch endpoint
export const fingerprintCheckIn = async (req, res) => {
  try {
    const fingerprintId = getBiometricIdentifier(req.body);
    const deviceId = req.biometricDevice?.deviceId || getDeviceIdFromRequest(req);
    const deviceName = req.body.deviceName || req.body.device_name || req.biometricDevice?.deviceName;
    const punchTime = getPunchTime(req.body);

    if (!fingerprintId) {
      return res.status(400).json({ success: false, message: 'Fingerprint/user ID is required' });
    }

    const identifier = String(fingerprintId).trim();
    const member = await Member.findOne({
      organizationId: req.organizationId,
      isActive: true,
      $or: [
        { 'biometricData.fingerprint': identifier },
        { attendanceId: identifier },
        { memberId: identifier.toUpperCase() }
      ]
    }).populate('currentPlan.planId');

    if (!member) {
      return res.status(404).json({ 
        success: false, 
        message: 'Member not found for this fingerprint/user ID',
        status: 'not_found'
      });
    }

    const { status, blockedReason } = getMemberAccessStatus(member, punchTime);

    // If expired or blocked, deny access
    if (status !== 'success') {
      const attendance = await Attendance.create({
        organizationId: req.organizationId,
        branchId: req.biometricDevice?.branchId || member.branchId,
        memberId: member._id,
        checkInTime: punchTime,
        method: 'biometric',
        deviceId,
        deviceName,
        status,
        blockedReason,
        notes: 'Fingerprint check-in denied'
      });

      return res.json({
        success: false,
        status,
        message: blockedReason,
        attendance,
        member: {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          memberId: member.memberId
        }
      });
    }

    // Check if already checked in today
    const today = new Date(punchTime);
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const existingCheckIn = await Attendance.findOne({
      memberId: member._id,
      checkInTime: { $gte: today, $lte: endOfDay },
      checkOutTime: null
    });

    if (existingCheckIn) {
      return res.status(400).json({ 
        success: false, 
        message: 'Member already checked in today',
        attendance: existingCheckIn
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      organizationId: req.organizationId,
      branchId: req.biometricDevice?.branchId || member.branchId,
      memberId: member._id,
      checkInTime: punchTime,
      method: 'biometric',
      deviceId,
      deviceName,
      status: 'success',
      checkedInBy: null, // System/device check-in
      notes: 'Fingerprint check-in'
    });

    await updateMemberAttendanceStats(member, punchTime);

    const populated = await Attendance.findById(attendance._id)
      .populate('memberId', 'firstName lastName memberId phone profilePicture');

    res.json({
      success: true,
      status: 'success',
      message: 'Check-in successful',
      attendance: populated,
      member: {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        memberId: member.memberId,
        profilePicture: member.profilePicture
      },
      device: {
        deviceId,
        deviceName,
        branchId: req.biometricDevice?.branchId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Face recognition check-in endpoint (for device integration)
export const faceCheckIn = async (req, res) => {
  try {
    const { faceId, deviceId, deviceName } = req.body;

    if (!faceId) {
      return res.status(400).json({ success: false, message: 'Face ID is required' });
    }

    // Find member by face ID
    const member = await Member.findOne({
      organizationId: req.organizationId,
      'biometricData.faceId': faceId,
      isActive: true
    }).populate('currentPlan.planId');

    if (!member) {
      return res.status(404).json({ 
        success: false, 
        message: 'Member not found with this face ID',
        status: 'not_found'
      });
    }

    // Check membership status
    let status = 'success';
    let blockedReason = null;
    const now = new Date();

    // Check if membership is expired
    if (member.currentPlan && member.currentPlan.endDate) {
      const endDate = new Date(member.currentPlan.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (endDate < now) {
        status = 'expired';
        blockedReason = 'Membership has expired';
      }
    }

    if (member.membershipStatus === 'expired') {
      // Check time slot access for expired members
      const timeSlotValidation = validateTimeSlotAccess(member, now);
      if (!timeSlotValidation.allowed) {
        status = 'expired';
        blockedReason = timeSlotValidation.message;
      } else {
        // Expired member but within time slot - allow access
        status = 'success';
      }
    } else if (member.membershipStatus === 'frozen') {
      status = 'frozen';
      blockedReason = 'Membership is frozen';
    } else if (member.membershipStatus === 'cancelled') {
      status = 'blocked';
      blockedReason = 'Membership is cancelled';
    } else if (member.membershipStatus !== 'active') {
      status = 'blocked';
      blockedReason = 'Membership is not active';
    }

    // If expired or blocked, deny access
    if (status !== 'success') {
      const attendance = await Attendance.create({
        organizationId: req.organizationId,
        branchId: member.branchId,
        memberId: member._id,
        checkInTime: now,
        method: 'biometric',
        deviceId,
        deviceName,
        status,
        blockedReason,
        notes: 'Face recognition check-in denied'
      });

      return res.json({
        success: false,
        status,
        message: blockedReason,
        attendance,
        member: {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          memberId: member.memberId
        }
      });
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingCheckIn = await Attendance.findOne({
      memberId: member._id,
      checkInTime: { $gte: today },
      checkOutTime: null
    });

    if (existingCheckIn) {
      return res.status(400).json({ 
        success: false, 
        message: 'Member already checked in today',
        attendance: existingCheckIn
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      organizationId: req.organizationId,
      branchId: member.branchId,
      memberId: member._id,
      checkInTime: now,
      method: 'biometric',
      deviceId,
      deviceName,
      status: 'success',
      checkedInBy: null, // System/device check-in
      notes: 'Face recognition check-in'
    });

    // Update member stats
    member.attendanceStats.totalCheckIns += 1;
    member.attendanceStats.lastCheckIn = now;
    
    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const lastCheckIn = member.attendanceStats.lastCheckIn ? new Date(member.attendanceStats.lastCheckIn) : null;
    if (lastCheckIn) {
      lastCheckIn.setHours(0, 0, 0, 0);
      if (lastCheckIn.getTime() === yesterday.getTime()) {
        member.attendanceStats.currentStreak += 1;
      } else if (lastCheckIn.getTime() < yesterday.getTime()) {
        member.attendanceStats.currentStreak = 1;
      }
    } else {
      member.attendanceStats.currentStreak = 1;
    }

    if (member.attendanceStats.currentStreak > member.attendanceStats.longestStreak) {
      member.attendanceStats.longestStreak = member.attendanceStats.currentStreak;
    }

    await member.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: null, // System action
      action: 'attendance.checkin.biometric.face',
      entityType: 'Attendance',
      entityId: attendance._id
    });

    const populated = await Attendance.findById(attendance._id)
      .populate('memberId', 'firstName lastName memberId phone profilePicture');

    res.json({
      success: true,
      status: 'success',
      message: 'Check-in successful',
      attendance: populated,
      member: {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        memberId: member.memberId,
        profilePicture: member.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
