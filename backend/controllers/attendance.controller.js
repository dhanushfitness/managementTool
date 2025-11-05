import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';

export const checkIn = async (req, res) => {
  try {
    const { memberId, method, deviceId, deviceName, notes } = req.body;

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check membership status
    let status = 'success';
    let blockedReason = null;

    if (member.membershipStatus === 'expired') {
      status = 'expired';
      blockedReason = 'Membership has expired';
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

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingCheckIn = await Attendance.findOne({
      memberId: member._id,
      checkInTime: { $gte: today },
      checkOutTime: null
    });

    if (existingCheckIn && status === 'success') {
      return res.status(400).json({ 
        success: false, 
        message: 'Member already checked in today',
        attendance: existingCheckIn
      });
    }

    const attendance = await Attendance.create({
      organizationId: req.organizationId,
      branchId: member.branchId,
      memberId: member._id,
      checkInTime: new Date(),
      method: method || 'manual',
      deviceId,
      deviceName,
      status,
      blockedReason,
      checkedInBy: req.user._id,
      notes
    });

    // Update member stats if successful
    if (status === 'success') {
      member.attendanceStats.totalCheckIns += 1;
      member.attendanceStats.lastCheckIn = new Date();
      
      // Update streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const lastCheckIn = new Date(member.attendanceStats.lastCheckIn);
      lastCheckIn.setHours(0, 0, 0, 0);
      
      if (lastCheckIn.getTime() === yesterday.getTime()) {
        member.attendanceStats.currentStreak += 1;
      } else if (lastCheckIn.getTime() < yesterday.getTime()) {
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

    res.json({ 
      success: status === 'success', 
      attendance,
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

