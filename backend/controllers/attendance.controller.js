import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import Invoice from '../models/Invoice.js';
import Plan from '../models/Plan.js';
import AuditLog from '../models/AuditLog.js';

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

    // Check membership status
    let status = 'success';
    let blockedReason = null;

    // Check if membership is active and not expired
    const now = new Date();
    if (member.currentPlan && member.currentPlan.endDate) {
      const endDate = new Date(member.currentPlan.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (endDate < now && !allowManualOverride) {
        status = 'expired';
        blockedReason = 'Membership has expired';
      }
    }

    if (member.membershipStatus === 'expired' && !allowManualOverride) {
      // Check time slot access for expired members
      const timeSlotValidation = validateTimeSlotAccess(member, checkInDateTime);
      if (!timeSlotValidation.allowed) {
        status = 'expired';
        blockedReason = timeSlotValidation.message;
      } else {
        // Expired member but within time slot - allow access
        status = 'success';
      }
    } else if (member.membershipStatus === 'frozen' && !allowManualOverride) {
      status = 'frozen';
      blockedReason = 'Membership is frozen';
    } else if (member.membershipStatus === 'cancelled' && !allowManualOverride) {
      status = 'blocked';
      blockedReason = 'Membership is cancelled';
    } else if (member.membershipStatus !== 'active' && !allowManualOverride) {
      status = 'blocked';
      blockedReason = 'Membership is not active';
    }

    // Parse check-in date and time
    let checkInDateTime = new Date();
    if (checkInDate && checkInTime) {
      const [hours, minutes] = checkInTime.split(':');
      checkInDateTime = new Date(checkInDate);
      checkInDateTime.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    } else if (checkInDate) {
      checkInDateTime = new Date(checkInDate);
      checkInDateTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
    }

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

// Fingerprint check-in endpoint (for future device integration)
export const fingerprintCheckIn = async (req, res) => {
  try {
    const { fingerprintId, deviceId, deviceName } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({ success: false, message: 'Fingerprint ID is required' });
    }

    // Find member by fingerprint
    const member = await Member.findOne({
      organizationId: req.organizationId,
      'biometricData.fingerprint': fingerprintId,
      isActive: true
    }).populate('currentPlan.planId');

    if (!member) {
      return res.status(404).json({ 
        success: false, 
        message: 'Member not found with this fingerprint',
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
      notes: 'Fingerprint check-in'
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
      action: 'attendance.checkin.biometric',
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

