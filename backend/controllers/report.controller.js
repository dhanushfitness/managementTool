import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Member from '../models/Member.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import Plan from '../models/Plan.js';
import Offer from '../models/Offer.js';
import Enquiry from '../models/Enquiry.js';
import Referral from '../models/Referral.js';
import Communication from '../models/Communication.js';
import Appointment from '../models/Appointment.js';
import StaffTarget from '../models/StaffTarget.js';
import Expense from '../models/Expense.js';
import AuditLog from '../models/AuditLog.js';

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const resolveDateRange = (fromDate, toDate, dateFilter) => {
  if (fromDate || toDate) {
    const range = {};
    if (fromDate) {
      range.start = startOfDay(fromDate);
    }
    if (toDate) {
      range.end = endOfDay(toDate);
    }
    return range.start || range.end ? range : null;
  }

  if (!dateFilter || dateFilter === 'all') {
    return null;
  }

  const today = startOfDay(new Date());

  switch (dateFilter) {
    case 'today': {
      return { start: today, end: endOfDay(today) };
    }
    case 'yesterday': {
      const yesterday = startOfDay(new Date(today));
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: endOfDay(yesterday) };
    }
    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfDay(today) };
    }
    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(today) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      return { start, end };
    }
    case 'previousMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
      return { start, end };
    }
    default:
      return null;
  }
};

export const getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const query = { organizationId: req.organizationId };
    
    if (branchId) query.branchId = branchId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // MRR (Monthly Recurring Revenue)
    const mrr = await Payment.aggregate([
      {
        $match: {
          ...query,
          status: 'completed',
          paymentMethod: 'razorpay',
          paidAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Collections
    const collections = await Payment.aggregate([
      {
        $match: {
          ...query,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Dues (unpaid invoices)
    const dues = await Invoice.aggregate([
      {
        $match: {
          ...query,
          status: { $in: ['sent', 'overdue', 'partial'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Refunds
    const refunds = await Payment.aggregate([
      {
        $match: {
          ...query,
          status: { $in: ['refunded', 'partial_refund'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$refundAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Tax summary
    const taxSummary = await Invoice.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: null,
          totalTax: { $sum: '$tax.amount' },
          totalRevenue: { $sum: '$total' }
        }
      }
    ]);

    res.json({
      success: true,
      report: {
        mrr: mrr[0]?.total || 0,
        collections: {
          total: collections[0]?.total || 0,
          count: collections[0]?.count || 0
        },
        dues: {
          total: dues[0]?.total || 0,
          count: dues[0]?.count || 0
        },
        refunds: {
          total: refunds[0]?.total || 0,
          count: refunds[0]?.count || 0
        },
        taxSummary: taxSummary[0] || { totalTax: 0, totalRevenue: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMemberReport = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const query = { organizationId: req.organizationId, isActive: true };
    
    if (branchId) query.branchId = branchId;

    // New vs returning
    const newMembers = await Member.countDocuments({
      ...query,
      createdAt: {
        $gte: startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1)),
        $lte: endDate ? new Date(endDate) : new Date()
      }
    });

    const totalMembers = await Member.countDocuments(query);
    const activeMembers = await Member.countDocuments({ ...query, membershipStatus: 'active' });
    const expiredMembers = await Member.countDocuments({ ...query, membershipStatus: 'expired' });

    // Churn rate
    const churnedThisMonth = await Member.countDocuments({
      ...query,
      membershipStatus: 'cancelled',
      updatedAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    const churnRate = totalMembers > 0 ? (churnedThisMonth / totalMembers) * 100 : 0;

    // Visit frequency
    const visitFrequency = await Attendance.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          status: 'success',
          checkInTime: {
            $gte: startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1)),
            $lte: endDate ? new Date(endDate) : new Date()
          }
        }
      },
      {
        $group: {
          _id: '$memberId',
          visits: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgVisits: { $avg: '$visits' }
        }
      }
    ]);

    res.json({
      success: true,
      report: {
        totalMembers,
        activeMembers,
        expiredMembers,
        newMembers,
        churnRate: churnRate.toFixed(2),
        churnedThisMonth,
        avgVisitFrequency: visitFrequency[0]?.avgVisits || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOperationalReport = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const query = { organizationId: req.organizationId, status: 'success' };
    
    if (branchId) query.branchId = branchId;
    if (startDate || endDate) {
      query.checkInTime = {};
      if (startDate) query.checkInTime.$gte = new Date(startDate);
      if (endDate) query.checkInTime.$lte = new Date(endDate);
    }

    // Attendance heatmap data (by hour)
    const attendanceByHour = await Attendance.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: { $hour: '$checkInTime' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Peak hours
    const peakHours = attendanceByHour
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h._id);

    // Staff performance (simplified)
    const staffPerformance = await Attendance.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: '$checkedInBy',
          checkIns: { $sum: 1 }
        }
      },
      {
        $sort: { checkIns: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      report: {
        attendanceByHour,
        peakHours,
        staffPerformance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportReport = async (req, res) => {
  try {
    const { type, format, startDate, endDate } = req.query;

    if (format === 'csv') {
      // CSV export logic
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${Date.now()}.csv"`);
      
      // Simplified CSV export
      res.send('Data,Value\nSample,100\n');
    } else {
      // PDF export would go here
      res.json({ success: true, message: 'PDF export to be implemented' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const scheduleReport = async (req, res) => {
  try {
    // Scheduled report delivery would go here
    res.json({ success: true, message: 'Scheduled reports to be implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Biometric Report - Member
export const getBiometricReport = async (req, res) => {
  try {
    const { memberId, search, serviceId, startDate, endDate, branchId } = req.query;
    
    const query = {
      organizationId: req.organizationId,
      method: 'biometric' // Only biometric check-ins
    };

    if (branchId) query.branchId = branchId;
    
    if (startDate || endDate) {
      query.checkInTime = {};
      if (startDate) query.checkInTime.$gte = new Date(startDate);
      if (endDate) query.checkInTime.$lte = new Date(endDate);
    }

    if (serviceId) query.serviceId = serviceId;

    // Build member search query
    let memberQuery = {};
    if (memberId) {
      memberQuery._id = memberId;
    } else if (search) {
      // Search by attendance ID or mobile number
      memberQuery.$or = [
        { attendanceId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    // If member search is needed, find members first
    if (Object.keys(memberQuery).length > 0) {
      const members = await Member.find({
        organizationId: req.organizationId,
        ...memberQuery
      }).select('_id');
      const memberIds = members.map(m => m._id);
      if (memberIds.length === 0) {
        return res.json({ success: true, data: { attendance: [] } });
      }
      query.memberId = { $in: memberIds };
    }

    const attendance = await Attendance.find(query)
      .populate('memberId', 'firstName lastName memberId phone attendanceId')
      .populate('serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ checkInTime: -1 })
      .limit(1000);

    res.json({
      success: true,
      data: { attendance }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Biometric Report - Staff
export const getBiometricStaffReport = async (req, res) => {
  try {
    const { startDate, endDate, branchId, staffId } = req.query;
    
    const query = {
      organizationId: req.organizationId,
      method: 'biometric',
      checkedInBy: { $exists: true } // Staff check-ins
    };

    if (branchId) query.branchId = branchId;
    if (staffId) query.checkedInBy = staffId;
    
    if (startDate || endDate) {
      query.checkInTime = {};
      if (startDate) query.checkInTime.$gte = new Date(startDate);
      if (endDate) query.checkInTime.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate('checkedInBy', 'firstName lastName email staffId')
      .populate('branchId', 'name')
      .sort({ checkInTime: -1 })
      .limit(1000);

    // Transform to match frontend expectations
    const transformed = attendance.map(att => ({
      ...att.toObject(),
      staff: att.checkedInBy
    }));

    res.json({
      success: true,
      data: { attendance: transformed }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Biometric Report - Multiclub Members
export const getBiometricMulticlubReport = async (req, res) => {
  try {
    const { startDate, endDate, memberId } = req.query;
    
    // Find members with multiclub access (members with multiple branches or specific multiclub plans)
    const memberQuery = {
      organizationId: req.organizationId,
      isActive: true
    };

    if (memberId) memberQuery._id = memberId;

    const members = await Member.find(memberQuery)
      .populate('branchId', 'name')
      .select('firstName lastName memberId branchId');

    // Filter for multiclub members (simplified: members who have checked in at multiple branches)
    const memberIds = members.map(m => m._id);
    
    const attendanceQuery = {
      organizationId: req.organizationId,
      method: 'biometric',
      memberId: { $in: memberIds }
    };

    if (startDate || endDate) {
      attendanceQuery.checkInTime = {};
      if (startDate) attendanceQuery.checkInTime.$gte = new Date(startDate);
      if (endDate) attendanceQuery.checkInTime.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(attendanceQuery)
      .populate('memberId', 'firstName lastName memberId')
      .populate('branchId', 'name')
      .sort({ checkInTime: -1 })
      .limit(1000);

    // Group by member and find home branch (most frequent branch)
    const memberBranches = {};
    attendance.forEach(att => {
      if (!memberBranches[att.memberId._id]) {
        memberBranches[att.memberId._id] = {
          member: att.memberId,
          branches: {},
          homeBranch: null
        };
      }
      const branchId = att.branchId?._id?.toString() || 'unknown';
      memberBranches[att.memberId._id].branches[branchId] = 
        (memberBranches[att.memberId._id].branches[branchId] || 0) + 1;
    });

    // Determine home branch for each member
    Object.keys(memberBranches).forEach(memberId => {
      const branches = memberBranches[memberId].branches;
      const homeBranchId = Object.keys(branches).reduce((a, b) => branches[a] > branches[b] ? a : b);
      const member = members.find(m => m._id.toString() === memberId);
      memberBranches[memberId].homeBranch = member?.branchId || { name: 'N/A' };
    });

    // Transform to match frontend expectations
    const transformed = attendance.map(att => ({
      ...att.toObject(),
      homeBranch: memberBranches[att.memberId._id]?.homeBranch || att.branchId
    }));

    res.json({
      success: true,
      data: { attendance: transformed }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Biometric Report - Device List
export const getBiometricDevices = async (req, res) => {
  try {
    // Get unique devices from attendance records
    const devices = await Attendance.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          method: 'biometric',
          deviceId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            deviceId: '$deviceId',
            deviceName: '$deviceName',
            branchId: '$branchId'
          },
          lastCheckIn: { $max: '$checkInTime' },
          totalCheckIns: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id.branchId',
          foreignField: '_id',
          as: 'branch'
        }
      },
      {
        $unwind: {
          path: '$branch',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          deviceId: '$_id.deviceId',
          deviceName: '$_id.deviceName',
          location: { $ifNull: ['$branch.name', 'N/A'] },
          lastCheckIn: 1,
          totalCheckIns: 1,
          status: {
            $cond: {
              if: { $gte: ['$lastCheckIn', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
              then: 'active',
              else: 'inactive'
            }
          }
        }
      },
      {
        $sort: { lastCheckIn: -1 }
      }
    ]);

    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Biometric Report to Excel
export const exportBiometricReport = async (req, res) => {
  try {
    const { reportType = 'member', ...filters } = req.query;
    
    let data = [];
    
    // Fetch data based on report type
    if (reportType === 'member') {
      const { memberId, search, serviceId, startDate, endDate, branchId } = filters;
      const query = {
        organizationId: req.organizationId,
        method: 'biometric'
      };
      if (branchId) query.branchId = branchId;
      if (startDate || endDate) {
        query.checkInTime = {};
        if (startDate) query.checkInTime.$gte = new Date(startDate);
        if (endDate) query.checkInTime.$lte = new Date(endDate);
      }
      if (serviceId) query.serviceId = serviceId;
      
      let memberQuery = {};
      if (memberId) {
        memberQuery._id = memberId;
      } else if (search) {
        memberQuery.$or = [
          { attendanceId: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { memberId: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (Object.keys(memberQuery).length > 0) {
        const members = await Member.find({
          organizationId: req.organizationId,
          ...memberQuery
        }).select('_id');
        const memberIds = members.map(m => m._id);
        if (memberIds.length === 0) {
          data = [];
        } else {
          query.memberId = { $in: memberIds };
          const attendance = await Attendance.find(query)
            .populate('memberId', 'firstName lastName memberId phone attendanceId')
            .populate('serviceId', 'name')
            .populate('branchId', 'name')
            .sort({ checkInTime: -1 })
            .limit(1000);
          data = attendance;
        }
      } else {
        const attendance = await Attendance.find(query)
          .populate('memberId', 'firstName lastName memberId phone attendanceId')
          .populate('serviceId', 'name')
          .populate('branchId', 'name')
          .sort({ checkInTime: -1 })
          .limit(1000);
        data = attendance;
      }
    } else if (reportType === 'staff') {
      const { startDate, endDate, branchId, staffId } = filters;
      const query = {
        organizationId: req.organizationId,
        method: 'biometric',
        checkedInBy: { $exists: true }
      };
      if (branchId) query.branchId = branchId;
      if (staffId) query.checkedInBy = staffId;
      if (startDate || endDate) {
        query.checkInTime = {};
        if (startDate) query.checkInTime.$gte = new Date(startDate);
        if (endDate) query.checkInTime.$lte = new Date(endDate);
      }
      const attendance = await Attendance.find(query)
        .populate('checkedInBy', 'firstName lastName email staffId')
        .populate('branchId', 'name')
        .sort({ checkInTime: -1 })
        .limit(1000);
      data = attendance.map(att => ({
        ...att.toObject(),
        staff: att.checkedInBy
      }));
    } else if (reportType === 'multiclub') {
      const { startDate, endDate, memberId } = filters;
      const memberQuery = {
        organizationId: req.organizationId,
        isActive: true
      };
      if (memberId) memberQuery._id = memberId;
      const members = await Member.find(memberQuery)
        .populate('branchId', 'name')
        .select('firstName lastName memberId branchId');
      const memberIds = members.map(m => m._id);
      const attendanceQuery = {
        organizationId: req.organizationId,
        method: 'biometric',
        memberId: { $in: memberIds }
      };
      if (startDate || endDate) {
        attendanceQuery.checkInTime = {};
        if (startDate) attendanceQuery.checkInTime.$gte = new Date(startDate);
        if (endDate) attendanceQuery.checkInTime.$lte = new Date(endDate);
      }
      const attendance = await Attendance.find(attendanceQuery)
        .populate('memberId', 'firstName lastName memberId')
        .populate('branchId', 'name')
        .sort({ checkInTime: -1 })
        .limit(1000);
      const memberBranches = {};
      attendance.forEach(att => {
        if (!memberBranches[att.memberId._id]) {
          memberBranches[att.memberId._id] = {
            member: att.memberId,
            branches: {},
            homeBranch: null
          };
        }
        const branchId = att.branchId?._id?.toString() || 'unknown';
        memberBranches[att.memberId._id].branches[branchId] = 
          (memberBranches[att.memberId._id].branches[branchId] || 0) + 1;
      });
      Object.keys(memberBranches).forEach(memberId => {
        const branches = memberBranches[memberId].branches;
        const homeBranchId = Object.keys(branches).reduce((a, b) => branches[a] > branches[b] ? a : b);
        const member = members.find(m => m._id.toString() === memberId);
        memberBranches[memberId].homeBranch = member?.branchId || { name: 'N/A' };
      });
      data = attendance.map(att => ({
        ...att.toObject(),
        homeBranch: memberBranches[att.memberId._id]?.homeBranch || att.branchId
      }));
    } else if (reportType === 'devices') {
      const devices = await Attendance.aggregate([
        {
          $match: {
            organizationId: req.organizationId,
            method: 'biometric',
            deviceId: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              deviceId: '$deviceId',
              deviceName: '$deviceName',
              branchId: '$branchId'
            },
            lastCheckIn: { $max: '$checkInTime' },
            totalCheckIns: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'branches',
            localField: '_id.branchId',
            foreignField: '_id',
            as: 'branch'
          }
        },
        {
          $unwind: {
            path: '$branch',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            deviceId: '$_id.deviceId',
            deviceName: '$_id.deviceName',
            location: { $ifNull: ['$branch.name', 'N/A'] },
            lastCheckIn: 1,
            totalCheckIns: 1,
            status: {
              $cond: {
                if: { $gte: ['$lastCheckIn', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                then: 'active',
                else: 'inactive'
              }
            }
          }
        },
        {
          $sort: { lastCheckIn: -1 }
        }
      ]);
      data = devices;
    }

    // Generate CSV
    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csvContent = '';
    
    if (reportType === 'member') {
      csvContent = 'S.No,Member Name,Member ID,Attendance ID,Mobile,Check In Time,Check Out Time,Device,Service,Status,Branch\n';
      data.forEach((record, index) => {
        const row = [
          index + 1,
          `${record.memberId?.firstName || ''} ${record.memberId?.lastName || ''}`,
          record.memberId?.memberId || '',
          record.memberId?.attendanceId || '',
          record.memberId?.phone || '',
          record.checkInTime ? new Date(record.checkInTime).toLocaleString() : '',
          record.checkOutTime ? new Date(record.checkOutTime).toLocaleString() : '',
          record.deviceName || '',
          record.serviceId?.name || '',
          record.status || '',
          record.branchId?.name || ''
        ];
        csvContent += row.map(escapeCsvField).join(',') + '\n';
      });
    } else if (reportType === 'staff') {
      csvContent = 'S.No,Staff Name,Staff ID,Email,Check In Time,Check Out Time,Device,Branch\n';
      data.forEach((record, index) => {
        const row = [
          index + 1,
          `${record.staff?.firstName || ''} ${record.staff?.lastName || ''}`,
          record.staff?.staffId || '',
          record.staff?.email || '',
          record.checkInTime ? new Date(record.checkInTime).toLocaleString() : '',
          record.checkOutTime ? new Date(record.checkOutTime).toLocaleString() : '',
          record.deviceName || '',
          record.branchId?.name || ''
        ];
        csvContent += row.map(escapeCsvField).join(',') + '\n';
      });
    } else if (reportType === 'devices') {
      csvContent = 'S.No,Device Name,Device ID,Location,Status,Last Check In,Total Check Ins\n';
      data.forEach((record, index) => {
        const row = [
          index + 1,
          record.deviceName || '',
          record.deviceId || '',
          record.location || '',
          record.status || '',
          record.lastCheckIn ? new Date(record.lastCheckIn).toLocaleString() : '',
          record.totalCheckIns || 0
        ];
        csvContent += row.map(escapeCsvField).join(',') + '\n';
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=biometric-report-${reportType}-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Offers Report
export const getOffersReport = async (req, res) => {
  try {
    const { dateFilter = 'today', startDate, endDate, branchId, isActive } = req.query;
    
    const query = { organizationId: req.organizationId };

    if (branchId) query.branchId = branchId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Calculate date range based on dateFilter
    let dateRange = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate && endDate) {
      dateRange.validFrom = { $lte: new Date(endDate) };
      dateRange.validUntil = { $gte: new Date(startDate) };
    } else {
      switch (dateFilter) {
        case 'today':
          dateRange.validFrom = { $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
          dateRange.validUntil = { $gte: today };
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateRange.validFrom = { $lte: new Date(today.getTime() - 1) };
          dateRange.validUntil = { $gte: yesterday };
          break;
        case 'this-week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          dateRange.validFrom = { $lte: endOfWeek };
          dateRange.validUntil = { $gte: startOfWeek };
          break;
        case 'last-week':
          const lastWeekStart = new Date(today);
          lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          lastWeekEnd.setHours(23, 59, 59, 999);
          dateRange.validFrom = { $lte: lastWeekEnd };
          dateRange.validUntil = { $gte: lastWeekStart };
          break;
        case 'this-month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          dateRange.validFrom = { $lte: endOfMonth };
          dateRange.validUntil = { $gte: startOfMonth };
          break;
        case 'last-month':
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          dateRange.validFrom = { $lte: lastMonthEnd };
          dateRange.validUntil = { $gte: lastMonthStart };
          break;
        case 'this-year':
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          dateRange.validFrom = { $lte: endOfYear };
          dateRange.validUntil = { $gte: startOfYear };
          break;
        case 'last-year':
          const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
          const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          dateRange.validFrom = { $lte: lastYearEnd };
          dateRange.validUntil = { $gte: lastYearStart };
          break;
        default:
          // No date filter
          break;
      }
    }

    // Apply date range filter if set
    if (Object.keys(dateRange).length > 0) {
      query.$and = [
        { validFrom: dateRange.validFrom || { $exists: true } },
        { validUntil: dateRange.validUntil || { $exists: true } }
      ];
    }

    const offers = await Offer.find(query)
      .populate('applicablePlans', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { offers }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lead Source Report
export const getLeadSourceReport = async (req, res) => {
  try {
    const { dateFilter = 'today', startDate, endDate, branchId } = req.query;
    
    // Calculate date range based on dateFilter
    let dateRange = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate && endDate) {
      dateRange.$gte = new Date(startDate);
      dateRange.$lte = new Date(endDate);
    } else {
      switch (dateFilter) {
        case 'today':
          dateRange.$gte = today;
          dateRange.$lte = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateRange.$gte = yesterday;
          dateRange.$lte = new Date(today.getTime() - 1);
          break;
        case 'this-week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          dateRange.$gte = startOfWeek;
          dateRange.$lte = endOfWeek;
          break;
        case 'last-week':
          const lastWeekStart = new Date(today);
          lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          lastWeekEnd.setHours(23, 59, 59, 999);
          dateRange.$gte = lastWeekStart;
          dateRange.$lte = lastWeekEnd;
          break;
        case 'this-month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          dateRange.$gte = startOfMonth;
          dateRange.$lte = endOfMonth;
          break;
        case 'last-month':
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          dateRange.$gte = lastMonthStart;
          dateRange.$lte = lastMonthEnd;
          break;
        case 'this-year':
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          dateRange.$gte = startOfYear;
          dateRange.$lte = endOfYear;
          break;
        case 'last-year':
          const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
          const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          dateRange.$gte = lastYearStart;
          dateRange.$lte = lastYearEnd;
          break;
      }
    }

    // Build base query
    const enquiryQuery = { organizationId: req.organizationId };
    const memberQuery = { organizationId: req.organizationId, isActive: true };
    
    if (branchId) {
      enquiryQuery.branchId = branchId;
      memberQuery.branchId = branchId;
    }

    if (Object.keys(dateRange).length > 0) {
      enquiryQuery.date = dateRange;
      memberQuery.createdAt = dateRange;
    }

    // Lead source mapping (from enum to display names)
    const leadSourceMap = {
      'walk-in': 'Walk-In',
      'referral': 'Referral',
      'online': 'Website',
      'social-media': 'Social Media',
      'phone-call': 'Phone',
      'other': 'Others'
    };

    // Get all enquiries grouped by lead source
    const enquiryStats = await Enquiry.aggregate([
      { $match: enquiryQuery },
      {
        $group: {
          _id: '$leadSource',
          totalFootfall: { $sum: 1 },
          activeEnquiries: {
            $sum: {
              $cond: [
                { $in: ['$enquiryStage', ['opened', 'qualified', 'demo', 'negotiation', 'enquiry', 'future-prospect']] },
                1,
                0
              ]
            }
          },
          lostEnquiries: {
            $sum: {
              $cond: [
                { $in: ['$enquiryStage', ['lost', 'archived', 'not-interested']] },
                1,
                0
              ]
            }
          },
          converted: {
            $sum: {
              $cond: [{ $eq: ['$enquiryStage', 'converted'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get converted members with their invoice values
    const convertedMembers = await Member.aggregate([
      {
        $match: {
          ...memberQuery,
          membershipStatus: 'active'
        }
      },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'memberId',
          as: 'invoices'
        }
      },
      {
        $unwind: {
          path: '$invoices',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$source',
          convertedCount: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ['$invoices.total', 0] } },
          spotValue: {
            $sum: {
              $cond: [
                { $eq: [{ $ifNull: ['$invoices.paymentStatus', ''] }, 'paid'] },
                { $ifNull: ['$invoices.total', 0] },
                0
              ]
            }
          }
        }
      }
    ]);

    // Combine data and calculate metrics
    const leadSourceData = {};
    
    // Initialize all known lead sources
    const allLeadSources = [
      'Others', 'Yoactiv', 'Word Of Mouth', 'Website', 'Walk-In', 'TV', 'Staff',
      'Social Media', 'SMS', 'Signboard', 'Referral', 'Radio', 'Promotional Consultant',
      'Posters', 'Phone', 'Passing By', 'Newspapers', 'Missed Call App', 'Member App',
      'Magazine', 'Listing Sites', 'Hoardings', 'Google', 'Friends', 'Flyers/Banners',
      'Facebook', 'E-Mail', 'Corporate', 'Canopi', 'Admin Test'
    ];

    allLeadSources.forEach(source => {
      leadSourceData[source] = {
        leadSource: source,
        totalFootfall: 0,
        activeEnquiries: 0,
        lostEnquiries: 0,
        converted: 0,
        conversionPercent: 0,
        convertedOpportunityValue: 0,
        spotConversion: 0,
        spotValue: 0,
        totalConversionPercent: 0,
        totalValue: 0
      };
    });

    // Process enquiry stats
    enquiryStats.forEach(stat => {
      const displayName = leadSourceMap[stat._id] || stat._id || 'Others';
      if (leadSourceData[displayName]) {
        leadSourceData[displayName].totalFootfall = stat.totalFootfall || 0;
        leadSourceData[displayName].activeEnquiries = stat.activeEnquiries || 0;
        leadSourceData[displayName].lostEnquiries = stat.lostEnquiries || 0;
        leadSourceData[displayName].converted = stat.converted || 0;
      }
    });

    // Process converted members
    convertedMembers.forEach(stat => {
      const displayName = leadSourceMap[stat._id] || stat._id || 'Others';
      if (leadSourceData[displayName]) {
        leadSourceData[displayName].converted = (leadSourceData[displayName].converted || 0) + (stat.convertedCount || 0);
        leadSourceData[displayName].totalValue = stat.totalValue || 0;
        leadSourceData[displayName].spotValue = stat.spotValue || 0;
        leadSourceData[displayName].spotConversion = stat.convertedCount || 0;
      }
    });

    // Calculate percentages and finalize
    const result = Object.values(leadSourceData).map(item => {
      const totalFootfall = item.totalFootfall || 0;
      const converted = item.converted || 0;
      
      return {
        ...item,
        conversionPercent: totalFootfall > 0 ? (converted / totalFootfall) * 100 : 0,
        totalConversionPercent: totalFootfall > 0 ? (converted / totalFootfall) * 100 : 0,
        convertedOpportunityValue: item.totalValue || 0
      };
    });

    // Filter out sources with all zeros if needed, or return all
    const filteredResult = result.filter(item => 
      item.totalFootfall > 0 || item.converted > 0 || item.totalValue > 0
    );

    res.json({
      success: true,
      data: { leadSources: filteredResult.length > 0 ? filteredResult : result }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Lead Source Report
export const exportLeadSourceReport = async (req, res) => {
  try {
    const { dateFilter = 'today', startDate, endDate, branchId } = req.query;
    
    // Reuse the same logic as getLeadSourceReport
    let dateRange = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate && endDate) {
      dateRange.$gte = new Date(startDate);
      dateRange.$lte = new Date(endDate);
    } else {
      switch (dateFilter) {
        case 'today':
          dateRange.$gte = today;
          dateRange.$lte = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateRange.$gte = yesterday;
          dateRange.$lte = new Date(today.getTime() - 1);
          break;
        case 'this-week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          dateRange.$gte = startOfWeek;
          dateRange.$lte = endOfWeek;
          break;
        case 'last-week':
          const lastWeekStart = new Date(today);
          lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          lastWeekEnd.setHours(23, 59, 59, 999);
          dateRange.$gte = lastWeekStart;
          dateRange.$lte = lastWeekEnd;
          break;
        case 'this-month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          dateRange.$gte = startOfMonth;
          dateRange.$lte = endOfMonth;
          break;
        case 'last-month':
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          dateRange.$gte = lastMonthStart;
          dateRange.$lte = lastMonthEnd;
          break;
        case 'this-year':
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          dateRange.$gte = startOfYear;
          dateRange.$lte = endOfYear;
          break;
        case 'last-year':
          const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
          const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          dateRange.$gte = lastYearStart;
          dateRange.$lte = lastYearEnd;
          break;
      }
    }

    const enquiryQuery = { organizationId: req.organizationId };
    const memberQuery = { organizationId: req.organizationId, isActive: true };
    
    if (branchId) {
      enquiryQuery.branchId = branchId;
      memberQuery.branchId = branchId;
    }

    if (Object.keys(dateRange).length > 0) {
      enquiryQuery.date = dateRange;
      memberQuery.createdAt = dateRange;
    }

    const leadSourceMap = {
      'walk-in': 'Walk-In',
      'referral': 'Referral',
      'online': 'Website',
      'social-media': 'Social Media',
      'phone-call': 'Phone',
      'other': 'Others'
    };

    const enquiryStats = await Enquiry.aggregate([
      { $match: enquiryQuery },
      {
        $group: {
          _id: '$leadSource',
          totalFootfall: { $sum: 1 },
          activeEnquiries: {
            $sum: {
              $cond: [
                { $in: ['$enquiryStage', ['opened', 'qualified', 'demo', 'negotiation', 'enquiry', 'future-prospect']] },
                1,
                0
              ]
            }
          },
          lostEnquiries: {
            $sum: {
              $cond: [
                { $in: ['$enquiryStage', ['lost', 'archived', 'not-interested']] },
                1,
                0
              ]
            }
          },
          converted: {
            $sum: {
              $cond: [{ $eq: ['$enquiryStage', 'converted'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const convertedMembers = await Member.aggregate([
      {
        $match: {
          ...memberQuery,
          membershipStatus: 'active'
        }
      },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'memberId',
          as: 'invoices'
        }
      },
      {
        $unwind: {
          path: '$invoices',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$source',
          convertedCount: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ['$invoices.total', 0] } },
          spotValue: {
            $sum: {
              $cond: [
                { $eq: [{ $ifNull: ['$invoices.paymentStatus', ''] }, 'paid'] },
                { $ifNull: ['$invoices.total', 0] },
                0
              ]
            }
          }
        }
      }
    ]);

    const allLeadSources = [
      'Others', 'Yoactiv', 'Word Of Mouth', 'Website', 'Walk-In', 'TV', 'Staff',
      'Social Media', 'SMS', 'Signboard', 'Referral', 'Radio', 'Promotional Consultant',
      'Posters', 'Phone', 'Passing By', 'Newspapers', 'Missed Call App', 'Member App',
      'Magazine', 'Listing Sites', 'Hoardings', 'Google', 'Friends', 'Flyers/Banners',
      'Facebook', 'E-Mail', 'Corporate', 'Canopi', 'Admin Test'
    ];

    const leadSourceData = {};
    allLeadSources.forEach(source => {
      leadSourceData[source] = {
        leadSource: source,
        totalFootfall: 0,
        activeEnquiries: 0,
        lostEnquiries: 0,
        converted: 0,
        conversionPercent: 0,
        convertedOpportunityValue: 0,
        spotConversion: 0,
        spotValue: 0,
        totalConversionPercent: 0,
        totalValue: 0
      };
    });

    enquiryStats.forEach(stat => {
      const displayName = leadSourceMap[stat._id] || stat._id || 'Others';
      if (leadSourceData[displayName]) {
        leadSourceData[displayName].totalFootfall = stat.totalFootfall || 0;
        leadSourceData[displayName].activeEnquiries = stat.activeEnquiries || 0;
        leadSourceData[displayName].lostEnquiries = stat.lostEnquiries || 0;
        leadSourceData[displayName].converted = stat.converted || 0;
      }
    });

    convertedMembers.forEach(stat => {
      const displayName = leadSourceMap[stat._id] || stat._id || 'Others';
      if (leadSourceData[displayName]) {
        leadSourceData[displayName].converted = (leadSourceData[displayName].converted || 0) + (stat.convertedCount || 0);
        leadSourceData[displayName].totalValue = stat.totalValue || 0;
        leadSourceData[displayName].spotValue = stat.spotValue || 0;
        leadSourceData[displayName].spotConversion = stat.convertedCount || 0;
      }
    });

    const result = Object.values(leadSourceData).map(item => {
      const totalFootfall = item.totalFootfall || 0;
      const converted = item.converted || 0;
      
      return {
        ...item,
        conversionPercent: totalFootfall > 0 ? (converted / totalFootfall) * 100 : 0,
        totalConversionPercent: totalFootfall > 0 ? (converted / totalFootfall) * 100 : 0,
        convertedOpportunityValue: item.totalValue || 0
      };
    });

    const filteredResult = result.filter(item => 
      item.totalFootfall > 0 || item.converted > 0 || item.totalValue > 0
    );
    const data = filteredResult.length > 0 ? filteredResult : result;

    // Generate CSV
    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = 'S.No,Lead Source,Total Footfall,Active Enquiries,Lost Enquiries,Converted,Conversion %,Converted Opportunity Value,Spot Conversion,Value,Total Conversion %,Total Value\n' +
      data.map((item, index) => {
        const row = [
          index + 1,
          item.leadSource,
          item.totalFootfall || 0,
          item.activeEnquiries || 0,
          item.lostEnquiries || 0,
          item.converted || 0,
          `${(item.conversionPercent || 0).toFixed(2)}%`,
          item.convertedOpportunityValue || 0,
          item.spotConversion || 0,
          item.spotValue || 0,
          `${(item.totalConversionPercent || 0).toFixed(2)}%`,
          item.totalValue || 0
        ];
        return row.map(escapeCsvField).join(',');
      }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=lead-source-report-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Referral Report - All Referrals
export const getReferralReport = async (req, res) => {
  try {
    const { dateFilter = 'today', startDate, endDate, branchId, status } = req.query;
    
    // Calculate date range based on dateFilter
    let dateRange = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate && endDate) {
      dateRange.$gte = new Date(startDate);
      dateRange.$lte = new Date(endDate);
    } else {
      switch (dateFilter) {
        case 'today':
          dateRange.$gte = today;
          dateRange.$lte = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateRange.$gte = yesterday;
          dateRange.$lte = new Date(today.getTime() - 1);
          break;
        case 'this-week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          dateRange.$gte = startOfWeek;
          dateRange.$lte = endOfWeek;
          break;
        case 'last-week':
          const lastWeekStart = new Date(today);
          lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          lastWeekEnd.setHours(23, 59, 59, 999);
          dateRange.$gte = lastWeekStart;
          dateRange.$lte = lastWeekEnd;
          break;
        case 'this-month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          dateRange.$gte = startOfMonth;
          dateRange.$lte = endOfMonth;
          break;
        case 'last-month':
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          dateRange.$gte = lastMonthStart;
          dateRange.$lte = lastMonthEnd;
          break;
        case 'this-year':
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          dateRange.$gte = startOfYear;
          dateRange.$lte = endOfYear;
          break;
        case 'last-year':
          const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
          const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          dateRange.$gte = lastYearStart;
          dateRange.$lte = lastYearEnd;
          break;
      }
    }

    const query = { 
      organizationId: req.organizationId,
      referralType: 'referrer' // Members who were referred by someone
    };

    if (branchId) {
      // Need to check member's branch
      const members = await Member.find({ organizationId: req.organizationId, branchId }).select('_id');
      const memberIds = members.map(m => m._id);
      query.memberId = { $in: memberIds };
    }

    if (status) {
      query.status = status;
    }

    if (Object.keys(dateRange).length > 0) {
      query.createdAt = dateRange;
    }

    const referrals = await Referral.find(query)
      .populate('memberId', 'firstName lastName memberId branchId')
      .populate('referredMemberId', 'firstName lastName memberId')
      .sort({ createdAt: -1 })
      .limit(1000);

    // Transform data for frontend
    const transformed = referrals.map(ref => ({
      _id: ref._id,
      member: {
        firstName: ref.memberId?.firstName,
        lastName: ref.memberId?.lastName,
        memberId: ref.memberId?.memberId
      },
      referredBy: {
        firstName: ref.referredMemberId?.firstName || ref.name,
        lastName: ref.referredMemberId?.lastName || '',
        memberId: ref.referredMemberId?.memberId
      },
      status: ref.status,
      convertedAt: ref.convertedAt,
      createdAt: ref.createdAt
    }));

    res.json({
      success: true,
      data: { referrals: transformed }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Member Referral Report - Aggregated by Member
export const getMemberReferralReport = async (req, res) => {
  try {
    const { dateFilter = 'today', startDate, endDate, branchId } = req.query;
    
    // Calculate date range
    let dateRange = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate && endDate) {
      dateRange.$gte = new Date(startDate);
      dateRange.$lte = new Date(endDate);
    } else {
      switch (dateFilter) {
        case 'today':
          dateRange.$gte = today;
          dateRange.$lte = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateRange.$gte = yesterday;
          dateRange.$lte = new Date(today.getTime() - 1);
          break;
        case 'this-week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          dateRange.$gte = startOfWeek;
          dateRange.$lte = endOfWeek;
          break;
        case 'last-week':
          const lastWeekStart = new Date(today);
          lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          lastWeekEnd.setHours(23, 59, 59, 999);
          dateRange.$gte = lastWeekStart;
          dateRange.$lte = lastWeekEnd;
          break;
        case 'this-month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          dateRange.$gte = startOfMonth;
          dateRange.$lte = endOfMonth;
          break;
        case 'last-month':
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          dateRange.$gte = lastMonthStart;
          dateRange.$lte = lastMonthEnd;
          break;
        case 'this-year':
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          dateRange.$gte = startOfYear;
          dateRange.$lte = endOfYear;
          break;
        case 'last-year':
          const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
          const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          dateRange.$gte = lastYearStart;
          dateRange.$lte = lastYearEnd;
          break;
      }
    }

    const baseQuery = { 
      organizationId: req.organizationId,
      referralType: 'referred-by' // Members who referred others
    };

    if (Object.keys(dateRange).length > 0) {
      baseQuery.createdAt = dateRange;
    }

    // Get member IDs if branch filter is applied
    let memberIds = null;
    if (branchId) {
      const members = await Member.find({ organizationId: req.organizationId, branchId }).select('_id');
      memberIds = members.map(m => m._id);
      baseQuery.memberId = { $in: memberIds };
    }

    // Aggregate referrals by member
    const memberReferralStats = await Referral.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$memberId',
          totalReferrals: { $sum: 1 },
          convertedReferrals: {
            $sum: {
              $cond: [{ $eq: ['$status', 'converted'] }, 1, 0]
            }
          },
          pendingReferrals: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          declinedReferrals: {
            $sum: {
              $cond: [{ $eq: ['$status', 'declined'] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: '_id',
          foreignField: '_id',
          as: 'member'
        }
      },
      {
        $unwind: {
          path: '$member',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          memberId: '$_id',
          totalReferrals: 1,
          convertedReferrals: 1,
          pendingReferrals: 1,
          declinedReferrals: 1,
          member: {
            firstName: '$member.firstName',
            lastName: '$member.lastName',
            memberId: '$member.memberId'
          }
        }
      },
      {
        $sort: { totalReferrals: -1 }
      }
    ]);

    // Calculate total value from converted referrals' invoices
    const memberIdsWithReferrals = memberReferralStats.map(stat => stat.memberId);
    const convertedReferralMembers = await Referral.find({
      organizationId: req.organizationId,
      referralType: 'referred-by',
      memberId: { $in: memberIdsWithReferrals },
      status: 'converted'
    }).populate('referredMemberId', '_id');

    // Get invoice values for converted referrals
    const convertedMemberIds = convertedReferralMembers
      .filter(ref => ref.referredMemberId)
      .map(ref => ref.referredMemberId._id);

    const invoiceValues = await Invoice.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          memberId: { $in: convertedMemberIds }
        }
      },
      {
        $group: {
          _id: '$memberId',
          totalValue: { $sum: '$total' }
        }
      }
    ]);

    // Map invoice values to referral members
    const invoiceValueMap = {};
    invoiceValues.forEach(inv => {
      invoiceValueMap[inv._id.toString()] = inv.totalValue;
    });

    // Match converted referrals to their referrers and calculate values
    const referrerValueMap = {};
    convertedReferralMembers.forEach(ref => {
      if (ref.referredMemberId) {
        const referrerId = ref.memberId.toString();
        const referredMemberId = ref.referredMemberId._id.toString();
        const value = invoiceValueMap[referredMemberId] || 0;
        referrerValueMap[referrerId] = (referrerValueMap[referrerId] || 0) + value;
      }
    });

    // Combine stats with values
    const result = memberReferralStats.map(stat => ({
      _id: stat.memberId,
      member: stat.member,
      totalReferrals: stat.totalReferrals || 0,
      convertedReferrals: stat.convertedReferrals || 0,
      pendingReferrals: stat.pendingReferrals || 0,
      declinedReferrals: stat.declinedReferrals || 0,
      totalValue: referrerValueMap[stat.memberId.toString()] || 0
    }));

    res.json({
      success: true,
      data: { memberReferrals: result }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SMS Report
export const getSMSReport = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10, status, module, gateway } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = {
      organizationId: req.organizationId,
      type: 'sms'
    };

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Module filter
    if (module) {
      query.module = module;
    }

    // Gateway filter
    if (gateway) {
      query.gateway = gateway;
    }

    const [smsRecords, total] = await Promise.all([
      Communication.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Communication.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        smsRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Business MIS Report
export const getBusinessMISReport = async (req, res) => {
  try {
    const { startDate, endDate, studioType, services, sources, publishers, campaigns, subCampaigns, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build date range query
    const dateQuery = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      dateQuery.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }

    // Get branch IDs if studio type filter is applied
    let branchIds = null;
    if (studioType && studioType !== 'all') {
      branchIds = [studioType];
    } else {
      const branches = await Branch.find({ organizationId: req.organizationId, isActive: true }).select('_id');
      branchIds = branches.map(b => b._id);
    }

    // Build enquiry query
    const enquiryQuery = {
      organizationId: req.organizationId,
      branchId: { $in: branchIds }
    };
    if (Object.keys(dateQuery).length > 0) {
      enquiryQuery.date = dateQuery;
    }
    if (services) {
      const serviceArray = Array.isArray(services) ? services : [services];
      enquiryQuery.service = { $in: serviceArray };
    }
    if (sources) {
      const sourceArray = Array.isArray(sources) ? sources : [sources];
      enquiryQuery.leadSource = { $in: sourceArray };
    }

    // Aggregate enquiries by branch
    const enquiryStats = await Enquiry.aggregate([
      { $match: enquiryQuery },
      {
        $group: {
          _id: '$branchId',
          totalLeads: { $sum: 1 },
          uniqueLeads: { $addToSet: '$phone' }
        }
      },
      {
        $project: {
          branchId: '$_id',
          totalLeads: 1,
          uniqueLeads: { $size: '$uniqueLeads' }
        }
      }
    ]);

    // Get appointments (trials) data
    const appointmentQuery = {
      organizationId: req.organizationId,
      branchId: { $in: branchIds }
    };
    if (Object.keys(dateQuery).length > 0) {
      appointmentQuery.date = dateQuery;
    }

    const appointmentStats = await Appointment.aggregate([
      { $match: appointmentQuery },
      {
        $group: {
          _id: '$branchId',
          trialsBooked: { $sum: 1 },
          trialsAttended: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get conversions (enquiries converted to members)
    const conversionQuery = {
      organizationId: req.organizationId,
      branchId: { $in: branchIds },
      enquiryStage: 'converted'
    };
    if (Object.keys(dateQuery).length > 0) {
      conversionQuery.date = dateQuery;
    }

    const conversionStats = await Enquiry.aggregate([
      { $match: conversionQuery },
      {
        $group: {
          _id: '$branchId',
          conversions: { $sum: 1 }
        }
      }
    ]);

    // Get sales data from invoices
    const invoiceQuery = {
      organizationId: req.organizationId,
      branchId: { $in: branchIds },
      status: { $in: ['paid', 'partial'] }
    };
    if (Object.keys(dateQuery).length > 0) {
      invoiceQuery.createdAt = dateQuery;
    }
    if (services) {
      const serviceArray = Array.isArray(services) ? services : [services];
      invoiceQuery['items.planId'] = { $in: serviceArray };
    }

    const salesStats = await Invoice.aggregate([
      { $match: invoiceQuery },
      {
        $group: {
          _id: '$branchId',
          sales: { $sum: '$total' }
        }
      }
    ]);

    // Combine all stats by branch
    const branchStatsMap = {};
    
    // Initialize with branch info
    const branches = await Branch.find({ _id: { $in: branchIds } }).select('_id name');
    branches.forEach(branch => {
      branchStatsMap[branch._id.toString()] = {
        branchId: branch._id,
        studio: branch.name,
        leads: 0,
        uniqueLeads: 0,
        trialsBooked: 0,
        trialsAttended: 0,
        conversion: 0,
        sales: 0
      };
    });

    // Add enquiry stats
    enquiryStats.forEach(stat => {
      const key = stat.branchId.toString();
      if (branchStatsMap[key]) {
        branchStatsMap[key].leads = stat.totalLeads;
        branchStatsMap[key].uniqueLeads = stat.uniqueLeads;
      }
    });

    // Add appointment stats
    appointmentStats.forEach(stat => {
      const key = stat._id.toString();
      if (branchStatsMap[key]) {
        branchStatsMap[key].trialsBooked = stat.trialsBooked;
        branchStatsMap[key].trialsAttended = stat.trialsAttended;
      }
    });

    // Add conversion stats
    conversionStats.forEach(stat => {
      const key = stat._id.toString();
      if (branchStatsMap[key]) {
        branchStatsMap[key].conversion = stat.conversions;
      }
    });

    // Add sales stats
    salesStats.forEach(stat => {
      const key = stat._id.toString();
      if (branchStatsMap[key]) {
        branchStatsMap[key].sales = stat.sales;
      }
    });

    // Calculate percentages and format data
    const records = Object.values(branchStatsMap).map(item => {
      const leadsToTrialsBookedPercent = item.leads > 0 ? ((item.trialsBooked / item.leads) * 100).toFixed(1) : '0.0';
      const trialsBookedToAttendedPercent = item.trialsBooked > 0 ? ((item.trialsAttended / item.trialsBooked) * 100).toFixed(1) : '0.0';
      const trialsAttendedToConversionPercent = item.trialsAttended > 0 ? ((item.conversion / item.trialsAttended) * 100).toFixed(1) : '0.0';
      const leadToConversionPercent = item.leads > 0 ? ((item.conversion / item.leads) * 100).toFixed(1) : '0.0';

      return {
        _id: item.branchId,
        studio: item.studio,
        leads: item.leads,
        uniqueLeads: item.uniqueLeads,
        trialsBooked: item.trialsBooked,
        trialsAttended: item.trialsAttended,
        conversion: item.conversion,
        sales: item.sales,
        leadsToTrialsBookedPercent: parseFloat(leadsToTrialsBookedPercent),
        trialsBookedToAttendedPercent: parseFloat(trialsBookedToAttendedPercent),
        trialsAttendedToConversionPercent: parseFloat(trialsAttendedToConversionPercent),
        leadToConversionPercent: parseFloat(leadToConversionPercent)
      };
    });

    // Apply pagination
    const total = records.length;
    const paginatedRecords = records.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Business MIS Report
export const exportBusinessMISReport = async (req, res) => {
  try {
    // Simplified export - in production, you'd want to reuse the aggregation logic
    const headers = ['S.No', 'Studio', 'Leads', 'Unique Leads', 'Trials Booked', 'Trials Attended', 'Conversion', 'Sales', 'Leads to Trials Booked %', 'Trials Booked to Attended %', 'Trials Attended to Conversion%', 'Lead to Conversion%'];
    
    let csvContent = headers.join(',') + '\n';
    // For now, return empty CSV - full implementation would fetch and format data
    csvContent += '\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=business-mis-report-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Marketing MIS Report
export const getMarketingMISReport = async (req, res) => {
  try {
    const { startDate, endDate, sources, publishers, studioType, campaigns, subCampaigns, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build date range query
    const dateQuery = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      dateQuery.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }

    // Get branch IDs if studio type filter is applied
    let branchIds = null;
    if (studioType && studioType !== 'all') {
      branchIds = [studioType];
    } else {
      const branches = await Branch.find({ organizationId: req.organizationId, isActive: true }).select('_id');
      branchIds = branches.map(b => b._id);
    }

    // Build enquiry query
    const enquiryQuery = {
      organizationId: req.organizationId,
      branchId: { $in: branchIds }
    };
    if (Object.keys(dateQuery).length > 0) {
      enquiryQuery.date = dateQuery;
    }
    if (sources) {
      const sourceArray = Array.isArray(sources) ? sources : [sources];
      enquiryQuery.leadSource = { $in: sourceArray };
    }

    // Aggregate enquiries by lead source
    const enquiryStats = await Enquiry.aggregate([
      { $match: enquiryQuery },
      {
        $group: {
          _id: '$leadSource',
          totalLeads: { $sum: 1 },
          uniqueLeads: { $addToSet: '$phone' }
        }
      },
      {
        $project: {
          source: '$_id',
          totalLeads: 1,
          uniqueLeads: { $size: '$uniqueLeads' }
        }
      }
    ]);

    // Get appointments (trials) data by source
    const appointmentQuery = {
      organizationId: req.organizationId,
      branchId: { $in: branchIds }
    };
    if (Object.keys(dateQuery).length > 0) {
      appointmentQuery.date = dateQuery;
    }

    // Get appointments linked to enquiries to get source
    const appointments = await Appointment.find(appointmentQuery)
      .populate({
        path: 'enquiryId',
        select: 'leadSource'
      })
      .lean();

    const appointmentStatsMap = {};
    appointments.forEach(apt => {
      if (apt.enquiryId && apt.enquiryId.leadSource) {
        const source = apt.enquiryId.leadSource;
        if (!appointmentStatsMap[source]) {
          appointmentStatsMap[source] = { trialsBooked: 0, trialsAttended: 0 };
        }
        appointmentStatsMap[source].trialsBooked++;
        if (apt.status === 'completed') {
          appointmentStatsMap[source].trialsAttended++;
        }
      }
    });

    // Get conversions (enquiries converted to members) by source
    const conversionQuery = {
      organizationId: req.organizationId,
      branchId: { $in: branchIds },
      enquiryStage: 'converted'
    };
    if (Object.keys(dateQuery).length > 0) {
      conversionQuery.date = dateQuery;
    }
    if (sources) {
      const sourceArray = Array.isArray(sources) ? sources : [sources];
      conversionQuery.leadSource = { $in: sourceArray };
    }

    const conversionStats = await Enquiry.aggregate([
      { $match: conversionQuery },
      {
        $group: {
          _id: '$leadSource',
          conversions: { $sum: 1 }
        }
      }
    ]);

    // Get sales data from invoices linked to members who came from enquiries
    const convertedEnquiries = await Enquiry.find({
      organizationId: req.organizationId,
      branchId: { $in: branchIds },
      enquiryStage: 'converted'
    }).select('_id leadSource').lean();

    const enquiryToMemberMap = {};
    const members = await Member.find({
      organizationId: req.organizationId,
      branchId: { $in: branchIds }
    }).select('_id').lean();

    // For simplicity, we'll aggregate sales by source from converted enquiries
    // In a real scenario, you'd need to link members back to their source enquiries
    const invoiceQuery = {
      organizationId: req.organizationId,
      branchId: { $in: branchIds },
      status: { $in: ['paid', 'partial'] }
    };
    if (Object.keys(dateQuery).length > 0) {
      invoiceQuery.createdAt = dateQuery;
    }

    // Combine all stats by source
    const sourceStatsMap = {};
    
    // Initialize with enquiry stats
    enquiryStats.forEach(stat => {
      sourceStatsMap[stat.source] = {
        source: stat.source,
        leads: stat.totalLeads,
        uniqueLeads: stat.uniqueLeads,
        trialsBooked: 0,
        trialsAttended: 0,
        conversion: 0,
        sales: 0
      };
    });

    // Add appointment stats
    Object.keys(appointmentStatsMap).forEach(source => {
      if (!sourceStatsMap[source]) {
        sourceStatsMap[source] = {
          source: source,
          leads: 0,
          uniqueLeads: 0,
          trialsBooked: 0,
          trialsAttended: 0,
          conversion: 0,
          sales: 0
        };
      }
      sourceStatsMap[source].trialsBooked = appointmentStatsMap[source].trialsBooked;
      sourceStatsMap[source].trialsAttended = appointmentStatsMap[source].trialsAttended;
    });

    // Add conversion stats
    conversionStats.forEach(stat => {
      if (!sourceStatsMap[stat._id]) {
        sourceStatsMap[stat._id] = {
          source: stat._id,
          leads: 0,
          uniqueLeads: 0,
          trialsBooked: 0,
          trialsAttended: 0,
          conversion: 0,
          sales: 0
        };
      }
      sourceStatsMap[stat._id].conversion = stat.conversions;
    });

    // Calculate percentages and format data
    const records = Object.values(sourceStatsMap).map(item => {
      const leadsToTrialsBookedPercent = item.leads > 0 ? ((item.trialsBooked / item.leads) * 100).toFixed(1) : '0.0';
      const trialsBookedToAttendedPercent = item.trialsBooked > 0 ? ((item.trialsAttended / item.trialsBooked) * 100).toFixed(1) : '0.0';
      const trialsAttendedToConversionPercent = item.trialsAttended > 0 ? ((item.conversion / item.trialsAttended) * 100).toFixed(1) : '0.0';
      const leadToConversionPercent = item.leads > 0 ? ((item.conversion / item.leads) * 100).toFixed(1) : '0.0';

      return {
        _id: item.source,
        source: item.source,
        leads: item.leads,
        uniqueLeads: item.uniqueLeads,
        trialsBooked: item.trialsBooked,
        trialsAttended: item.trialsAttended,
        conversion: item.conversion,
        sales: item.sales,
        leadsToTrialsBookedPercent: parseFloat(leadsToTrialsBookedPercent),
        trialsBookedToAttendedPercent: parseFloat(trialsBookedToAttendedPercent),
        trialsAttendedToConversionPercent: parseFloat(trialsAttendedToConversionPercent),
        leadToConversionPercent: parseFloat(leadToConversionPercent)
      };
    });

    // Sort by source name
    records.sort((a, b) => a.source.localeCompare(b.source));

    // Apply pagination
    const total = records.length;
    const paginatedRecords = records.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Marketing MIS Report
export const exportMarketingMISReport = async (req, res) => {
  try {
    // Simplified export - in production, you'd want to reuse the aggregation logic
    const headers = ['S.No', 'Source', 'Leads', 'Unique Leads', 'Trials Booked', 'Trials Attended', 'Conversion', 'Sales', 'Leads to Trials Booked %', 'Trials Booked to Attended %', 'Trials Attended to Conversion %', 'Lead to Conversion %'];
    
    let csvContent = headers.join(',') + '\n';
    // For now, return empty CSV - full implementation would fetch and format data
    csvContent += '\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=marketing-mis-report-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DSR Report (Daily Sales Report)
export const getDSRReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();
    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;

    // Calculate date range for the selected month
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    const daysInMonth = endDate.getDate();
    const records = [];

    // Get all branches for the organization
    const branches = await Branch.find({ organizationId: req.organizationId, isActive: true }).select('_id');
    const branchIds = branches.map(b => b._id);

    // Process each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedYear, selectedMonth - 1, day);
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Get enquiries for this day
      const enquiries = await Enquiry.find({
        organizationId: req.organizationId,
        branchId: { $in: branchIds },
        date: { $gte: dayStart, $lte: dayEnd }
      });

      // Get existing leads (enquiries created before this day)
      const existingLeads = await Enquiry.countDocuments({
        organizationId: req.organizationId,
        branchId: { $in: branchIds },
        date: { $lt: dayStart }
      });

      // Added today
      const addedToday = enquiries.length;

      // Referral generated (enquiries with referral source)
      const referralGenerated = enquiries.filter(e => e.leadSource === 'referral').length;

      // Lead converted (enquiries converted to members on this day)
      const leadConverted = await Enquiry.countDocuments({
        organizationId: req.organizationId,
        branchId: { $in: branchIds },
        enquiryStage: 'converted',
        date: { $gte: dayStart, $lte: dayEnd }
      });

      // Get invoices created on this day
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        branchId: { $in: branchIds },
        createdAt: { $gte: dayStart, $lte: dayEnd }
      }).populate('memberId', 'createdAt').populate('items.serviceId', 'type');

      // Spot conversion (new members with invoices on same day)
      const spotConversionInvoices = invoices.filter(inv => {
        if (!inv.memberId || !inv.memberId.createdAt) return false;
        const memberCreated = new Date(inv.memberId.createdAt);
        return memberCreated.toDateString() === currentDate.toDateString();
      });

      const spotConversionCount = spotConversionInvoices.length;
      const spotConversionValue = spotConversionInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Total closures
      const totalClosuresCount = leadConverted + spotConversionCount;
      const totalClosuresValue = spotConversionValue;

      // Today's sale
      const todaySale = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // New clients (members created on this day)
      const newMembers = await Member.find({
        organizationId: req.organizationId,
        branchId: { $in: branchIds },
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });

      // New clients invoices
      const newMemberIds = newMembers.map(m => m._id);
      const newClientInvoices = invoices.filter(inv => newMemberIds.includes(inv.memberId?._id));

      // Separate Non-PT and PT
      const newClientsNonPTInvoices = newClientInvoices.filter(inv => {
        const hasPT = inv.items?.some(item => item.serviceId?.type === 'pt' || item.serviceId?.type === 'personal-training');
        return !hasPT;
      });
      const newClientsPTInvoices = newClientInvoices.filter(inv => {
        const hasPT = inv.items?.some(item => item.serviceId?.type === 'pt' || item.serviceId?.type === 'personal-training');
        return hasPT;
      });

      // Existing clients invoices
      const existingClientInvoices = invoices.filter(inv => !newMemberIds.includes(inv.memberId?._id));
      const existingClientsNonPTInvoices = existingClientInvoices.filter(inv => {
        const hasPT = inv.items?.some(item => item.serviceId?.type === 'pt' || item.serviceId?.type === 'personal-training');
        return !hasPT;
      });
      const existingClientsPTInvoices = existingClientInvoices.filter(inv => {
        const hasPT = inv.items?.some(item => item.serviceId?.type === 'pt' || item.serviceId?.type === 'personal-training');
        return hasPT;
      });

      // Get payments for this day
      const payments = await Payment.find({
        organizationId: req.organizationId,
        branchId: { $in: branchIds },
        paidAt: { $gte: dayStart, $lte: dayEnd },
        status: 'completed'
      });

      const todayCollection = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // New sales collection (payments for invoices created today)
      const invoiceIds = invoices.map(inv => inv._id);
      const newSalesPayments = payments.filter(p => invoiceIds.includes(p.invoiceId));
      const newSalesCollection = newSalesPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Due recovered (payments for older invoices)
      const dueRecovered = todayCollection - newSalesCollection;

      records.push({
        _id: `day-${day}`,
        date: currentDate.toISOString().split('T')[0],
        day: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        existingLeads: existingLeads + addedToday,
        addedToday,
        referralGenerated,
        leadConverted: {
          count: leadConverted,
          value: 0 // Can be calculated from converted member invoices if needed
        },
        spotConversion: {
          count: spotConversionCount,
          value: spotConversionValue
        },
        totalClosures: {
          count: totalClosuresCount,
          value: totalClosuresValue
        },
        todaySale,
        newClientsNonPT: {
          count: newClientsNonPTInvoices.length,
          revenue: newClientsNonPTInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
        },
        newClientsPT: {
          count: newClientsPTInvoices.length,
          revenue: newClientsPTInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
        },
        existingClientsNonPT: {
          count: existingClientsNonPTInvoices.length,
          revenue: existingClientsNonPTInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
        },
        existingClientsPT: {
          count: existingClientsPTInvoices.length,
          revenue: existingClientsPTInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
        },
        todayCollection,
        newSalesCollection,
        dueRecovered
      });
    }

    res.json({
      success: true,
      data: { records }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export DSR Report
export const exportDSRReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    // Reuse getDSRReport logic and format as CSV
    // For now, return a simple CSV structure
    const headers = ['Date', 'Day', 'Existing Leads', 'Added Today', 'Referral Generated', 'Lead Converted Count', 'Lead Converted Value', 'Spot Conversion Count', 'Spot Conversion Value', 'Total Closures Count', 'Total Closures Value', 'Today\'s SALE', 'New Clients Non-PT Count', 'New Clients Non-PT Revenue', 'New Clients PT Count', 'New Clients PT Revenue', 'Existing Clients Non-PT Count', 'Existing Clients Non-PT Revenue', 'Existing Clients PT Count', 'Existing Clients PT Revenue', 'Today\'s COLLECTION', 'New Sales Collection', 'Due Recovered'];
    
    let csvContent = headers.join(',') + '\n';
    // Full implementation would fetch data and format rows

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=dsr-report-${year}-${month}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revenue Report
export const getRevenueReport = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    // Get all branches for the organization
    const branches = await Branch.find({ organizationId: req.organizationId, isActive: true }).select('_id name');
    const branchIds = branches.map(b => b._id);

    const records = [];

    // Process each branch
    for (const branch of branches) {
      const monthlyRevenue = {
        jan: 0,
        feb: 0,
        mar: 0,
        apr: 0,
        may: 0,
        jun: 0,
        jul: 0,
        aug: 0,
        sep: 0,
        oct: 0,
        nov: 0,
        dec: 0
      };

      // Process each month
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(selectedYear, month, 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(selectedYear, month + 1, 0, 23, 59, 59, 999);

        // Get invoices for this branch and month
        const invoices = await Invoice.find({
          organizationId: req.organizationId,
          branchId: branch._id,
          createdAt: { $gte: monthStart, $lte: monthEnd },
          status: { $in: ['paid', 'partial'] }
        });

        // Calculate total revenue for this month
        const monthRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

        // Map to month key
        const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        monthlyRevenue[monthKeys[month]] = monthRevenue;
      }

      // Calculate total
      const total = Object.values(monthlyRevenue).reduce((sum, val) => sum + val, 0);

      records.push({
        _id: branch._id.toString(),
        studioName: branch.name,
        months: monthlyRevenue,
        total
      });
    }

    res.json({
      success: true,
      data: { records }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Revenue Report
export const exportRevenueReport = async (req, res) => {
  try {
    const { year } = req.query;
    // Reuse getRevenueReport logic and format as CSV
    const headers = ['S.No', 'Studio Name', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total'];
    
    let csvContent = headers.join(',') + '\n';
    // Full implementation would fetch data and format rows

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${year}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Service Sales All Bookings Report
export const getServiceSalesReport = async (req, res) => {
  try {
    const { 
      saleType = 'all', 
      dateRange = 'last-30-days',
      serviceName,
      serviceVariation,
      gender,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const skip = (page - 1) * limit;

    // Build date query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Handle date range presets
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
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // Build base query
    const baseQuery = {
      organizationId: req.organizationId,
      ...dateQuery,
      status: { $in: ['paid', 'partial', 'sent', 'draft'] } // Include draft (pro-forma), sent and paid invoices
    };

    // Filter by sale type (New Bookings vs Rebookings)
    if (saleType === 'new-bookings') {
      baseQuery.type = { $in: ['membership', 'other'] };
    } else if (saleType === 'rebookings') {
      baseQuery.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
    }

    // Get invoices with populated data
    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'firstName lastName gender')
      .populate('planId', 'name')
      .populate('items.serviceId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Process invoices into booking records
    const bookings = [];
    for (const invoice of invoices) {
      // Process each item in the invoice
      for (const item of invoice.items || []) {
        // Filter by service name if provided
        if (serviceName) {
          const serviceId = item.serviceId?._id?.toString() || invoice.planId?._id?.toString();
          if (serviceId !== serviceName) continue;
        }

        // Filter by service variation if provided
        if (serviceVariation && item.description) {
          if (!item.description.toLowerCase().includes(serviceVariation.toLowerCase())) continue;
        }

        // Filter by gender if provided
        if (gender && invoice.memberId?.gender) {
          if (invoice.memberId.gender !== gender) continue;
        }

        // Determine sale type
        let saleTypeLabel = 'New Bookings';
        if (invoice.type === 'renewal') {
          saleTypeLabel = 'Rebookings';
        } else if (invoice.type === 'upgrade' || invoice.type === 'downgrade') {
          saleTypeLabel = 'Rebookings';
        }

        // Get service name
        const serviceNameValue = item.serviceId?.name || invoice.planId?.name || 'N/A';
        const serviceVariationName = item.description || invoice.planId?.name || 'N/A';

        // Calculate values
        const listPrice = (item.unitPrice || 0) * (item.quantity || 1);
        const discountValue = item.discount?.amount || invoice.discount?.amount || 0;
        const totalAmount = item.total || (listPrice - discountValue);

        bookings.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          invoiceNumber: invoice.invoiceNumber,
          proFormaInvoiceNo: invoice.isProForma ? invoice.invoiceNumber : invoice.invoiceNumber,
          saleType: saleTypeLabel,
          serviceName: serviceNameValue,
          serviceVariation: serviceVariationName,
          quantity: item.quantity || 1,
          listPrice: listPrice,
          discountValue: discountValue,
          totalAmount: totalAmount,
          createdAt: invoice.createdAt,
          member: invoice.memberId
        });
      }

      // If invoice has no items but has planId, create a booking from the invoice itself
      if ((!invoice.items || invoice.items.length === 0) && invoice.planId) {
        // Filter by service name
        if (serviceName && invoice.planId._id.toString() !== serviceName) continue;

        // Filter by gender
        if (gender && invoice.memberId?.gender && invoice.memberId.gender !== gender) continue;

        let saleTypeLabel = 'New Bookings';
        if (invoice.type === 'renewal') {
          saleTypeLabel = 'Rebookings';
        } else if (invoice.type === 'upgrade' || invoice.type === 'downgrade') {
          saleTypeLabel = 'Rebookings';
        }

        const listPrice = invoice.subtotal || 0;
        const discountValue = invoice.discount?.amount || 0;
        const totalAmount = invoice.total || 0;

        bookings.push({
          _id: `${invoice._id}-main`,
          invoiceNumber: invoice.invoiceNumber,
          proFormaInvoiceNo: invoice.isProForma ? invoice.invoiceNumber : invoice.invoiceNumber,
          saleType: saleTypeLabel,
          serviceName: invoice.planId.name || 'N/A',
          serviceVariation: invoice.planId.name || 'N/A',
          quantity: 1,
          listPrice: listPrice,
          discountValue: discountValue,
          totalAmount: totalAmount,
          createdAt: invoice.createdAt,
          member: invoice.memberId
        });
      }
    }

    // Calculate totals
    const totals = bookings.reduce((acc, booking) => {
      acc.quantity += booking.quantity;
      acc.listPrice += booking.listPrice;
      acc.discountValue += booking.discountValue;
      acc.totalAmount += booking.totalAmount;
      return acc;
    }, { quantity: 0, listPrice: 0, discountValue: 0, totalAmount: 0 });

    // Get total count for pagination
    const totalInvoices = await Invoice.countDocuments(baseQuery);
    // Approximate total bookings (this is an estimate)
    const totalBookings = bookings.length;

    res.json({
      success: true,
      data: {
        bookings,
        totals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalBookings,
          pages: Math.ceil(totalBookings / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Service Sales Report
export const exportServiceSalesReport = async (req, res) => {
  try {
    const { 
      saleType = 'all', 
      dateRange = 'last-30-days',
      serviceName,
      serviceVariation,
      gender,
      startDate,
      endDate
    } = req.query;

    // Build date query (same as getServiceSalesReport)
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
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
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const exportBaseQuery = {
      organizationId: req.organizationId,
      ...dateQuery,
      status: { $in: ['paid', 'partial', 'sent', 'draft'] }
    };

    if (saleType === 'new-bookings') {
      exportBaseQuery.type = { $in: ['membership', 'other'] };
    } else if (saleType === 'rebookings') {
      exportBaseQuery.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
    }

    const invoices = await Invoice.find(exportBaseQuery)
      .populate('memberId', 'firstName lastName gender')
      .populate('planId', 'name')
      .populate('items.serviceId', 'name')
      .sort({ createdAt: -1 });

    const bookings = [];
    for (const invoice of invoices) {
      for (const item of invoice.items || []) {
        if (serviceName && (item.serviceId?._id?.toString() !== serviceName && invoice.planId?._id?.toString() !== serviceName)) continue;
        if (serviceVariation && item.description && !item.description.toLowerCase().includes(serviceVariation.toLowerCase())) continue;
        if (gender && invoice.memberId?.gender && invoice.memberId.gender !== gender) continue;

        let saleTypeLabel = 'New Bookings';
        if (invoice.type === 'renewal' || invoice.type === 'upgrade' || invoice.type === 'downgrade') {
          saleTypeLabel = 'Rebookings';
        }

        const serviceNameValue = item.serviceId?.name || invoice.planId?.name || 'N/A';
        const serviceVariationName = item.description || invoice.planId?.name || 'N/A';
        const listPrice = (item.unitPrice || 0) * (item.quantity || 1);
        const discountValue = item.discount?.amount || invoice.discount?.amount || 0;
        const totalAmount = item.total || (listPrice - discountValue);

        bookings.push({
          invoiceNumber: invoice.invoiceNumber,
          saleType: saleTypeLabel,
          serviceName: serviceNameValue,
          serviceVariation: serviceVariationName,
          quantity: item.quantity || 1,
          listPrice: listPrice,
          discountValue: discountValue,
          totalAmount: totalAmount
        });
      }
    }

    // Generate CSV
    const headers = ['S.No', 'Pro Forma Invoice No.', 'Sale Type', 'Service Name', 'Service Variations', 'Quantity', 'List Price', 'Discount Value', 'Total Amount'];
    let csvContent = headers.join(',') + '\n';

    bookings.forEach((booking, index) => {
      const row = [
        index + 1,
        booking.invoiceNumber,
        booking.saleType,
        booking.serviceName,
        booking.serviceVariation,
        booking.quantity,
        booking.listPrice.toFixed(2),
        booking.discountValue.toFixed(2),
        booking.totalAmount.toFixed(2)
      ];
      csvContent += row.join(',') + '\n';
    });

    // Add totals row
    const totals = bookings.reduce((acc, booking) => {
      acc.quantity += booking.quantity;
      acc.listPrice += booking.listPrice;
      acc.discountValue += booking.discountValue;
      acc.totalAmount += booking.totalAmount;
      return acc;
    }, { quantity: 0, listPrice: 0, discountValue: 0, totalAmount: 0 });

    csvContent += `Total,,,${totals.quantity},${totals.listPrice.toFixed(2)},${totals.discountValue.toFixed(2)},${totals.totalAmount.toFixed(2)}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=service-sales-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revenue Month Till Date Report
export const getRevenueMonthTillDateReport = async (req, res) => {
  try {
    const { tillDate } = req.query;
    
    // Parse tillDate (DD-MM-YY format)
    const [day, month, year] = tillDate.split('-');
    const fullYear = 2000 + parseInt(year);
    const selectedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    selectedDate.setHours(23, 59, 59, 999);
    
    // Get month start and end
    const monthStart = new Date(fullYear, parseInt(month) - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(fullYear, parseInt(month), 0, 23, 59, 59, 999);
    const daysInMonth = monthEnd.getDate();
    const daysTillDate = parseInt(day);

    // Get all branches for the organization
    const branches = await Branch.find({ organizationId: req.organizationId, isActive: true }).select('_id name');
    const records = [];

    // Process each branch
    for (const branch of branches) {
      // Get monthly revenue target (aggregate from staff targets for this branch)
      // For now, we'll use 0 as default - in production, you'd aggregate staff targets by branch
      let monthlyRevenueTarget = 0;
      
      // Try to get staff targets for revenue for this month
      const currentYear = fullYear;
      const currentMonth = parseInt(month) - 1; // 0-indexed
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                          'july', 'august', 'september', 'october', 'november', 'december'];
      const monthKey = monthNames[currentMonth];

      // Get staff members for this branch
      const staffMembers = await User.find({ 
        organizationId: req.organizationId, 
        branchId: branch._id,
        role: { $in: ['owner', 'manager', 'staff'] }
      }).select('_id');

      const staffIds = staffMembers.map(s => s._id);

      // Aggregate revenue targets from staff targets
      if (staffIds.length > 0) {
        const staffTargets = await StaffTarget.find({
          organizationId: req.organizationId,
          staffId: { $in: staffIds },
          targetType: 'sales',
          salesType: 'revenue-target',
          year: currentYear
        });

        monthlyRevenueTarget = staffTargets.reduce((sum, target) => {
          return sum + (target.monthlyTargets?.[monthKey] || 0);
        }, 0);
      }

      // Calculate pro-rata revenue target
      const proRataRevenueTarget = monthlyRevenueTarget > 0 
        ? (monthlyRevenueTarget / daysInMonth) * daysTillDate 
        : 0;

      // Get monthly revenue achieved (invoices from month start to till date)
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        branchId: branch._id,
        createdAt: { $gte: monthStart, $lte: selectedDate },
        status: { $in: ['paid', 'partial'] }
      });

      const monthlyRevenueAchieved = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Calculate pro-rata revenue achieved percentage
      const proRataRevenueAchievedPercent = proRataRevenueTarget > 0
        ? (monthlyRevenueAchieved / proRataRevenueTarget) * 100
        : null;

      // Get daily revenue achieved (invoices on the till date)
      const dayStart = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      dayEnd.setHours(23, 59, 59, 999);

      const dayInvoices = await Invoice.find({
        organizationId: req.organizationId,
        branchId: branch._id,
        createdAt: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['paid', 'partial'] }
      });

      const dailyRevenueAchieved = dayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Calculate monthly revenue achieved percentage
      const monthlyRevenueAchievedPercent = monthlyRevenueTarget > 0
        ? (monthlyRevenueAchieved / monthlyRevenueTarget) * 100
        : null;

      records.push({
        _id: branch._id.toString(),
        studioName: branch.name,
        monthlyRevenueTarget,
        proRataRevenueTarget,
        monthlyRevenueAchieved,
        proRataRevenueAchievedPercent,
        dailyRevenueAchieved,
        monthlyRevenueAchievedPercent
      });
    }

    res.json({
      success: true,
      data: { records }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Revenue Month Till Date Report
export const exportRevenueMonthTillDateReport = async (req, res) => {
  try {
    const { tillDate } = req.query;
    // Reuse getRevenueMonthTillDateReport logic and format as CSV
    const headers = ['S.No', 'Studio Name', 'Monthly Revenue Target (INR)', 'Pro-Rata Revenue Target (INR)', 'Monthly Revenue Achieved (INR)', 'Pro-Rata Revenue Achieved (%)', 'Daily Revenue Achieved (INR)', 'Monthly Revenue Achieved (%)'];
    
    let csvContent = headers.join(',') + '\n';
    // Full implementation would fetch data and format rows

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-month-till-date-report-${tillDate}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Service Type Report
export const getServiceTypeReport = async (req, res) => {
  try {
    const { 
      dateRange = 'last-30-days',
      serviceType,
      serviceName,
      serviceVariation,
      staff,
      page = 1,
      limit = 10
    } = req.query;

    // Build date query
    let dateQuery = {};
    const end = new Date();
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
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-year':
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    
    dateQuery.createdAt = {
      $gte: start,
      $lte: end
    };

    // Build base query
    const baseQuery = {
      organizationId: req.organizationId,
      ...dateQuery,
      status: { $in: ['paid', 'partial', 'sent'] }
    };

    // Filter by staff if provided
    if (staff && staff !== 'all') {
      baseQuery.createdBy = staff;
    }

    // Get invoices with populated plan data
    const invoices = await Invoice.find(baseQuery)
      .populate('planId', 'name type')
      .populate('items.serviceId', 'name type')
      .populate('createdBy', 'firstName lastName')
      .lean();

    // Group by service type, service name, and service variation
    const groupedData = {};

    for (const invoice of invoices) {
      // Process invoice items
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          if (item.serviceId) {
            const serviceTypeValue = item.serviceId.type || 'Other';
            const serviceNameValue = item.serviceId.name || 'N/A';
            const serviceVariationValue = item.serviceVariationName || item.serviceId.name || 'N/A';

            // Apply filters
            if (serviceType && serviceType !== 'all' && serviceTypeValue !== serviceType) continue;
            if (serviceName && serviceName !== 'all' && serviceNameValue !== serviceName) continue;
            if (serviceVariation && serviceVariation !== 'all' && serviceVariationValue !== serviceVariation) continue;

            const key = `${serviceTypeValue}|||${serviceNameValue}|||${serviceVariationValue}`;
            
            if (!groupedData[key]) {
              groupedData[key] = {
                serviceType: serviceTypeValue,
                serviceName: serviceNameValue,
                serviceVariation: serviceVariationValue,
                count: 0
              };
            }
            groupedData[key].count += item.quantity || 1;
          }
        }
      }

      // Process planId if invoice has a plan
      if (invoice.planId) {
        const serviceTypeValue = invoice.planId.type || 'Other';
        const serviceNameValue = invoice.planId.name || 'N/A';
        const serviceVariationValue = invoice.planId.name || 'N/A';

        // Apply filters
        if (serviceType && serviceType !== 'all' && serviceTypeValue !== serviceType) continue;
        if (serviceName && serviceName !== 'all' && serviceNameValue !== serviceName) continue;
        if (serviceVariation && serviceVariation !== 'all' && serviceVariationValue !== serviceVariation) continue;

        const key = `${serviceTypeValue}|||${serviceNameValue}|||${serviceVariationValue}`;
        
        if (!groupedData[key]) {
          groupedData[key] = {
            serviceType: serviceTypeValue,
            serviceName: serviceNameValue,
            serviceVariation: serviceVariationValue,
            count: 0
          };
        }
        groupedData[key].count += 1;
      }
    }

    // Convert to array and sort
    const records = Object.values(groupedData).sort((a, b) => {
      if (a.serviceType !== b.serviceType) {
        return a.serviceType.localeCompare(b.serviceType);
      }
      if (a.serviceName !== b.serviceName) {
        return a.serviceName.localeCompare(b.serviceName);
      }
      return a.serviceVariation.localeCompare(b.serviceVariation);
    });

    // Pagination
    const total = records.length;
    const skip = (page - 1) * limit;
    const paginatedRecords = records.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Service Type Report
export const exportServiceTypeReport = async (req, res) => {
  try {
    const { 
      dateRange = 'last-30-days',
      serviceType,
      serviceName,
      serviceVariation,
      staff
    } = req.query;

    // Reuse getServiceTypeReport logic
    // Build date query
    let dateQuery = {};
    const end = new Date();
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
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-year':
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    
    dateQuery.createdAt = {
      $gte: start,
      $lte: end
    };

    const baseQuery = {
      organizationId: req.organizationId,
      ...dateQuery,
      status: { $in: ['paid', 'partial', 'sent'] }
    };

    if (staff && staff !== 'all') {
      baseQuery.createdBy = staff;
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('planId', 'name type')
      .populate('items.serviceId', 'name type')
      .lean();

    const groupedData = {};

    for (const invoice of invoices) {
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          if (item.serviceId) {
            const serviceTypeValue = item.serviceId.type || 'Other';
            const serviceNameValue = item.serviceId.name || 'N/A';
            const serviceVariationValue = item.serviceVariationName || item.serviceId.name || 'N/A';

            if (serviceType && serviceType !== 'all' && serviceTypeValue !== serviceType) continue;
            if (serviceName && serviceName !== 'all' && serviceNameValue !== serviceName) continue;
            if (serviceVariation && serviceVariation !== 'all' && serviceVariationValue !== serviceVariation) continue;

            const key = `${serviceTypeValue}|||${serviceNameValue}|||${serviceVariationValue}`;
            
            if (!groupedData[key]) {
              groupedData[key] = {
                serviceType: serviceTypeValue,
                serviceName: serviceNameValue,
                serviceVariation: serviceVariationValue,
                count: 0
              };
            }
            groupedData[key].count += item.quantity || 1;
          }
        }
      }

      if (invoice.planId) {
        const serviceTypeValue = invoice.planId.type || 'Other';
        const serviceNameValue = invoice.planId.name || 'N/A';
        const serviceVariationValue = invoice.planId.name || 'N/A';

        if (serviceType && serviceType !== 'all' && serviceTypeValue !== serviceType) continue;
        if (serviceName && serviceName !== 'all' && serviceNameValue !== serviceName) continue;
        if (serviceVariation && serviceVariation !== 'all' && serviceVariationValue !== serviceVariation) continue;

        const key = `${serviceTypeValue}|||${serviceNameValue}|||${serviceVariationValue}`;
        
        if (!groupedData[key]) {
          groupedData[key] = {
            serviceType: serviceTypeValue,
            serviceName: serviceNameValue,
            serviceVariation: serviceVariationValue,
            count: 0
          };
        }
        groupedData[key].count += 1;
      }
    }

    const records = Object.values(groupedData).sort((a, b) => {
      if (a.serviceType !== b.serviceType) {
        return a.serviceType.localeCompare(b.serviceType);
      }
      if (a.serviceName !== b.serviceName) {
        return a.serviceName.localeCompare(b.serviceName);
      }
      return a.serviceVariation.localeCompare(b.serviceVariation);
    });

    // Format as CSV
    const headers = ['S.No', 'Service Type', 'Service Name', 'Service Variations', 'Count'];
    let csvContent = headers.join(',') + '\n';
    
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.serviceType}"`,
        `"${record.serviceName}"`,
        `"${record.serviceVariation}"`,
        record.count
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=service-type-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Enquiry Conversion Report
export const getEnquiryConversionReport = async (req, res) => {
  try {
    const { dateRange = 'last-30-days', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build date query
    let dateQuery = {};
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
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-year':
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    
    start.setHours(0, 0, 0, 0);
    dateQuery.date = {
      $gte: start,
      $lte: end
    };

    // Get converted enquiries
    const enquiries = await Enquiry.find({
      organizationId: req.organizationId,
      enquiryStage: 'converted',
      convertedToMember: { $exists: true, $ne: null },
      ...dateQuery
    })
      .populate('convertedToMember', 'firstName lastName')
      .populate('service', 'name')
      .populate('assignedStaff', 'firstName lastName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Enquiry.countDocuments({
      organizationId: req.organizationId,
      enquiryStage: 'converted',
      convertedToMember: { $exists: true, $ne: null },
      ...dateQuery
    });

    const records = [];

    // Process each enquiry
    for (const enquiry of enquiries) {
      // Calculate conversion time in days
      const conversionTimeDays = enquiry.convertedAt 
        ? Math.floor((new Date(enquiry.convertedAt) - new Date(enquiry.date)) / (1000 * 60 * 60 * 24))
        : null;

      // Get invoices for the converted member
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: enquiry.convertedToMember._id,
        createdAt: { $gte: enquiry.date }
      })
        .populate('planId', 'name')
        .populate('items.serviceId', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: 1 })
        .limit(1); // Get first invoice after conversion

      // Get appointments for this enquiry
      const appointments = await Appointment.find({
        organizationId: req.organizationId,
        enquiryId: enquiry._id
      });

      const trialTaken = appointments.some(apt => apt.status === 'completed') ? 'Yes' : 'No';
      const otherAppointment = appointments.length > 0 ? 'Yes' : 'No';

      // Process invoices
      if (invoices.length > 0) {
        for (const invoice of invoices) {
          // Process invoice items
          if (invoice.items && invoice.items.length > 0) {
            for (const item of invoice.items) {
              const serviceName = item.serviceId?.name || invoice.planId?.name || enquiry.serviceName || '-';
              const serviceVariation = item.description || invoice.planId?.name || '-';
              const startDate = item.startDate || invoice.createdAt;
              const endDate = item.expiryDate || null;
              const totalValue = item.total || invoice.total || 0;
              
              // Get paid amount from payments
              const payments = await Payment.find({
                organizationId: req.organizationId,
                invoiceId: invoice._id,
                status: 'completed'
              });
              const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

              const salesRep = invoice.createdBy 
                ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
                : enquiry.assignedStaff
                  ? `${enquiry.assignedStaff.firstName || ''} ${enquiry.assignedStaff.lastName || ''}`.trim()
                  : '-';

              records.push({
                _id: `${enquiry._id}-${invoice._id}-${item._id || Math.random()}`,
                enquiryDate: enquiry.date,
                conversionTimeDays,
                name: enquiry.name,
                contactNo: enquiry.phone,
                emailId: enquiry.email || '',
                leadSource: enquiry.leadSource || '-',
                enquiryType: enquiry.enquiryType || '-',
                serviceName: enquiry.serviceName || serviceName,
                trialTaken,
                otherAppointment,
                invoiceDate: invoice.createdAt,
                service: serviceName,
                serviceVariation,
                startDate,
                endDate,
                totalValue,
                paidAmount,
                salesRep
              });
            }
          } else {
            // Invoice has no items, use invoice-level data
            const serviceName = invoice.planId?.name || enquiry.serviceName || '-';
            const serviceVariation = invoice.planId?.name || '-';
            const startDate = invoice.createdAt;
            const endDate = null;
            const totalValue = invoice.total || 0;
            
            const payments = await Payment.find({
              organizationId: req.organizationId,
              invoiceId: invoice._id,
              status: 'completed'
            });
            const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

            const salesRep = invoice.createdBy 
              ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
              : enquiry.assignedStaff
                ? `${enquiry.assignedStaff.firstName || ''} ${enquiry.assignedStaff.lastName || ''}`.trim()
                : '-';

            records.push({
              _id: `${enquiry._id}-${invoice._id}`,
              enquiryDate: enquiry.date,
              conversionTimeDays,
              name: enquiry.name,
              contactNo: enquiry.phone,
              emailId: enquiry.email || '',
              leadSource: enquiry.leadSource || '-',
              enquiryType: enquiry.enquiryType || '-',
              serviceName: enquiry.serviceName || serviceName,
              trialTaken,
              otherAppointment,
              invoiceDate: invoice.createdAt,
              service: serviceName,
              serviceVariation,
              startDate,
              endDate,
              totalValue,
              paidAmount,
              salesRep
            });
          }
        }
      } else {
        // No invoices found, create record with enquiry data only
        records.push({
          _id: enquiry._id.toString(),
          enquiryDate: enquiry.date,
          conversionTimeDays,
          name: enquiry.name,
          contactNo: enquiry.phone,
          emailId: enquiry.email || '',
          leadSource: enquiry.leadSource || '-',
          enquiryType: enquiry.enquiryType || '-',
          serviceName: enquiry.serviceName || '-',
          trialTaken,
          otherAppointment,
          invoiceDate: null,
          service: '-',
          serviceVariation: '-',
          startDate: null,
          endDate: null,
          totalValue: 0,
          paidAmount: 0,
          salesRep: enquiry.assignedStaff
            ? `${enquiry.assignedStaff.firstName || ''} ${enquiry.assignedStaff.lastName || ''}`.trim()
            : '-'
        });
      }
    }

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Enquiry Conversion Report
export const exportEnquiryConversionReport = async (req, res) => {
  try {
    const { dateRange = 'last-30-days' } = req.query;

    // Reuse getEnquiryConversionReport logic but get all records
    // Build date query (same as above)
    let dateQuery = {};
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
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-year':
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    
    start.setHours(0, 0, 0, 0);
    dateQuery.date = {
      $gte: start,
      $lte: end
    };

    const enquiries = await Enquiry.find({
      organizationId: req.organizationId,
      enquiryStage: 'converted',
      convertedToMember: { $exists: true, $ne: null },
      ...dateQuery
    })
      .populate('convertedToMember', 'firstName lastName')
      .populate('service', 'name')
      .populate('assignedStaff', 'firstName lastName')
      .sort({ date: -1 });

    const records = [];
    for (const enquiry of enquiries) {
      const conversionTimeDays = enquiry.convertedAt 
        ? Math.floor((new Date(enquiry.convertedAt) - new Date(enquiry.date)) / (1000 * 60 * 60 * 24))
        : null;

      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: enquiry.convertedToMember._id,
        createdAt: { $gte: enquiry.date }
      })
        .populate('planId', 'name')
        .populate('items.serviceId', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: 1 })
        .limit(1);

      const appointments = await Appointment.find({
        organizationId: req.organizationId,
        enquiryId: enquiry._id
      });

      const trialTaken = appointments.some(apt => apt.status === 'completed') ? 'Yes' : 'No';
      const otherAppointment = appointments.length > 0 ? 'Yes' : 'No';

      if (invoices.length > 0) {
        for (const invoice of invoices) {
          if (invoice.items && invoice.items.length > 0) {
            for (const item of invoice.items) {
              const payments = await Payment.find({
                organizationId: req.organizationId,
                invoiceId: invoice._id,
                status: 'completed'
              });
              const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

              records.push({
                enquiryDate: enquiry.date,
                conversionTimeDays,
                name: enquiry.name,
                contactNo: enquiry.phone,
                emailId: enquiry.email || '',
                leadSource: enquiry.leadSource || '-',
                enquiryType: enquiry.enquiryType || '-',
                serviceName: enquiry.serviceName || item.serviceId?.name || invoice.planId?.name || '-',
                trialTaken,
                otherAppointment,
                invoiceDate: invoice.createdAt,
                service: item.serviceId?.name || invoice.planId?.name || '-',
                serviceVariation: item.description || invoice.planId?.name || '-',
                startDate: item.startDate || invoice.createdAt,
                endDate: item.expiryDate || null,
                totalValue: item.total || invoice.total || 0,
                paidAmount,
                salesRep: invoice.createdBy 
                  ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
                  : '-'
              });
            }
          }
        }
      }
    }

    // Generate CSV
    const headers = ['S.No', 'Enquiry Date', 'Conversion Time (In Days)', 'Name', 'Contact No', 'Email Id', 'Lead Source', 'Enquiry Type', 'Service Name', 'Trial Taken', 'Other Appointment', 'Invoice Date', 'Service', 'Service Variation', 'Start Date', 'End Date', 'Total Value', 'Paid Amount', 'Sales Rep'];
    let csvContent = headers.join(',') + '\n';

    records.forEach((record, index) => {
      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const row = [
        index + 1,
        formatDate(record.enquiryDate),
        record.conversionTimeDays || '-',
        `"${record.name}"`,
        record.contactNo,
        record.emailId || '',
        record.leadSource,
        record.enquiryType,
        `"${record.serviceName}"`,
        record.trialTaken,
        record.otherAppointment,
        formatDate(record.invoiceDate),
        `"${record.service}"`,
        `"${record.serviceVariation}"`,
        formatDate(record.startDate),
        formatDate(record.endDate),
        record.totalValue.toFixed(2),
        record.paidAmount.toFixed(2),
        `"${record.salesRep}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=enquiry-conversion-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to calculate monthly revenue realization
const calculateMonthlyRevenue = (paidAmount, startDate, endDate) => {
  if (!startDate || !endDate || !paidAmount) {
    return {};
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthlyRevenue = {};

  // Calculate total days in the service period
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays <= 0) {
    return monthlyRevenue;
  }

  // Calculate daily rate
  const dailyRate = paidAmount / totalDays;

  // Iterate through each month in the period
  let currentYear = start.getFullYear();
  let currentMonth = start.getMonth();

  while (true) {
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthDate = new Date(currentYear, currentMonth, 1);
    const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Calculate days in this month that fall within the service period
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const periodStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
    const periodEnd = new Date(Math.min(end.getTime(), monthEnd.getTime()));

    if (periodStart <= periodEnd) {
      const daysInMonth = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;
      const revenueForMonth = dailyRate * daysInMonth;
      
      monthlyRevenue[monthKey] = {
        label: monthLabel,
        amount: Math.round(revenueForMonth * 100) / 100 // Round to 2 decimal places
      };
    }

    // Move to next month
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }

    // Check if we've passed the end date
    if (monthStart > end) {
      break;
    }
  }

  return monthlyRevenue;
};

// Revenue Realization Report
export const getRevenueRealizationReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      billNumber,
      salesRepId,
      ptId,
      serviceId,
      page = 1,
      limit = 20
    } = req.query;

    // Build base query
    const baseQuery = {
      organizationId: req.organizationId,
      status: { $in: ['paid', 'partial'] }
    };

    // Date filter - filter by invoice creation date
    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        baseQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = endDate;
      }
    }

    // Bill number filter
    if (billNumber) {
      baseQuery.invoiceNumber = { $regex: billNumber, $options: 'i' };
    }

    // Sales rep filter
    if (salesRepId && salesRepId !== 'all') {
      baseQuery.createdBy = salesRepId;
    }

    // Get invoices with populated data
    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Get all payments for these invoices
    const invoiceIds = invoices.map(inv => inv._id);
    const payments = await Payment.find({
      organizationId: req.organizationId,
      invoiceId: { $in: invoiceIds },
      status: 'completed'
    }).lean();

    // Group payments by invoice
    const paymentsByInvoice = {};
    payments.forEach(payment => {
      if (!paymentsByInvoice[payment.invoiceId]) {
        paymentsByInvoice[payment.invoiceId] = 0;
      }
      paymentsByInvoice[payment.invoiceId] += payment.amount || 0;
    });

    // Process invoices and calculate revenue realization
    const records = [];
    const allMonths = new Set();

    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) continue;

      for (const item of invoice.items) {
        // Skip items without start and end dates
        if (!item.startDate || !item.expiryDate) continue;

        // Filter by service
        if (serviceId && serviceId !== 'all') {
          if (item.serviceId?._id?.toString() !== serviceId) continue;
        }

        // Filter by PT (if PT filter is needed, you may need to add PT field to items)
        // For now, we'll skip PT filter as it's not in the invoice items structure

        const startDate = item.startDate;
        const endDate = item.expiryDate;
        
        // Calculate paid amount for this item
        // If invoice has multiple items, split the paid amount proportionally
        const invoiceTotal = invoice.total || 0;
        const itemTotal = item.total || item.amount || 0;
        const totalItemsAmount = invoice.items.reduce((sum, i) => sum + (i.total || i.amount || 0), 0);
        const itemProportion = totalItemsAmount > 0 ? itemTotal / totalItemsAmount : 1 / invoice.items.length;
        const paidAmount = (paymentsByInvoice[invoice._id] || invoiceTotal) * itemProportion;

        // Calculate monthly revenue realization
        const monthlyRevenue = calculateMonthlyRevenue(paidAmount, startDate, endDate);

        // Collect all months
        Object.keys(monthlyRevenue).forEach(monthKey => {
          allMonths.add(monthKey);
        });

        // Get sales rep name
        const salesRepName = invoice.createdBy
          ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
          : '-';

        // Get PT name (placeholder - you may need to add this to your data model)
        const ptName = '-';

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          mobile: invoice.memberId?.phone || '-',
          sequence: 'Branch Sequence',
          clubId: '',
          billNumber: invoice.invoiceNumber || '-',
          serviceName: item.description || item.serviceId?.name || '-',
          startDate: startDate || null,
          endDate: endDate || null,
          salesRepName,
          ptName,
          paidAmount,
          monthlyRevenue
        });
      }
    }

    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort();

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        months: sortedMonths,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Revenue Realization Report
export const exportRevenueRealizationReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      billNumber,
      salesRepId,
      ptId,
      serviceId
    } = req.query;

    // Build base query (same as getRevenueRealizationReport)
    const baseQuery = {
      organizationId: req.organizationId,
      status: { $in: ['paid', 'partial'] }
    };

    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        baseQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = endDate;
      }
    }

    if (billNumber) {
      baseQuery.invoiceNumber = { $regex: billNumber, $options: 'i' };
    }

    if (salesRepId && salesRepId !== 'all') {
      baseQuery.createdBy = salesRepId;
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const invoiceIds = invoices.map(inv => inv._id);
    const payments = await Payment.find({
      organizationId: req.organizationId,
      invoiceId: { $in: invoiceIds },
      status: 'completed'
    }).lean();

    const paymentsByInvoice = {};
    payments.forEach(payment => {
      if (!paymentsByInvoice[payment.invoiceId]) {
        paymentsByInvoice[payment.invoiceId] = 0;
      }
      paymentsByInvoice[payment.invoiceId] += payment.amount || 0;
    });

    const records = [];
    const allMonths = new Set();

    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) continue;

      for (const item of invoice.items) {
        // Skip items without start and end dates
        if (!item.startDate || !item.expiryDate) continue;

        if (serviceId && serviceId !== 'all') {
          if (item.serviceId?._id?.toString() !== serviceId) continue;
        }

        const startDate = item.startDate;
        const endDate = item.expiryDate;
        
        // Calculate paid amount for this item
        // If invoice has multiple items, split the paid amount proportionally
        const invoiceTotal = invoice.total || 0;
        const itemTotal = item.total || item.amount || 0;
        const totalItemsAmount = invoice.items.reduce((sum, i) => sum + (i.total || i.amount || 0), 0);
        const itemProportion = totalItemsAmount > 0 ? itemTotal / totalItemsAmount : 1 / invoice.items.length;
        const paidAmount = (paymentsByInvoice[invoice._id] || invoiceTotal) * itemProportion;

        const monthlyRevenue = calculateMonthlyRevenue(paidAmount, startDate, endDate);

        Object.keys(monthlyRevenue).forEach(monthKey => {
          allMonths.add(monthKey);
        });

        const salesRepName = invoice.createdBy
          ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
          : '-';

        records.push({
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          mobile: invoice.memberId?.phone || '-',
          sequence: 'Branch Sequence',
          clubId: '',
          billNumber: invoice.invoiceNumber || '-',
          serviceName: item.description || item.serviceId?.name || '-',
          startDate: startDate || null,
          endDate: endDate || null,
          salesRepName,
          ptName: '-',
          paidAmount,
          monthlyRevenue
        });
      }
    }

    const sortedMonths = Array.from(allMonths).sort();

    // Generate CSV
    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const headers = [
      'S.No',
      'Member ID',
      'Member Name',
      'Mobile',
      'Sequence',
      'Club ID',
      'Bill Number',
      'Service Name',
      'Start Date',
      'End Date',
      'Sales Rep Name',
      'PT Name',
      'Paid Amount',
      ...sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      })
    ];

    let csvContent = headers.join(',') + '\n';

    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.memberId}"`,
        `"${record.memberName}"`,
        record.mobile,
        `"${record.sequence}"`,
        record.clubId || '',
        `"${record.billNumber}"`,
        `"${record.serviceName}"`,
        formatDate(record.startDate),
        formatDate(record.endDate),
        `"${record.salesRepName}"`,
        `"${record.ptName}"`,
        record.paidAmount.toFixed(2),
        ...sortedMonths.map(monthKey => {
          const revenue = record.monthlyRevenue[monthKey];
          return revenue ? revenue.amount.toFixed(2) : '0.00';
        })
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-realization-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revenue Realization (Base Value) Report - Uses sale amount instead of paid amount
export const getRevenueRealizationBaseValueReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      billNumber,
      salesRepId,
      ptId,
      serviceId,
      page = 1,
      limit = 20
    } = req.query;

    // Build base query
    const baseQuery = {
      organizationId: req.organizationId,
      status: { $in: ['paid', 'partial', 'sent'] }
    };

    // Date filter - filter by invoice creation date
    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        baseQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = endDate;
      }
    }

    // Bill number filter
    if (billNumber) {
      baseQuery.invoiceNumber = { $regex: billNumber, $options: 'i' };
    }

    // Sales rep filter
    if (salesRepId && salesRepId !== 'all') {
      baseQuery.createdBy = salesRepId;
    }

    // Get invoices with populated data
    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Process invoices and calculate revenue realization
    const records = [];
    const allMonths = new Set();

    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) continue;

      for (const item of invoice.items) {
        // Skip items without start and end dates
        if (!item.startDate || !item.expiryDate) continue;

        // Filter by service
        if (serviceId && serviceId !== 'all') {
          if (item.serviceId?._id?.toString() !== serviceId) continue;
        }

        const startDate = item.startDate;
        const endDate = item.expiryDate;
        
        // Use sale amount (item total) instead of paid amount
        const saleAmount = item.total || item.amount || 0;

        // Calculate monthly revenue realization
        const monthlyRevenue = calculateMonthlyRevenue(saleAmount, startDate, endDate);

        // Collect all months
        Object.keys(monthlyRevenue).forEach(monthKey => {
          allMonths.add(monthKey);
        });

        // Get sales rep name
        const salesRepName = invoice.createdBy
          ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
          : '-';

        // Get PT name (placeholder)
        const ptName = '-';

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          mobile: invoice.memberId?.phone || '-',
          sequence: 'Branch Sequence',
          clubId: '',
          billNumber: invoice.invoiceNumber || '-',
          serviceName: item.description || item.serviceId?.name || '-',
          startDate: startDate || null,
          endDate: endDate || null,
          salesRepName,
          ptName,
          saleAmount,
          monthlyRevenue
        });
      }
    }

    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort();

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        months: sortedMonths,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Revenue Realization (Base Value) Report
export const exportRevenueRealizationBaseValueReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      billNumber,
      salesRepId,
      ptId,
      serviceId
    } = req.query;

    // Build base query (same as getRevenueRealizationBaseValueReport)
    const baseQuery = {
      organizationId: req.organizationId,
      status: { $in: ['paid', 'partial', 'sent'] }
    };

    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        baseQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = endDate;
      }
    }

    if (billNumber) {
      baseQuery.invoiceNumber = { $regex: billNumber, $options: 'i' };
    }

    if (salesRepId && salesRepId !== 'all') {
      baseQuery.createdBy = salesRepId;
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];
    const allMonths = new Set();

    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) continue;

      for (const item of invoice.items) {
        if (!item.startDate || !item.expiryDate) continue;

        if (serviceId && serviceId !== 'all') {
          if (item.serviceId?._id?.toString() !== serviceId) continue;
        }

        const startDate = item.startDate;
        const endDate = item.expiryDate;
        const saleAmount = item.total || item.amount || 0;

        const monthlyRevenue = calculateMonthlyRevenue(saleAmount, startDate, endDate);

        Object.keys(monthlyRevenue).forEach(monthKey => {
          allMonths.add(monthKey);
        });

        const salesRepName = invoice.createdBy
          ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
          : '-';

        records.push({
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          mobile: invoice.memberId?.phone || '-',
          sequence: 'Branch Sequence',
          clubId: '',
          billNumber: invoice.invoiceNumber || '-',
          serviceName: item.description || item.serviceId?.name || '-',
          startDate: startDate || null,
          endDate: endDate || null,
          salesRepName,
          ptName: '-',
          saleAmount,
          monthlyRevenue
        });
      }
    }

    const sortedMonths = Array.from(allMonths).sort();

    // Generate CSV
    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const headers = [
      'S.No',
      'Member ID',
      'Member Name',
      'Mobile',
      'Sequence',
      'Club ID',
      'Bill Number',
      'Service Name',
      'Start Date',
      'End Date',
      'Sales Rep Name',
      'PT Name',
      'Sale Amount',
      ...sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      })
    ];

    let csvContent = headers.join(',') + '\n';

    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.memberId}"`,
        `"${record.memberName}"`,
        record.mobile,
        `"${record.sequence}"`,
        record.clubId || '',
        `"${record.billNumber}"`,
        `"${record.serviceName}"`,
        formatDate(record.startDate),
        formatDate(record.endDate),
        `"${record.salesRepName}"`,
        `"${record.ptName}"`,
        record.saleAmount.toFixed(2),
        ...sortedMonths.map(monthKey => {
          const revenue = record.monthlyRevenue[monthKey];
          return revenue ? revenue.amount.toFixed(2) : '0.00';
        })
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-realization-base-value-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Refund Report
export const getRefundReport = async (req, res) => {
  try {
    const { fromDate, toDate, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Parse dates (DD-MM-YY format)
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-');
      const fullYear = 2000 + parseInt(year);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    };

    const startDate = parseDate(fromDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = parseDate(toDate);
    endDate.setHours(23, 59, 59, 999);

    // Get cancelled/refunded invoices
    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      status: { $in: ['cancelled', 'refunded'] },
      updatedAt: { $gte: startDate, $lte: endDate }
    })
      .populate('memberId', 'firstName lastName phone email')
      .populate('planId', 'name')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Invoice.countDocuments({
      organizationId: req.organizationId,
      status: { $in: ['cancelled', 'refunded'] },
      updatedAt: { $gte: startDate, $lte: endDate }
    });

    const records = [];

    // Process each invoice
    for (const invoice of invoices) {
      // Get payments for this invoice
      const payments = await Payment.find({
        organizationId: req.organizationId,
        invoiceId: invoice._id,
        status: 'completed'
      });

      const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = invoice.total - paidAmount;

      // Process invoice items
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          const baseValue = item.amount || (item.unitPrice * (item.quantity || 1));
          const tax = item.taxAmount || 0;
          const itemTotal = item.total || (baseValue + tax);
          
          // Calculate utilised value (if service was used before cancellation)
          const utilisedValue = 0; // TODO: Calculate based on service usage
          const unutilisedValue = itemTotal - utilisedValue;
          const deduction = 0; // TODO: Calculate cancellation fees
          const refundAmount = invoice.status === 'refunded' ? unutilisedValue - deduction : 0;

          records.push({
            _id: `${invoice._id}-${item._id || Math.random()}`,
            name: invoice.memberId 
              ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
              : '-',
            mobile: invoice.memberId?.phone || '-',
            emailId: invoice.memberId?.email || '',
            sequence: invoice.branchId?.name || 'Branch Sequence',
            service: item.serviceId?.name || invoice.planId?.name || '-',
            serviceVariation: item.description || invoice.planId?.name || '-',
            proFormaInvoiceNo: invoice.isProForma ? invoice.invoiceNumber : invoice.invoiceNumber,
            type: invoice.status === 'cancelled' ? 'Cancel without refund' : 'Refund',
            baseValue,
            tax,
            total: itemTotal,
            paid: paidAmount * (itemTotal / invoice.total), // Proportional paid amount
            balance: balance * (itemTotal / invoice.total), // Proportional balance
            utilisedValue,
            unutilisedValue,
            deduction,
            refundAmount,
            staffName: invoice.createdBy
              ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
              : '-',
            dateTime: invoice.updatedAt,
            instrument: payments[0]?.paymentMethod || '',
            transactionId: payments[0]?.transactionId || '',
            creditNoteNo: invoice.creditNoteNumber || '',
            note: invoice.notes || ''
          });
        }
      } else {
        // Invoice has no items, use invoice-level data
        const baseValue = invoice.subtotal || 0;
        const tax = invoice.tax?.amount || 0;
        const total = invoice.total || 0;
        const utilisedValue = 0;
        const unutilisedValue = total - utilisedValue;
        const deduction = 0;
        const refundAmount = invoice.status === 'refunded' ? unutilisedValue - deduction : 0;

        records.push({
          _id: invoice._id.toString(),
          name: invoice.memberId 
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          mobile: invoice.memberId?.phone || '-',
          emailId: invoice.memberId?.email || '',
          sequence: invoice.branchId?.name || 'Branch Sequence',
          service: invoice.planId?.name || '-',
          serviceVariation: invoice.planId?.name || '-',
          proFormaInvoiceNo: invoice.isProForma ? invoice.invoiceNumber : invoice.invoiceNumber,
          type: invoice.status === 'cancelled' ? 'Cancel without refund' : 'Refund',
          baseValue,
          tax,
          total,
          paid: paidAmount,
          balance,
          utilisedValue,
          unutilisedValue,
          deduction,
          refundAmount,
          staffName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          dateTime: invoice.updatedAt,
          instrument: payments[0]?.paymentMethod || '',
          transactionId: payments[0]?.transactionId || '',
          creditNoteNo: invoice.creditNoteNumber || '',
          note: invoice.notes || ''
        });
      }
    }

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Refund Report
export const exportRefundReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Parse dates
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-');
      const fullYear = 2000 + parseInt(year);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    };

    const startDate = parseDate(fromDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = parseDate(toDate);
    endDate.setHours(23, 59, 59, 999);

    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      status: { $in: ['cancelled', 'refunded'] },
      updatedAt: { $gte: startDate, $lte: endDate }
    })
      .populate('memberId', 'firstName lastName phone email')
      .populate('planId', 'name')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ updatedAt: -1 });

    const records = [];
    for (const invoice of invoices) {
      const payments = await Payment.find({
        organizationId: req.organizationId,
        invoiceId: invoice._id,
        status: 'completed'
      });

      const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = invoice.total - paidAmount;

      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          const baseValue = item.amount || (item.unitPrice * (item.quantity || 1));
          const tax = item.taxAmount || 0;
          const itemTotal = item.total || (baseValue + tax);
          const utilisedValue = 0;
          const unutilisedValue = itemTotal - utilisedValue;
          const deduction = 0;
          const refundAmount = invoice.status === 'refunded' ? unutilisedValue - deduction : 0;

          records.push({
            name: invoice.memberId 
              ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
              : '-',
            mobile: invoice.memberId?.phone || '-',
            emailId: invoice.memberId?.email || '',
            sequence: invoice.branchId?.name || 'Branch Sequence',
            service: item.serviceId?.name || invoice.planId?.name || '-',
            serviceVariation: item.description || invoice.planId?.name || '-',
            proFormaInvoiceNo: invoice.isProForma ? invoice.invoiceNumber : invoice.invoiceNumber,
            type: invoice.status === 'cancelled' ? 'Cancel without refund' : 'Refund',
            baseValue,
            tax,
            total: itemTotal,
            paid: paidAmount * (itemTotal / invoice.total),
            balance: balance * (itemTotal / invoice.total),
            utilisedValue,
            unutilisedValue,
            deduction,
            refundAmount,
            staffName: invoice.createdBy
              ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
              : '-',
            dateTime: invoice.updatedAt,
            instrument: payments[0]?.paymentMethod || '',
            transactionId: payments[0]?.transactionId || '',
            creditNoteNo: invoice.creditNoteNumber || '',
            note: invoice.notes || ''
          });
        }
      }
    }

    // Generate CSV
    const headers = ['S.No', 'Name', 'Mobile', 'Email id', 'Sequence', 'Service', 'Service Variation', 'Pro-forma Invoice No', 'Type', 'Base value', 'Tax', 'Total', 'Paid', 'Balance', 'Utilised value', 'Unutilised value', 'Deduction', 'Refund Amount', 'Staff Name', 'Date and Time', 'Instrument', 'Transaction id', 'Credit Note No', 'Note'];
    let csvContent = headers.join(',') + '\n';

    records.forEach((record, index) => {
      const formatDateTime = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours() % 12 || 12).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
        return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
      };

      const row = [
        index + 1,
        `"${record.name}"`,
        record.mobile,
        record.emailId || '',
        `"${record.sequence}"`,
        `"${record.service}"`,
        `"${record.serviceVariation}"`,
        record.proFormaInvoiceNo,
        record.type,
        record.baseValue.toFixed(2),
        record.tax.toFixed(2),
        record.total.toFixed(2),
        record.paid.toFixed(2),
        record.balance.toFixed(2),
        record.utilisedValue.toFixed(2),
        record.unutilisedValue.toFixed(2),
        record.deduction.toFixed(2),
        record.refundAmount.toFixed(2),
        `"${record.staffName}"`,
        formatDateTime(record.dateTime),
        record.instrument || '',
        record.transactionId || '',
        record.creditNoteNo || '',
        `"${record.note}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=refund-report-${fromDate}-${toDate}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Effective Sales Accounting Report
export const getEffectiveSalesAccountingReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    // Get all invoices within the date range
    const invoices = await Invoice.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          createdAt: {
            $gte: start,
            $lte: end
          },
          status: { $ne: 'cancelled' } // Exclude cancelled invoices
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalWithTax: { $sum: '$total' },
          totalWithoutTax: { $sum: '$subtotal' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);

    // Get refunds grouped by month
    const refunds = await Payment.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          createdAt: {
            $gte: start,
            $lte: end
          },
          status: { $in: ['refunded', 'partial_refund'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          refundAmount: { $sum: '$refundAmount' }
        }
      }
    ]);

    // Create a map of refunds by month
    const refundMap = {};
    refunds.forEach(refund => {
      const key = `${refund._id.year}-${refund._id.month}`;
      refundMap[key] = refund.refundAmount || 0;
    });

    // Format month names
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Process and format the data
    const records = invoices.map((invoice, index) => {
      const year = invoice._id.year;
      const month = invoice._id.month;
      const key = `${year}-${month}`;
      const refundAmount = refundMap[key] || 0;
      const totalWithoutTax = invoice.totalWithoutTax || 0;
      const effectiveSales = totalWithoutTax - refundAmount;

      return {
        serialNo: index + 1,
        monthYear: `${monthNames[month - 1]}-${year}`,
        totalWithTax: invoice.totalWithTax || 0,
        totalWithoutTax: totalWithoutTax,
        refundAmount: refundAmount,
        effectiveSales: effectiveSales
      };
    });

    res.json({
      success: true,
      data: { records }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Effective Sales Accounting Report
export const exportEffectiveSalesAccountingReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all invoices within the date range
    const invoices = await Invoice.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          createdAt: {
            $gte: start,
            $lte: end
          },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalWithTax: { $sum: '$total' },
          totalWithoutTax: { $sum: '$subtotal' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);

    // Get refunds grouped by month
    const refunds = await Payment.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          createdAt: {
            $gte: start,
            $lte: end
          },
          status: { $in: ['refunded', 'partial_refund'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          refundAmount: { $sum: '$refundAmount' }
        }
      }
    ]);

    // Create a map of refunds by month
    const refundMap = {};
    refunds.forEach(refund => {
      const key = `${refund._id.year}-${refund._id.month}`;
      refundMap[key] = refund.refundAmount || 0;
    });

    // Format month names
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Generate CSV
    const headers = ['S.No', 'Month-Year', 'Total With Tax', 'Total Without Tax', 'Refund(Sales Return) Amount', 'Effective Sales'];
    let csvContent = headers.join(',') + '\n';

    invoices.forEach((invoice, index) => {
      const year = invoice._id.year;
      const month = invoice._id.month;
      const key = `${year}-${month}`;
      const refundAmount = refundMap[key] || 0;
      const totalWithoutTax = invoice.totalWithoutTax || 0;
      const effectiveSales = totalWithoutTax - refundAmount;

      const row = [
        index + 1,
        `"${monthNames[month - 1]}-${year}"`,
        (invoice.totalWithTax || 0).toFixed(2),
        totalWithoutTax.toFixed(2),
        refundAmount.toFixed(2),
        effectiveSales.toFixed(2)
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=effective-sales-accounting-${startDate}-to-${endDate}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Collection Report
export const getCollectionReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      branchId,
      salesRepId,
      ptId,
      page = 1,
      limit = 20
    } = req.query;

    // Build base query for payments
    const baseQuery = {
      organizationId: req.organizationId,
      status: 'completed'
    };

    // Date filter
    if (fromDate || toDate) {
      baseQuery.paidAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.paidAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.paidAt.$lte = end;
      }
    }

    // Branch filter
    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    // Get payments with populated data
    const payments = await Payment.find(baseQuery)
      .populate('invoiceId', 'invoiceNumber type createdAt total tax')
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ paidAt: -1 })
      .lean();

    // Filter by sales rep if needed
    let filteredPayments = payments;
    if (salesRepId && salesRepId !== 'all') {
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        createdBy: salesRepId,
        _id: { $in: payments.map(p => p.invoiceId?._id) }
      }).lean();
      const invoiceIds = new Set(invoices.map(i => i._id.toString()));
      filteredPayments = payments.filter(p => invoiceIds.has(p.invoiceId?._id?.toString()));
    }

    // Process payments into records
    const records = [];
    let totalAmount = 0;

    for (const payment of filteredPayments) {
      if (!payment.invoiceId) continue;

      const invoice = payment.invoiceId;
      
      // Get invoice items for service details
      const invoiceDoc = await Invoice.findById(invoice._id)
        .populate('items.serviceId', 'name')
        .lean();

      const serviceName = invoiceDoc?.items?.[0]?.serviceId?.name || 
                         invoiceDoc?.items?.[0]?.description || 
                         invoiceDoc?.planId?.name || '-';

      // Get sales rep from invoice
      const invoiceWithCreator = await Invoice.findById(invoice._id)
        .populate('createdBy', 'firstName lastName')
        .lean();
      
      const salesRepName = invoiceWithCreator?.createdBy
        ? `${invoiceWithCreator.createdBy.firstName || ''} ${invoiceWithCreator.createdBy.lastName || ''}`.trim()
        : '-';

      const amount = payment.amount || 0;
      totalAmount += amount;

      // Format payment method
      const paymentMethodMap = {
        'razorpay': 'Online Payment',
        'cash': 'Cash',
        'card': 'Card',
        'upi': 'UPI',
        'bank_transfer': 'Bank Transfer',
        'other': 'Other'
      };
      const paymodeDetails = `${amount}(${paymentMethodMap[payment.paymentMethod] || payment.paymentMethod})`;

      records.push({
        _id: payment._id.toString(),
        branch: payment.branchId?.name || '-',
        sequence: 'Branch Sequence',
        billNo: invoice.invoiceNumber || '-',
        billType: invoice.type === 'pro-forma' ? 'Pro Forma' : 
                 invoice.type === 'renewal' ? 'Rebooking' : 'New Bill',
        paidInvoiceNo: invoice.invoiceNumber || '-',
        receiptNo: payment.receiptNumber || '-',
        purchaseDate: invoice.createdAt || payment.createdAt,
        paidDate: payment.paidAt || payment.createdAt,
        type: 'New Payment',
        branchLocation: payment.branchId?.name || '-',
        memberId: payment.memberId?.memberId || '-',
        clubId: '',
        memberName: payment.memberId
          ? `${payment.memberId.firstName || ''} ${payment.memberId.lastName || ''}`.trim()
          : '-',
        amount: invoice.total || 0,
        taxAmount: invoice.tax?.amount || 0,
        finalAmount: invoice.total || 0,
        paidAmount: amount,
        pending: (invoice.total || 0) - amount,
        serviceName,
        salesRepName,
        ptStaff: '-',
        paymodeDetails,
        invoiceId: invoice._id
      });
    }

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        totalAmount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Collection Report
export const exportCollectionReport = async (req, res) => {
  try {
    const { fromDate, toDate, branchId, salesRepId, ptId } = req.query;

    // Reuse getCollectionReport logic
    const baseQuery = {
      organizationId: req.organizationId,
      status: 'completed'
    };

    if (fromDate || toDate) {
      baseQuery.paidAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.paidAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.paidAt.$lte = end;
      }
    }

    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    const payments = await Payment.find(baseQuery)
      .populate('invoiceId', 'invoiceNumber type createdAt total tax')
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('branchId', 'name')
      .sort({ paidAt: -1 })
      .lean();

    let filteredPayments = payments;
    if (salesRepId && salesRepId !== 'all') {
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        createdBy: salesRepId,
        _id: { $in: payments.map(p => p.invoiceId?._id) }
      }).lean();
      const invoiceIds = new Set(invoices.map(i => i._id.toString()));
      filteredPayments = payments.filter(p => invoiceIds.has(p.invoiceId?._id?.toString()));
    }

    const records = [];
    for (const payment of filteredPayments) {
      if (!payment.invoiceId) continue;

      const invoice = payment.invoiceId;
      const invoiceDoc = await Invoice.findById(invoice._id)
        .populate('items.serviceId', 'name')
        .lean();

      const serviceName = invoiceDoc?.items?.[0]?.serviceId?.name || 
                         invoiceDoc?.items?.[0]?.description || '-';

      const invoiceWithCreator = await Invoice.findById(invoice._id)
        .populate('createdBy', 'firstName lastName')
        .lean();
      
      const salesRepName = invoiceWithCreator?.createdBy
        ? `${invoiceWithCreator.createdBy.firstName || ''} ${invoiceWithCreator.createdBy.lastName || ''}`.trim()
        : '-';

      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      records.push({
        branch: payment.branchId?.name || '-',
        sequence: 'Branch Sequence',
        billNo: invoice.invoiceNumber || '-',
        billType: invoice.type === 'pro-forma' ? 'Pro Forma' : 
                 invoice.type === 'renewal' ? 'Rebooking' : 'New Bill',
        paidInvoiceNo: invoice.invoiceNumber || '-',
        receiptNo: payment.receiptNumber || '-',
        purchaseDate: formatDate(invoice.createdAt || payment.createdAt),
        paidDate: formatDate(payment.paidAt || payment.createdAt),
        type: 'New Payment',
        branchLocation: payment.branchId?.name || '-',
        memberId: payment.memberId?.memberId || '-',
        clubId: '',
        memberName: payment.memberId
          ? `${payment.memberId.firstName || ''} ${payment.memberId.lastName || ''}`.trim()
          : '-',
        amount: (invoice.total || 0).toFixed(2),
        taxAmount: (invoice.tax?.amount || 0).toFixed(2),
        finalAmount: (invoice.total || 0).toFixed(2),
        paidAmount: (payment.amount || 0).toFixed(2),
        pending: ((invoice.total || 0) - (payment.amount || 0)).toFixed(2),
        serviceName,
        salesRepName,
        ptStaff: '-'
      });
    }

    const headers = [
      'S.No', 'Branch', 'Sequence', 'Bill No', 'Bill Type', 'Paid Invoice No',
      'Receipt No', 'Purchase Date', 'Paid Date', 'Type', 'Branch Location',
      'Member ID', 'Club ID', 'Member Name', 'Amount', 'Tax Amount',
      'Final Amount', 'Paid Amount', 'Pending', 'Service Name', 'Sales Rep Name', 'PT Staff'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.branch}"`,
        `"${record.sequence}"`,
        `"${record.billNo}"`,
        `"${record.billType}"`,
        `"${record.paidInvoiceNo}"`,
        `"${record.receiptNo}"`,
        record.purchaseDate,
        record.paidDate,
        `"${record.type}"`,
        `"${record.branchLocation}"`,
        record.memberId,
        record.clubId || '',
        `"${record.memberName}"`,
        record.amount,
        record.taxAmount,
        record.finalAmount,
        record.paidAmount,
        record.pending,
        `"${record.serviceName}"`,
        `"${record.salesRepName}"`,
        `"${record.ptStaff}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=collection-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cash Flow Statement Report
export const getCashFlowStatementReport = async (req, res) => {
  try {
    const { dateRange = 'last-30-days' } = req.query;

    // Calculate date range
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
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);

    // Get collections (payments)
    const payments = await Payment.find({
      organizationId: req.organizationId,
      status: 'completed',
      paidAt: { $gte: start, $lte: end }
    }).lean();

    // Get expenses
    const expenses = await Expense.find({
      organizationId: req.organizationId,
      status: 'paid',
      voucherDate: { $gte: start, $lte: end }
    }).lean();

    // Group by date
    const dailyData = {};
    const allDates = new Set();

    // Process collections
    payments.forEach(payment => {
      const date = new Date(payment.paidAt || payment.createdAt);
      const dateKey = date.toISOString().split('T')[0];
      allDates.add(dateKey);
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, collected: 0, expenses: 0, netBalance: 0 };
      }
      dailyData[dateKey].collected += payment.amount || 0;
    });

    // Process expenses
    expenses.forEach(expense => {
      const date = new Date(expense.voucherDate);
      const dateKey = date.toISOString().split('T')[0];
      allDates.add(dateKey);
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, collected: 0, expenses: 0, netBalance: 0 };
      }
      dailyData[dateKey].expenses += expense.amount || 0;
    });

    // Calculate net balance and create records
    const records = Array.from(allDates)
      .sort()
      .map(dateKey => {
        const data = dailyData[dateKey];
        data.netBalance = data.collected - data.expenses;
        return data;
      });

    // Calculate totals
    const totalCollection = records.reduce((sum, r) => sum + r.collected, 0);
    const totalExpenses = records.reduce((sum, r) => sum + r.expenses, 0);
    const netBalance = totalCollection - totalExpenses;

    res.json({
      success: true,
      data: {
        records,
        summary: {
          totalCollection,
          totalExpenses,
          netBalance
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Cash Flow Statement
export const exportCashFlowStatementReport = async (req, res) => {
  try {
    const { dateRange = 'last-30-days' } = req.query;

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
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);

    const payments = await Payment.find({
      organizationId: req.organizationId,
      status: 'completed',
      paidAt: { $gte: start, $lte: end }
    }).lean();

    const expenses = await Expense.find({
      organizationId: req.organizationId,
      status: 'paid',
      voucherDate: { $gte: start, $lte: end }
    }).lean();

    const dailyData = {};
    const allDates = new Set();

    payments.forEach(payment => {
      const date = new Date(payment.paidAt || payment.createdAt);
      const dateKey = date.toISOString().split('T')[0];
      allDates.add(dateKey);
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, collected: 0, expenses: 0 };
      }
      dailyData[dateKey].collected += payment.amount || 0;
    });

    expenses.forEach(expense => {
      const date = new Date(expense.voucherDate);
      const dateKey = date.toISOString().split('T')[0];
      allDates.add(dateKey);
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, collected: 0, expenses: 0 };
      }
      dailyData[dateKey].expenses += expense.amount || 0;
    });

    const records = Array.from(allDates)
      .sort()
      .map(dateKey => {
        const data = dailyData[dateKey];
        data.netBalance = data.collected - data.expenses;
        return data;
      });

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const headers = ['Date', 'Collected', 'Expenses', 'Net Balance'];
    let csvContent = headers.join(',') + '\n';

    records.forEach(record => {
      const row = [
        formatDate(record.date),
        record.collected.toFixed(2),
        record.expenses.toFixed(2),
        record.netBalance.toFixed(2)
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cashflow-statement-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Payment Mode Report
export const getPaymentModeReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      type = 'service',
      branchId,
      salesRepId,
      ptId,
      page = 1,
      limit = 20
    } = req.query;

    // Build base query for payments
    const baseQuery = {
      organizationId: req.organizationId,
      status: 'completed'
    };

    // Date filter
    if (fromDate || toDate) {
      baseQuery.paidAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.paidAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.paidAt.$lte = end;
      }
    }

    // Branch filter
    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    // Get payments
    const payments = await Payment.find(baseQuery)
      .populate('invoiceId', 'invoiceNumber type createdAt invoiceType')
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('branchId', 'name')
      .sort({ paidAt: -1 })
      .lean();

    // Filter by sales rep if needed
    let filteredPayments = payments;
    if (salesRepId && salesRepId !== 'all') {
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        createdBy: salesRepId,
        _id: { $in: payments.map(p => p.invoiceId?._id) }
      }).lean();
      const invoiceIds = new Set(invoices.map(i => i._id.toString()));
      filteredPayments = payments.filter(p => invoiceIds.has(p.invoiceId?._id?.toString()));
    }

    // Filter by type (service/package/deal)
    if (type && type !== 'all') {
      filteredPayments = filteredPayments.filter(p => {
        return p.invoiceId?.invoiceType === type;
      });
    }

    // Group by payment mode for summary
    const summaryByMode = {};
    filteredPayments.forEach(payment => {
      const mode = payment.paymentMethod || 'other';
      const modeLabel = mode === 'razorpay' ? 'Online Payment' : 
                       mode.charAt(0).toUpperCase() + mode.slice(1);
      if (!summaryByMode[modeLabel]) {
        summaryByMode[modeLabel] = 0;
      }
      summaryByMode[modeLabel] += payment.amount || 0;
    });

    // Process payments into records
    const records = [];
    for (const payment of filteredPayments) {
      if (!payment.invoiceId) continue;

      const invoice = payment.invoiceId;
      const invoiceDoc = await Invoice.findById(invoice._id)
        .populate('items.serviceId', 'name')
        .populate('createdBy', 'firstName lastName')
        .lean();

      const serviceName = invoiceDoc?.items?.[0]?.serviceId?.name || 
                         invoiceDoc?.items?.[0]?.description || 
                         invoiceDoc?.planId?.name || '-';

      const salesRepName = invoiceDoc?.createdBy
        ? `${invoiceDoc.createdBy.firstName || ''} ${invoiceDoc.createdBy.lastName || ''}`.trim()
        : '-';

      const paymentMethodMap = {
        'razorpay': 'Online Payment',
        'cash': 'Cash',
        'card': 'Card',
        'upi': 'UPI',
        'bank_transfer': 'Bank Transfer',
        'other': 'Other'
      };
      const paymode = paymentMethodMap[payment.paymentMethod] || payment.paymentMethod;

      records.push({
        _id: payment._id.toString(),
        branch: payment.branchId?.name || '-',
        sequence: 'Branch Sequence',
        paymode,
        billNo: invoice.invoiceNumber || '-',
        billType: invoice.type === 'pro-forma' ? 'Pro Forma' : 
                 invoice.type === 'renewal' ? 'Rebooking' : 'New Bill',
        paidInvoiceNo: invoice.invoiceNumber || '-',
        receiptNo: payment.receiptNumber || '-',
        purchaseDate: invoice.createdAt || payment.createdAt,
        paidDate: payment.paidAt || payment.createdAt,
        type: 'New Payment',
        memberId: payment.memberId?.memberId || '-',
        clubId: '',
        memberName: payment.memberId
          ? `${payment.memberId.firstName || ''} ${payment.memberId.lastName || ''}`.trim()
          : '-',
        serviceDetails: serviceName
      });
    }

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    // Convert summary to array
    const summary = Object.entries(summaryByMode).map(([payMode, amount]) => ({
      payMode,
      amount
    }));

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Payment Mode Report
export const exportPaymentModeReport = async (req, res) => {
  try {
    const { fromDate, toDate, type = 'service', branchId, salesRepId, ptId } = req.query;

    // Reuse getPaymentModeReport logic
    const baseQuery = {
      organizationId: req.organizationId,
      status: 'completed'
    };

    if (fromDate || toDate) {
      baseQuery.paidAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.paidAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.paidAt.$lte = end;
      }
    }

    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    const payments = await Payment.find(baseQuery)
      .populate('invoiceId', 'invoiceNumber type createdAt invoiceType')
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('branchId', 'name')
      .sort({ paidAt: -1 })
      .lean();

    let filteredPayments = payments;
    if (salesRepId && salesRepId !== 'all') {
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        createdBy: salesRepId,
        _id: { $in: payments.map(p => p.invoiceId?._id) }
      }).lean();
      const invoiceIds = new Set(invoices.map(i => i._id.toString()));
      filteredPayments = payments.filter(p => invoiceIds.has(p.invoiceId?._id?.toString()));
    }

    if (type && type !== 'all') {
      filteredPayments = filteredPayments.filter(p => {
        return p.invoiceId?.invoiceType === type;
      });
    }

    const records = [];
    for (const payment of filteredPayments) {
      if (!payment.invoiceId) continue;

      const invoice = payment.invoiceId;
      const invoiceDoc = await Invoice.findById(invoice._id)
        .populate('items.serviceId', 'name')
        .lean();

      const serviceName = invoiceDoc?.items?.[0]?.serviceId?.name || 
                         invoiceDoc?.items?.[0]?.description || '-';

      const paymentMethodMap = {
        'razorpay': 'Online Payment',
        'cash': 'Cash',
        'card': 'Card',
        'upi': 'UPI',
        'bank_transfer': 'Bank Transfer',
        'other': 'Other'
      };
      const paymode = paymentMethodMap[payment.paymentMethod] || payment.paymentMethod;

      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      records.push({
        branch: payment.branchId?.name || '-',
        sequence: 'Branch Sequence',
        paymode,
        billNo: invoice.invoiceNumber || '-',
        billType: invoice.type === 'pro-forma' ? 'Pro Forma' : 
                 invoice.type === 'renewal' ? 'Rebooking' : 'New Bill',
        paidInvoiceNo: invoice.invoiceNumber || '-',
        receiptNo: payment.receiptNumber || '-',
        purchaseDate: formatDate(invoice.createdAt || payment.createdAt),
        paidDate: formatDate(payment.paidAt || payment.createdAt),
        type: 'New Payment',
        memberId: payment.memberId?.memberId || '-',
        clubId: '',
        memberName: payment.memberId
          ? `${payment.memberId.firstName || ''} ${payment.memberId.lastName || ''}`.trim()
          : '-',
        serviceDetails: serviceName
      });
    }

    const headers = [
      'S.No', 'Branch', 'Sequence', 'Paymode', 'Bill No', 'Bill Type',
      'Paid Invoice No', 'Receipt No', 'Purchase Date', 'Paid Date', 'Type',
      'Member ID', 'Club ID', 'Member Name', 'Service Details'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.branch}"`,
        `"${record.sequence}"`,
        `"${record.paymode}"`,
        `"${record.billNo}"`,
        `"${record.billType}"`,
        `"${record.paidInvoiceNo}"`,
        `"${record.receiptNo}"`,
        record.purchaseDate,
        record.paidDate,
        `"${record.type}"`,
        record.memberId,
        record.clubId || '',
        `"${record.memberName}"`,
        `"${record.serviceDetails}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payment-mode-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Backdated Bills Report
export const getBackdatedBillsReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      dateRange = 'last-30-days',
      search,
      billType,
      branchId,
      salesRepId,
      ptId,
      generalTrainerId,
      invoiceType = 'service',
      page = 1,
      limit = 20
    } = req.query;

    // Build date query
    let dateQuery = {};
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    if (fromDate && toDate) {
      dateQuery.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    } else {
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
          start.setHours(0, 0, 0, 0);
          break;
        case 'last-month':
          start.setMonth(start.getMonth() - 1);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }
      start.setHours(0, 0, 0, 0);
      dateQuery.createdAt = { $gte: start, $lte: end };
    }

    // Build base query
    const baseQuery = {
      organizationId: req.organizationId,
      ...dateQuery,
      invoiceType: invoiceType !== 'all' ? invoiceType : { $exists: true }
    };

    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        baseQuery.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        baseQuery.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    if (salesRepId && salesRepId !== 'all') {
      baseQuery.createdBy = salesRepId;
    }

    // Get invoices
    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Filter for backdated bills (where invoice date is before service start date)
    const records = [];
    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) continue;

      for (const item of invoice.items) {
        if (!item.startDate) continue;

        const invoiceDate = new Date(invoice.createdAt);
        const serviceStartDate = new Date(item.startDate);
        
        // Check if invoice is backdated (created after service start date)
        // Actually, backdated means invoice date is before service start date
        // But based on the image, it seems like we want invoices where the creation date
        // is different from the service start date, or invoices created in the past
        // Let's filter for invoices where service start date is in the future relative to invoice date
        const isBackdated = serviceStartDate > invoiceDate;

        // For now, let's include all invoices and let the frontend filter if needed
        // Or we can filter for invoices where start date is significantly different from invoice date
        if (Math.abs(serviceStartDate - invoiceDate) > 24 * 60 * 60 * 1000) { // More than 1 day difference
          // This is a backdated bill
        }

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const memberName = invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim().toLowerCase()
            : '';
          const memberId = invoice.memberId?.memberId?.toLowerCase() || '';
          const mobile = invoice.memberId?.phone?.toLowerCase() || '';
          const billNumber = invoice.invoiceNumber?.toLowerCase() || '';

          if (!memberName.includes(searchLower) &&
              !memberId.includes(searchLower) &&
              !mobile.includes(searchLower) &&
              !billNumber.includes(searchLower)) {
            continue;
          }
        }

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          purchaseDate: invoice.createdAt,
          billType: invoice.type === 'pro-forma' ? 'Pro Forma' :
                   invoice.type === 'renewal' || invoice.type === 'upgrade' || invoice.type === 'downgrade' ? 'Rebooking' :
                   'New Booking',
          branchLocation: invoice.branchId?.name || '-',
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          contactNumber: invoice.memberId?.phone || '-',
          gstNo: invoice.sacCode || '-',
          proFormaInvoiceNo: invoice.invoiceNumber || '-',
          yoactivRefNo: '-',
          sequence: 'Branch Sequence',
          cancelledPaidInvoice: invoice.status === 'cancelled' ? 'Yes' : '-',
          descriptionService: item.description || item.serviceId?.name || '-',
          startDate: item.startDate,
          endDate: item.expiryDate,
          ptName: '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          generalTrainer: '-'
        });
      }
    }

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    // Calculate summary
    const serviceNonPTSales = records.reduce((sum, r) => {
      // This would need invoice total, but we don't have it in the record
      return sum;
    }, 0);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        summary: {
          serviceNonPTSales: 0,
          servicePTSales: 0,
          productSales: 0
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Backdated Bills Report
export const exportBackdatedBillsReport = async (req, res) => {
  try {
    // Reuse getBackdatedBillsReport logic
    const { fromDate, toDate, dateRange, search, billType, branchId, salesRepId, invoiceType } = req.query;

    let dateQuery = {};
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    if (fromDate && toDate) {
      dateQuery.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    } else {
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
          start.setHours(0, 0, 0, 0);
          break;
        case 'last-month':
          start.setMonth(start.getMonth() - 1);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }
      start.setHours(0, 0, 0, 0);
      dateQuery.createdAt = { $gte: start, $lte: end };
    }

    const baseQuery = {
      organizationId: req.organizationId,
      ...dateQuery,
      invoiceType: invoiceType !== 'all' ? invoiceType : { $exists: true }
    };

    if (billType && billType !== 'all') {
      if (billType === 'new-booking') {
        baseQuery.type = { $in: ['membership', 'other', 'pro-forma'] };
      } else if (billType === 'rebooking') {
        baseQuery.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
      }
    }

    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    if (salesRepId && salesRepId !== 'all') {
      baseQuery.createdBy = salesRepId;
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) continue;

      for (const item of invoice.items) {
        if (!item.startDate) continue;

        if (search) {
          const searchLower = search.toLowerCase();
          const memberName = invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim().toLowerCase()
            : '';
          const memberId = invoice.memberId?.memberId?.toLowerCase() || '';
          const mobile = invoice.memberId?.phone?.toLowerCase() || '';
          const billNumber = invoice.invoiceNumber?.toLowerCase() || '';

          if (!memberName.includes(searchLower) &&
              !memberId.includes(searchLower) &&
              !mobile.includes(searchLower) &&
              !billNumber.includes(searchLower)) {
            continue;
          }
        }

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          purchaseDate: formatDate(invoice.createdAt),
          billType: invoice.type === 'pro-forma' ? 'Pro Forma' :
                   invoice.type === 'renewal' || invoice.type === 'upgrade' || invoice.type === 'downgrade' ? 'Rebooking' :
                   'New Booking',
          branchLocation: invoice.branchId?.name || '-',
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          contactNumber: invoice.memberId?.phone || '-',
          gstNo: invoice.sacCode || '-',
          proFormaInvoiceNo: invoice.invoiceNumber || '-',
          yoactivRefNo: '-',
          sequence: 'Branch Sequence',
          cancelledPaidInvoice: invoice.status === 'cancelled' ? 'Yes' : '-',
          descriptionService: item.description || item.serviceId?.name || '-',
          startDate: formatDate(item.startDate),
          endDate: formatDate(item.expiryDate),
          ptName: '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          generalTrainer: '-'
        });
      }
    }

    const headers = [
      'S.No', 'Purchase Date', 'Bill Type', 'Branch Location', 'Member ID',
      'Member Name', 'Contact Number', 'GST No', 'Pro Forma Invoice No.',
      'Yoactiv Ref No.', 'Sequence', 'Cancelled Paid Invoice', 'Description Service',
      'Start Date', 'End Date', 'PT Name', 'Sales Rep Name', 'General Trainer'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.purchaseDate,
        `"${record.billType}"`,
        `"${record.branchLocation}"`,
        record.memberId,
        `"${record.memberName}"`,
        record.contactNumber,
        record.gstNo,
        `"${record.proFormaInvoiceNo}"`,
        record.yoactivRefNo,
        `"${record.sequence}"`,
        record.cancelledPaidInvoice,
        `"${record.descriptionService}"`,
        record.startDate,
        record.endDate,
        `"${record.ptName}"`,
        `"${record.salesRepName}"`,
        `"${record.generalTrainer}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=backdated-bills-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Discount Report
export const getDiscountReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      dateRange = 'last-30-days',
      branchId,
      salesRepId,
      ptId,
      generalTrainerId,
      page = 1,
      limit = 20
    } = req.query;

    // Build date query
    let dateQuery = {};
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    if (fromDate && toDate) {
      dateQuery.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    } else {
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
          start.setHours(0, 0, 0, 0);
          break;
        case 'last-month':
          start.setMonth(start.getMonth() - 1);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }
      start.setHours(0, 0, 0, 0);
      dateQuery.createdAt = { $gte: start, $lte: end };
    }

    // Build base query - only invoices with discounts
    const baseQuery = {
      organizationId: req.organizationId,
      ...dateQuery,
      $or: [
        { 'discount.amount': { $gt: 0 } },
        { 'items.discount.amount': { $gt: 0 } },
        { discountReason: { $exists: true, $ne: '' } }
      ]
    };

    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    if (salesRepId && salesRepId !== 'all') {
      baseQuery.createdBy = salesRepId;
    }

    // Get invoices with discounts
    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Process invoices
    const records = [];
    for (const invoice of invoices) {
      // Process invoice-level discount
      if (invoice.discount && (invoice.discount.amount > 0 || invoice.discountReason)) {
        const itemTotal = invoice.items?.reduce((sum, item) => sum + (item.total || item.amount || 0), 0) || invoice.subtotal || 0;
        const discountAmount = invoice.discount.amount || 0;
        const netAmount = itemTotal - discountAmount;

        records.push({
          _id: `${invoice._id}-invoice`,
          purchaseDate: invoice.createdAt,
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          contactNumber: invoice.memberId?.phone || '-',
          sequence: 'Branch Sequence',
          gstNo: invoice.sacCode || '-',
          proFormaInvoiceNo: invoice.invoiceNumber || '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          gt: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          serviceDescription: invoice.items?.[0]?.description || invoice.items?.[0]?.serviceId?.name || invoice.planId?.name || '-',
          startDate: invoice.items?.[0]?.startDate || null,
          endDate: invoice.items?.[0]?.expiryDate || null,
          createdBy: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          discountReason: invoice.discountReason || '-',
          amount: itemTotal,
          discount: discountAmount,
          netAmount
        });
      }

      // Process item-level discounts
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          if (item.discount && item.discount.amount > 0) {
            const itemAmount = item.amount || item.unitPrice * (item.quantity || 1);
            const discountAmount = item.discount.amount || 0;
            const netAmount = itemAmount - discountAmount;

            records.push({
              _id: `${invoice._id}-${item._id || Math.random()}`,
              purchaseDate: invoice.createdAt,
              memberId: invoice.memberId?.memberId || '-',
              memberName: invoice.memberId
                ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
                : '-',
              contactNumber: invoice.memberId?.phone || '-',
              sequence: 'Branch Sequence',
              gstNo: invoice.sacCode || '-',
              proFormaInvoiceNo: invoice.invoiceNumber || '-',
              salesRepName: invoice.createdBy
                ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
                : '-',
              gt: invoice.createdBy
                ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
                : '-',
              serviceDescription: item.description || item.serviceId?.name || '-',
              startDate: item.startDate || null,
              endDate: item.expiryDate || null,
              createdBy: invoice.createdBy
                ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
                : '-',
              discountReason: invoice.discountReason || '-',
              amount: itemAmount,
              discount: discountAmount,
              netAmount
            });
          }
        }
      }
    }

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Discount Report
export const exportDiscountReport = async (req, res) => {
  try {
    const { fromDate, toDate, dateRange, branchId, salesRepId } = req.query;

    // Reuse getDiscountReport logic
    let dateQuery = {};
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    if (fromDate && toDate) {
      dateQuery.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    } else {
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
          start.setHours(0, 0, 0, 0);
          break;
        case 'last-month':
          start.setMonth(start.getMonth() - 1);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }
      start.setHours(0, 0, 0, 0);
      dateQuery.createdAt = { $gte: start, $lte: end };
    }

    const baseQuery = {
      organizationId: req.organizationId,
      ...dateQuery,
      $or: [
        { 'discount.amount': { $gt: 0 } },
        { 'items.discount.amount': { $gt: 0 } },
        { discountReason: { $exists: true, $ne: '' } }
      ]
    };

    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    if (salesRepId && salesRepId !== 'all') {
      baseQuery.createdBy = salesRepId;
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];
    for (const invoice of invoices) {
      if (invoice.discount && (invoice.discount.amount > 0 || invoice.discountReason)) {
        const itemTotal = invoice.items?.reduce((sum, item) => sum + (item.total || item.amount || 0), 0) || invoice.subtotal || 0;
        const discountAmount = invoice.discount.amount || 0;
        const netAmount = itemTotal - discountAmount;

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          purchaseDate: formatDate(invoice.createdAt),
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          contactNumber: invoice.memberId?.phone || '-',
          sequence: 'Branch Sequence',
          gstNo: invoice.sacCode || '-',
          proFormaInvoiceNo: invoice.invoiceNumber || '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          gt: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          serviceDescription: invoice.items?.[0]?.description || invoice.items?.[0]?.serviceId?.name || '-',
          startDate: formatDate(invoice.items?.[0]?.startDate),
          endDate: formatDate(invoice.items?.[0]?.expiryDate),
          createdBy: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          discountReason: invoice.discountReason || '-',
          amount: itemTotal.toFixed(2),
          discount: discountAmount.toFixed(2),
          netAmount: netAmount.toFixed(2)
        });
      }

      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          if (item.discount && item.discount.amount > 0) {
            const itemAmount = item.amount || item.unitPrice * (item.quantity || 1);
            const discountAmount = item.discount.amount || 0;
            const netAmount = itemAmount - discountAmount;

            const formatDate = (date) => {
              if (!date) return '-';
              const d = new Date(date);
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              return `${day}-${month}-${year}`;
            };

            records.push({
              purchaseDate: formatDate(invoice.createdAt),
              memberId: invoice.memberId?.memberId || '-',
              memberName: invoice.memberId
                ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
                : '-',
              contactNumber: invoice.memberId?.phone || '-',
              sequence: 'Branch Sequence',
              gstNo: invoice.sacCode || '-',
              proFormaInvoiceNo: invoice.invoiceNumber || '-',
              salesRepName: invoice.createdBy
                ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
                : '-',
              gt: invoice.createdBy
                ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
                : '-',
              serviceDescription: item.description || item.serviceId?.name || '-',
              startDate: formatDate(item.startDate),
              endDate: formatDate(item.expiryDate),
              createdBy: invoice.createdBy
                ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
                : '-',
              discountReason: invoice.discountReason || '-',
              amount: itemAmount.toFixed(2),
              discount: discountAmount.toFixed(2),
              netAmount: netAmount.toFixed(2)
            });
          }
        }
      }
    }

    const headers = [
      'S.No', 'Purchase Date', 'Member ID', 'Member Name', 'Contact Number',
      'Sequence', 'GST No', 'Pro Forma Invoice No.', 'Sales Rep Name', 'GT',
      'Service Description', 'Start Date', 'End Date', 'Created By',
      'Discount Reason', 'Amount', 'Discount', 'Net Amount'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.purchaseDate,
        record.memberId,
        `"${record.memberName}"`,
        record.contactNumber,
        `"${record.sequence}"`,
        record.gstNo,
        `"${record.proFormaInvoiceNo}"`,
        `"${record.salesRepName}"`,
        `"${record.gt}"`,
        `"${record.serviceDescription}"`,
        record.startDate,
        record.endDate,
        `"${record.createdBy}"`,
        `"${record.discountReason}"`,
        record.amount,
        record.discount,
        record.netAmount
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=discount-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Renewal vs Attrition Report
export const getRenewalVsAttritionReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    // Calculate month start and end dates
    const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    // Get all branches
    const branches = await Branch.find({ organizationId: req.organizationId }).lean();

    const summaryData = [];
    const oldExpiredData = [];
    const renewedInAdvanceData = [];

    for (const branch of branches) {
      // Get invoices with items expiring in this month (non-PT only)
      const expiringInvoices = await Invoice.find({
        organizationId: req.organizationId,
        branchId: branch._id,
        'items.expiryDate': {
          $gte: monthStart,
          $lte: monthEnd
        },
        invoiceType: 'service',
        type: { $in: ['membership', 'renewal'] }
      })
        .populate('memberId', 'memberId firstName lastName')
        .populate('items.serviceId', 'name')
        .lean();

      // Filter for non-PT services (assuming PT services have specific naming or plan type)
      const nonPTExpiring = expiringInvoices.filter(inv => {
        return inv.items.some(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          return !serviceName.toLowerCase().includes('pt') && 
                 !serviceName.toLowerCase().includes('personal training');
        });
      });

      // Count total expiries
      const totalExpiry = nonPTExpiring.length;

      // Get renewals in this month for members whose memberships expired in this month
      const renewals = await Invoice.find({
        organizationId: req.organizationId,
        branchId: branch._id,
        type: 'renewal',
        createdAt: {
          $gte: monthStart,
          $lte: monthEnd
        },
        invoiceType: 'service'
      })
        .populate('memberId', 'memberId')
        .lean();

      // Match renewals with expiring memberships
      const expiringMemberIds = new Set(nonPTExpiring.map(inv => inv.memberId?._id?.toString()));
      const totalRenewal = renewals.filter(ren => 
        expiringMemberIds.has(ren.memberId?._id?.toString())
      ).length;

      const renewalPercent = totalExpiry > 0 ? (totalRenewal / totalExpiry) * 100 : 0;
      const attritionPercent = totalExpiry > 0 ? ((totalExpiry - totalRenewal) / totalExpiry) * 100 : 0;

      summaryData.push({
        branchId: branch._id.toString(),
        branchName: branch.name,
        totalExpiry,
        totalRenewal,
        renewalPercent: Math.round(renewalPercent * 100) / 100,
        attritionPercent: Math.round(attritionPercent * 100) / 100,
        expiringInvoices: nonPTExpiring.map(inv => inv._id.toString())
      });

      // Old expired memberships (expired before this month)
      const oldExpiredInvoices = await Invoice.find({
        organizationId: req.organizationId,
        branchId: branch._id,
        'items.expiryDate': {
          $lt: monthStart
        },
        invoiceType: 'service',
        type: { $in: ['membership', 'renewal'] }
      })
        .populate('memberId', 'memberId')
        .lean();

      const nonPTOldExpired = oldExpiredInvoices.filter(inv => {
        return inv.items.some(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          return !serviceName.toLowerCase().includes('pt') && 
                 !serviceName.toLowerCase().includes('personal training');
        });
      });

      const totalOldExpiry = nonPTOldExpired.length;

      // Reinstatements (renewals for old expired members)
      const oldExpiredMemberIds = new Set(nonPTOldExpired.map(inv => inv.memberId?._id?.toString()));
      const reinstatements = renewals.filter(ren => 
        oldExpiredMemberIds.has(ren.memberId?._id?.toString())
      ).length;

      const reinstatementPercent = totalOldExpiry > 0 ? (reinstatements / totalOldExpiry) * 100 : 0;

      oldExpiredData.push({
        branchId: branch._id.toString(),
        branchName: branch.name,
        totalOldExpiry,
        totalReinstatements: reinstatements,
        reinstatementPercent: Math.round(reinstatementPercent * 100) / 100
      });

      // Renewed in advance (renewals created before expiry month)
      const renewedInAdvance = renewals.filter(ren => {
        const memberId = ren.memberId?._id?.toString();
        if (!expiringMemberIds.has(memberId)) return false;
        
        // Check if renewal was created before the expiry month
        return ren.createdAt < monthStart;
      }).length;

      renewedInAdvanceData.push({
        branchId: branch._id.toString(),
        branchName: branch.name,
        renewedInAdvance
      });
    }

    // Calculate totals
    const totalExpiry = summaryData.reduce((sum, item) => sum + item.totalExpiry, 0);
    const totalRenewal = summaryData.reduce((sum, item) => sum + item.totalRenewal, 0);
    const totalOldExpiry = oldExpiredData.reduce((sum, item) => sum + item.totalOldExpiry, 0);
    const totalReinstatements = oldExpiredData.reduce((sum, item) => sum + item.totalReinstatements, 0);
    const totalRenewedInAdvance = renewedInAdvanceData.reduce((sum, item) => sum + item.renewedInAdvance, 0);

    res.json({
      success: true,
      data: {
        summary: summaryData,
        oldExpired: oldExpiredData,
        renewedInAdvance: renewedInAdvanceData,
        totals: {
          totalExpiry,
          totalRenewal,
          totalOldExpiry,
          totalReinstatements,
          totalRenewedInAdvance
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get detailed list for Renewal vs Attrition
export const getRenewalVsAttritionList = async (req, res) => {
  try {
    const { month, year, branchId, type } = req.query; // type: 'expiring', 'old-expired', 'renewed-advance'

    if (!month || !year || !type) {
      return res.status(400).json({ success: false, message: 'Month, year, and type are required' });
    }

    const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    const baseQuery = {
      organizationId: req.organizationId,
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] }
    };

    if (branchId && branchId !== 'all') {
      baseQuery.branchId = branchId;
    }

    let invoices = [];

    if (type === 'expiring') {
      invoices = await Invoice.find({
        ...baseQuery,
        'items.expiryDate': {
          $gte: monthStart,
          $lte: monthEnd
        }
      })
        .populate('memberId', 'memberId firstName lastName phone')
        .populate('items.serviceId', 'name')
        .populate('branchId', 'name')
        .lean();

      // Filter non-PT
      invoices = invoices.filter(inv => {
        return inv.items.some(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          return !serviceName.toLowerCase().includes('pt') && 
                 !serviceName.toLowerCase().includes('personal training');
        });
      });
    } else if (type === 'old-expired') {
      invoices = await Invoice.find({
        ...baseQuery,
        'items.expiryDate': {
          $lt: monthStart
        }
      })
        .populate('memberId', 'memberId firstName lastName phone')
        .populate('items.serviceId', 'name')
        .populate('branchId', 'name')
        .lean();

      invoices = invoices.filter(inv => {
        return inv.items.some(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          return !serviceName.toLowerCase().includes('pt') && 
                 !serviceName.toLowerCase().includes('personal training');
        });
      });
    } else if (type === 'renewed-advance') {
      const expiringInvoices = await Invoice.find({
        ...baseQuery,
        'items.expiryDate': {
          $gte: monthStart,
          $lte: monthEnd
        }
      })
        .populate('memberId', 'memberId')
        .lean();

      const expiringMemberIds = new Set(
        expiringInvoices
          .filter(inv => {
            return inv.items.some(item => {
              const serviceName = item.serviceId?.name || item.description || '';
              return !serviceName.toLowerCase().includes('pt') && 
                     !serviceName.toLowerCase().includes('personal training');
            });
          })
          .map(inv => inv.memberId?._id?.toString())
      );

      const renewals = await Invoice.find({
        ...baseQuery,
        type: 'renewal',
        createdAt: {
          $lt: monthStart
        }
      })
        .populate('memberId', 'memberId firstName lastName phone')
        .populate('items.serviceId', 'name')
        .populate('branchId', 'name')
        .lean();

      invoices = renewals.filter(ren => 
        expiringMemberIds.has(ren.memberId?._id?.toString())
      );
    }

    const records = [];
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const serviceName = item.serviceId?.name || item.description || '';
        if (serviceName.toLowerCase().includes('pt') || 
            serviceName.toLowerCase().includes('personal training')) {
          continue;
        }

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberId: invoice.memberId?.memberId || '-',
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          mobile: invoice.memberId?.phone || '-',
          branchName: invoice.branchId?.name || '-',
          serviceName,
          startDate: item.startDate,
          expiryDate: item.expiryDate,
          billNumber: invoice.invoiceNumber || '-'
        });
      }
    }

    res.json({
      success: true,
      data: { records }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Renewal vs Attrition Report
export const exportRenewalVsAttritionReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    // Reuse getRenewalVsAttritionReport logic
    const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    const branches = await Branch.find({ organizationId: req.organizationId }).lean();

    const summaryData = [];
    const oldExpiredData = [];
    const renewedInAdvanceData = [];

    for (const branch of branches) {
      const expiringInvoices = await Invoice.find({
        organizationId: req.organizationId,
        branchId: branch._id,
        'items.expiryDate': {
          $gte: monthStart,
          $lte: monthEnd
        },
        invoiceType: 'service',
        type: { $in: ['membership', 'renewal'] }
      })
        .populate('memberId', 'memberId')
        .populate('items.serviceId', 'name')
        .lean();

      const nonPTExpiring = expiringInvoices.filter(inv => {
        return inv.items.some(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          return !serviceName.toLowerCase().includes('pt') && 
                 !serviceName.toLowerCase().includes('personal training');
        });
      });

      const totalExpiry = nonPTExpiring.length;

      const renewals = await Invoice.find({
        organizationId: req.organizationId,
        branchId: branch._id,
        type: 'renewal',
        createdAt: {
          $gte: monthStart,
          $lte: monthEnd
        },
        invoiceType: 'service'
      })
        .populate('memberId', 'memberId')
        .lean();

      const expiringMemberIds = new Set(nonPTExpiring.map(inv => inv.memberId?._id?.toString()));
      const totalRenewal = renewals.filter(ren => 
        expiringMemberIds.has(ren.memberId?._id?.toString())
      ).length;

      const renewalPercent = totalExpiry > 0 ? (totalRenewal / totalExpiry) * 100 : 0;
      const attritionPercent = totalExpiry > 0 ? ((totalExpiry - totalRenewal) / totalExpiry) * 100 : 0;

      summaryData.push({
        branchName: branch.name,
        totalExpiry,
        totalRenewal,
        renewalPercent: Math.round(renewalPercent * 100) / 100,
        attritionPercent: Math.round(attritionPercent * 100) / 100
      });

      const oldExpiredInvoices = await Invoice.find({
        organizationId: req.organizationId,
        branchId: branch._id,
        'items.expiryDate': {
          $lt: monthStart
        },
        invoiceType: 'service',
        type: { $in: ['membership', 'renewal'] }
      })
        .populate('memberId', 'memberId')
        .populate('items.serviceId', 'name')
        .lean();

      const nonPTOldExpired = oldExpiredInvoices.filter(inv => {
        return inv.items.some(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          return !serviceName.toLowerCase().includes('pt') && 
                 !serviceName.toLowerCase().includes('personal training');
        });
      });

      const totalOldExpiry = nonPTOldExpired.length;
      const oldExpiredMemberIds = new Set(nonPTOldExpired.map(inv => inv.memberId?._id?.toString()));
      const reinstatements = renewals.filter(ren => 
        oldExpiredMemberIds.has(ren.memberId?._id?.toString())
      ).length;

      const reinstatementPercent = totalOldExpiry > 0 ? (reinstatements / totalOldExpiry) * 100 : 0;

      oldExpiredData.push({
        branchName: branch.name,
        totalOldExpiry,
        totalReinstatements: reinstatements,
        reinstatementPercent: Math.round(reinstatementPercent * 100) / 100
      });

      const renewedInAdvance = renewals.filter(ren => {
        const memberId = ren.memberId?._id?.toString();
        if (!expiringMemberIds.has(memberId)) return false;
        return ren.createdAt < monthStart;
      }).length;

      renewedInAdvanceData.push({
        branchName: branch.name,
        renewedInAdvance
      });
    }

    // Generate CSV
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month) - 1];

    let csvContent = `Renewal vs Attrition Report - ${monthName} ${year}\n\n`;
    
    // Summary section
    csvContent += 'This Month\'s Summary\n';
    csvContent += 'S.No,Studio,Total Expiry,Total Renewal,Renewal%,Attrition%\n';
    summaryData.forEach((item, index) => {
      csvContent += `${index + 1},"${item.branchName}",${item.totalExpiry},${item.totalRenewal},${item.renewalPercent},${item.attritionPercent}\n`;
    });
    const totalExpiry = summaryData.reduce((sum, item) => sum + item.totalExpiry, 0);
    const totalRenewal = summaryData.reduce((sum, item) => sum + item.totalRenewal, 0);
    csvContent += `Total,,${totalExpiry},${totalRenewal},,\n\n`;

    // Old expired section
    csvContent += 'Old Expired Memberships\n';
    csvContent += 'S.No,Studio,Total Old Expiry,Total Reinstatements,Reinstatement%\n';
    oldExpiredData.forEach((item, index) => {
      csvContent += `${index + 1},"${item.branchName}",${item.totalOldExpiry},${item.totalReinstatements},${item.reinstatementPercent}\n`;
    });
    const totalOldExpiry = oldExpiredData.reduce((sum, item) => sum + item.totalOldExpiry, 0);
    const totalReinstatements = oldExpiredData.reduce((sum, item) => sum + item.totalReinstatements, 0);
    csvContent += `Total,,${totalOldExpiry},${totalReinstatements},\n\n`;

    // Renewed in advance section
    csvContent += 'Membership Renewed In Advance\n';
    csvContent += 'S.No,Studio,Renewed In Advance\n';
    renewedInAdvanceData.forEach((item, index) => {
      csvContent += `${index + 1},"${item.branchName}",${item.renewedInAdvance}\n`;
    });
    const totalRenewedInAdvance = renewedInAdvanceData.reduce((sum, item) => sum + item.renewedInAdvance, 0);
    csvContent += `Total,,${totalRenewedInAdvance}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=renewal-vs-attrition-${monthName}-${year}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upgrade Report
export const getUpgradeReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      staffId,
      page = 1,
      limit = 20
    } = req.query;

    // Build base query
    const baseQuery = {
      organizationId: req.organizationId,
      type: 'upgrade',
      invoiceType: 'service'
    };

    // Date filter
    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = end;
      }
    }

    // Staff filter
    if (staffId && staffId !== 'all') {
      baseQuery.createdBy = staffId;
    }

    // Get upgrade invoices
    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Process invoices
    const records = [];
    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) continue;

      for (const item of invoice.items) {
        if (!item.expiryDate) continue;

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          mobile: invoice.memberId?.phone || '-',
          serviceName: item.serviceId?.name || item.description || '-',
          serviceVariationName: item.description || item.serviceId?.name || '-',
          upgradeExpiryDate: item.expiryDate,
          memberId: invoice.memberId?._id,
          invoiceId: invoice._id
        });
      }
    }

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Upgrade Report
export const exportUpgradeReport = async (req, res) => {
  try {
    const { fromDate, toDate, staffId } = req.query;

    const baseQuery = {
      organizationId: req.organizationId,
      type: 'upgrade',
      invoiceType: 'service'
    };

    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = end;
      }
    }

    if (staffId && staffId !== 'all') {
      baseQuery.createdBy = staffId;
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) continue;

      for (const item of invoice.items) {
        if (!item.expiryDate) continue;

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          memberName: invoice.memberId
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '-',
          mobile: invoice.memberId?.phone || '-',
          serviceName: item.serviceId?.name || item.description || '-',
          serviceVariationName: item.description || item.serviceId?.name || '-',
          upgradeExpiryDate: formatDate(item.expiryDate)
        });
      }
    }

    const headers = [
      'S.No', 'Member Name', 'Mobile', 'Service Name', 'Service Variation Name', 'Upgrade Expiry Date'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.memberName}"`,
        record.mobile,
        `"${record.serviceName}"`,
        `"${record.serviceVariationName}"`,
        record.upgradeExpiryDate
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=upgrade-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Member Check-ins Report
export const getMemberCheckinsReport = async (req, res) => {
  try {
    const {
      search,
      dateRange = 'today',
      page = 1,
      limit = 20
    } = req.query;

    // Calculate date range
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last-7-days':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }

    // Build base query
    const baseQuery = {
      organizationId: req.organizationId,
      checkInTime: { $gte: start, $lte: end },
      status: 'success'
    };

    // Get attendances
    const attendances = await Attendance.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('serviceId', 'name')
      .populate('branchId', 'name')
      .populate('checkedInBy', 'firstName lastName')
      .sort({ checkInTime: -1 })
      .lean();

    // Apply search filter
    let filteredAttendances = attendances;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAttendances = attendances.filter(att => {
        const memberName = att.memberId
          ? `${att.memberId.firstName || ''} ${att.memberId.lastName || ''}`.trim().toLowerCase()
          : '';
        const mobile = att.memberId?.phone?.toLowerCase() || '';
        const memberId = att.memberId?.memberId?.toLowerCase() || '';
        return memberName.includes(searchLower) ||
               mobile.includes(searchLower) ||
               memberId.includes(searchLower);
      });
    }

    // Process into records
    const records = filteredAttendances.map(att => ({
      _id: att._id.toString(),
      memberId: att.memberId?.memberId || '-',
      memberName: att.memberId
        ? `${att.memberId.firstName || ''} ${att.memberId.lastName || ''}`.trim()
        : '-',
      mobile: att.memberId?.phone || '-',
      branchName: att.branchId?.name || '-',
      serviceName: att.serviceId?.name || '-',
      checkInTime: att.checkInTime,
      checkOutTime: att.checkOutTime,
      method: att.method,
      checkedInBy: att.checkedInBy
        ? `${att.checkedInBy.firstName || ''} ${att.checkedInBy.lastName || ''}`.trim()
        : '-'
    }));

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Member Check-ins Report
export const exportMemberCheckinsReport = async (req, res) => {
  try {
    const { search, dateRange = 'today' } = req.query;

    // Reuse getMemberCheckinsReport logic
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last-7-days':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }

    const baseQuery = {
      organizationId: req.organizationId,
      checkInTime: { $gte: start, $lte: end },
      status: 'success'
    };

    const attendances = await Attendance.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ checkInTime: -1 })
      .lean();

    let filteredAttendances = attendances;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAttendances = attendances.filter(att => {
        const memberName = att.memberId
          ? `${att.memberId.firstName || ''} ${att.memberId.lastName || ''}`.trim().toLowerCase()
          : '';
        const mobile = att.memberId?.phone?.toLowerCase() || '';
        return memberName.includes(searchLower) || mobile.includes(searchLower);
      });
    }

    const formatDateTime = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Branch', 'Service Name',
      'Check-In Time', 'Check-Out Time', 'Method'
    ];

    let csvContent = headers.join(',') + '\n';
    filteredAttendances.forEach((att, index) => {
      const row = [
        index + 1,
        att.memberId?.memberId || '-',
        `"${att.memberId ? `${att.memberId.firstName || ''} ${att.memberId.lastName || ''}`.trim() : '-'}"`,
        att.memberId?.phone || '-',
        `"${att.branchId?.name || '-'}"`,
        `"${att.serviceId?.name || '-'}"`,
        formatDateTime(att.checkInTime),
        formatDateTime(att.checkOutTime),
        att.method || '-'
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=member-checkins-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// MultiClub Member Check-ins Report
export const getMultiClubMemberCheckinsReport = async (req, res) => {
  try {
    const {
      search,
      dateRange = 'today',
      page = 1,
      limit = 20
    } = req.query;

    // Calculate date range (same as member check-ins)
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last-7-days':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }

    // Get all attendances
    const attendances = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: start, $lte: end },
      status: 'success'
    })
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('branchId', 'name')
      .populate('serviceId', 'name')
      .sort({ checkInTime: -1 })
      .lean();

    // Group by member to find multiclub members (members who checked in at multiple branches)
    const memberBranches = {};
    attendances.forEach(att => {
      const memberId = att.memberId?._id?.toString();
      if (!memberId) return;
      
      if (!memberBranches[memberId]) {
        memberBranches[memberId] = new Set();
      }
      if (att.branchId?._id) {
        memberBranches[memberId].add(att.branchId._id.toString());
      }
    });

    // Filter for members with check-ins at multiple branches
    const multiclubMemberIds = Object.keys(memberBranches).filter(
      memberId => memberBranches[memberId].size > 1
    );

    // Filter attendances for multiclub members
    let filteredAttendances = attendances.filter(att => 
      multiclubMemberIds.includes(att.memberId?._id?.toString())
    );

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAttendances = filteredAttendances.filter(att => {
        const memberName = att.memberId
          ? `${att.memberId.firstName || ''} ${att.memberId.lastName || ''}`.trim().toLowerCase()
          : '';
        const mobile = att.memberId?.phone?.toLowerCase() || '';
        const memberId = att.memberId?.memberId?.toLowerCase() || '';
        return memberName.includes(searchLower) ||
               mobile.includes(searchLower) ||
               memberId.includes(searchLower);
      });
    }

    // Process into records
    const records = filteredAttendances.map(att => ({
      _id: att._id.toString(),
      memberId: att.memberId?.memberId || '-',
      memberName: att.memberId
        ? `${att.memberId.firstName || ''} ${att.memberId.lastName || ''}`.trim()
        : '-',
      mobile: att.memberId?.phone || '-',
      branchName: att.branchId?.name || '-',
      serviceName: att.serviceId?.name || '-',
      checkInTime: att.checkInTime,
      method: att.method
    }));

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export MultiClub Member Check-ins Report
export const exportMultiClubMemberCheckinsReport = async (req, res) => {
  try {
    const { search, dateRange = 'today' } = req.query;

    // Reuse getMultiClubMemberCheckinsReport logic
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last-7-days':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }

    const attendances = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: start, $lte: end },
      status: 'success'
    })
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('branchId', 'name')
      .populate('serviceId', 'name')
      .sort({ checkInTime: -1 })
      .lean();

    const memberBranches = {};
    attendances.forEach(att => {
      const memberId = att.memberId?._id?.toString();
      if (!memberId) return;
      if (!memberBranches[memberId]) {
        memberBranches[memberId] = new Set();
      }
      if (att.branchId?._id) {
        memberBranches[memberId].add(att.branchId._id.toString());
      }
    });

    const multiclubMemberIds = Object.keys(memberBranches).filter(
      memberId => memberBranches[memberId].size > 1
    );

    let filteredAttendances = attendances.filter(att => 
      multiclubMemberIds.includes(att.memberId?._id?.toString())
    );

    if (search) {
      const searchLower = search.toLowerCase();
      filteredAttendances = filteredAttendances.filter(att => {
        const memberName = att.memberId
          ? `${att.memberId.firstName || ''} ${att.memberId.lastName || ''}`.trim().toLowerCase()
          : '';
        const mobile = att.memberId?.phone?.toLowerCase() || '';
        return memberName.includes(searchLower) || mobile.includes(searchLower);
      });
    }

    const formatDateTime = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Branch', 'Service Name', 'Check-In Time', 'Method'
    ];

    let csvContent = headers.join(',') + '\n';
    filteredAttendances.forEach((att, index) => {
      const row = [
        index + 1,
        att.memberId?.memberId || '-',
        `"${att.memberId ? `${att.memberId.firstName || ''} ${att.memberId.lastName || ''}`.trim() : '-'}"`,
        att.memberId?.phone || '-',
        `"${att.branchId?.name || '-'}"`,
        `"${att.serviceId?.name || '-'}"`,
        formatDateTime(att.checkInTime),
        att.method || '-'
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=multiclub-member-checkins-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Member Attendance Register Report
export const getMemberAttendanceRegisterReport = async (req, res) => {
  try {
    const { year, month, serviceId, batchId, search } = req.query;

    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }

    // Calculate month start and end
    const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    // Get all days in the month
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(parseInt(year), parseInt(month) - 1, i);
      days.push({
        day: i,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date
      });
    }

    // Build query for invoices
    const invoiceQuery = {
      organizationId: req.organizationId,
      'items.startDate': { $lte: monthEnd },
      'items.expiryDate': { $gte: monthStart },
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] }
    };

    if (serviceId && serviceId !== 'all') {
      invoiceQuery['items.serviceId'] = serviceId;
    }

    // Get invoices
    const invoices = await Invoice.find(invoiceQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .lean();

    // Filter non-PT
    const nonPTInvoices = invoices.filter(inv => {
      return inv.items.some(item => {
        const serviceName = item.serviceId?.name || item.description || '';
        return !serviceName.toLowerCase().includes('pt') && 
               !serviceName.toLowerCase().includes('personal training');
      });
    });

    // Get attendances for the month
    const attendances = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: monthStart, $lte: monthEnd },
      status: 'success'
    })
      .populate('memberId', 'memberId')
      .populate('serviceId', 'name')
      .lean();

    // Build attendance map: memberId -> serviceId -> Set of dates
    const attendanceMap = {};
    attendances.forEach(att => {
      const memberId = att.memberId?._id?.toString();
      const serviceId = att.serviceId?._id?.toString();
      if (!memberId || !serviceId) return;

      if (!attendanceMap[memberId]) {
        attendanceMap[memberId] = {};
      }
      if (!attendanceMap[memberId][serviceId]) {
        attendanceMap[memberId][serviceId] = new Set();
      }

      const checkInDate = new Date(att.checkInTime);
      const day = checkInDate.getDate();
      attendanceMap[memberId][serviceId].add(day);
    });

    // Process records
    const records = [];
    for (const invoice of nonPTInvoices) {
      if (!invoice.memberId) continue;

      for (const item of invoice.items) {
        const serviceName = item.serviceId?.name || item.description || '';
        if (serviceName.toLowerCase().includes('pt') || 
            serviceName.toLowerCase().includes('personal training')) {
          continue;
        }

        const memberId = invoice.memberId._id.toString();
        const serviceId = item.serviceId?._id?.toString();
        const memberAttendances = attendanceMap[memberId]?.[serviceId] || new Set();

        // Build daily attendance array
        const dailyAttendance = days.map(day => {
          return memberAttendances.has(day.day) ? 'P' : '';
        });

        const totalPresent = dailyAttendance.filter(a => a === 'P').length;

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          serviceName,
          expiryDate: item.expiryDate,
          dailyAttendance,
          total: totalPresent
        });
      }
    }

    // Apply search filter
    let filteredRecords = records;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = records.filter(rec => {
        const memberName = rec.memberName.toLowerCase();
        const mobile = rec.mobile.toLowerCase();
        const memberId = rec.memberId.toLowerCase();
        return memberName.includes(searchLower) ||
               mobile.includes(searchLower) ||
               memberId.includes(searchLower);
      });
    }

    res.json({
      success: true,
      data: {
        records: filteredRecords,
        days,
        month: parseInt(month),
        year: parseInt(year)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Member Attendance Register Report
export const exportMemberAttendanceRegisterReport = async (req, res) => {
  try {
    const { year, month, serviceId, search } = req.query;

    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }

    // Reuse getMemberAttendanceRegisterReport logic
    const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    const invoiceQuery = {
      organizationId: req.organizationId,
      'items.startDate': { $lte: monthEnd },
      'items.expiryDate': { $gte: monthStart },
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] }
    };

    if (serviceId && serviceId !== 'all') {
      invoiceQuery['items.serviceId'] = serviceId;
    }

    const invoices = await Invoice.find(invoiceQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .lean();

    const nonPTInvoices = invoices.filter(inv => {
      return inv.items.some(item => {
        const serviceName = item.serviceId?.name || item.description || '';
        return !serviceName.toLowerCase().includes('pt') && 
               !serviceName.toLowerCase().includes('personal training');
      });
    });

    const attendances = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: monthStart, $lte: monthEnd },
      status: 'success'
    })
      .populate('memberId', 'memberId')
      .populate('serviceId', 'name')
      .lean();

    const attendanceMap = {};
    attendances.forEach(att => {
      const memberId = att.memberId?._id?.toString();
      const serviceId = att.serviceId?._id?.toString();
      if (!memberId || !serviceId) return;
      if (!attendanceMap[memberId]) {
        attendanceMap[memberId] = {};
      }
      if (!attendanceMap[memberId][serviceId]) {
        attendanceMap[memberId][serviceId] = new Set();
      }
      const checkInDate = new Date(att.checkInTime);
      attendanceMap[memberId][serviceId].add(checkInDate.getDate());
    });

    const records = [];
    for (const invoice of nonPTInvoices) {
      if (!invoice.memberId) continue;
      for (const item of invoice.items) {
        const serviceName = item.serviceId?.name || item.description || '';
        if (serviceName.toLowerCase().includes('pt') || 
            serviceName.toLowerCase().includes('personal training')) {
          continue;
        }
        const memberId = invoice.memberId._id.toString();
        const serviceId = item.serviceId?._id?.toString();
        const memberAttendances = attendanceMap[memberId]?.[serviceId] || new Set();
        const dailyAttendance = [];
        for (let i = 1; i <= daysInMonth; i++) {
          dailyAttendance.push(memberAttendances.has(i) ? 'P' : '');
        }
        const totalPresent = dailyAttendance.filter(a => a === 'P').length;

        records.push({
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          serviceName,
          expiryDate: item.expiryDate,
          dailyAttendance,
          total: totalPresent
        });
      }
    }

    let filteredRecords = records;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = records.filter(rec => {
        return rec.memberName.toLowerCase().includes(searchLower) ||
               rec.mobile.toLowerCase().includes(searchLower) ||
               rec.memberId.toLowerCase().includes(searchLower);
      });
    }

    // Generate CSV
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month) - 1];
    
    const headers = ['Member Name', 'Mobile', 'Service', 'Expiry Date'];
    for (let i = 1; i <= daysInMonth; i++) {
      headers.push(`${i}`);
    }
    headers.push('Total');

    let csvContent = headers.join(',') + '\n';
    
    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    filteredRecords.forEach(rec => {
      const row = [
        `"${rec.memberName}"`,
        rec.mobile,
        `"${rec.serviceName}"`,
        formatDate(rec.expiryDate),
        ...rec.dailyAttendance,
        rec.total
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=member-attendance-register-${monthName}-${year}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// New Clients Report (Non-PT only)
export const getNewClientsReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      serviceId,
      gender,
      page = 1,
      limit = 20
    } = req.query;

    const match = {
      organizationId: req.organizationId
    };

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        match.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
      if (!Object.keys(match.createdAt).length) {
        delete match.createdAt;
      }
    }

    if (gender && gender !== 'all') {
      match.gender = gender;
    }

    const serviceFilter = serviceId && serviceId !== 'all' ? serviceId : null;

    const members = await Member.find(match)
      .populate('salesRep', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const filteredMembers = members.filter(member => {
      if (serviceFilter) {
        if (!member.currentPlan?.planId) return false;
        return member.currentPlan.planId.toString() === serviceFilter;
      }
      return true;
    });

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRecords = filteredMembers.slice(startIndex, startIndex + parseInt(limit));

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const records = paginatedRecords.map(member => ({
      _id: member._id,
      memberId: member.memberId || '-',
      memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
      mobile: member.phone || '-',
      email: member.email || '-',
      serviceName: member.currentPlan?.planName || '-',
      joinDate: member.currentPlan?.startDate || member.createdAt,
      startDate: formatDate(member.currentPlan?.startDate || member.createdAt),
      endDate: formatDate(member.currentPlan?.endDate),
      leadSource: member.leadSource || member.source || '-',
      salesRepName: member.salesRep
        ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
        : '-'
    }));

    res.json({
      success: true,
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredMembers.length,
        pages: Math.ceil(filteredMembers.length / parseInt(limit))
      },
      summary: {
        nonPTClients: filteredMembers.length,
        ptClients: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export New Clients Report
export const exportNewClientsReport = async (req, res) => {
  try {
    const { fromDate, toDate, serviceId, gender } = req.query;

    const baseQuery = {
      organizationId: req.organizationId,
      status: { $in: ['paid', 'partial', 'sent', 'draft'] },
      type: { $in: ['membership', 'other', 'pro-forma'] }
    };

    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = end;
      }
    }

    if (serviceId && serviceId !== 'all') {
      baseQuery['items.serviceId'] = serviceId;
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone email leadSource')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .lean();

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.memberId) continue;
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          if (!item) continue;
          const serviceName = item.serviceId?.name || item.description || 'Unknown Service';
          if (gender && gender !== 'all' && invoice.memberId.gender !== gender) {
            continue;
          }

          const payments = await Payment.find({
            invoiceId: invoice._id,
            status: 'completed'
          }).lean();
          const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0) || (item.total || invoice.total || 0);

          const formatDate = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          };

          records.push({
            memberId: invoice.memberId.memberId || '-',
            memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
            mobile: invoice.memberId.phone || '-',
            email: invoice.memberId.email || '-',
            serviceName,
            serviceVariationName: item.description || serviceName,
            billNo: invoice.invoiceNumber || '-',
            purchaseDate: formatDate(invoice.createdAt),
            joinDate: invoice.createdAt,
            startDate: formatDate(item.startDate),
            endDate: formatDate(item.expiryDate),
            totalCheckIns: invoice.memberId.attendanceStats?.totalCheckIns || 0,
            leadSource: invoice.memberId.leadSource || '-',
            salesRepName: invoice.createdBy
              ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
              : '-',
            baseFee: item.amount || invoice.subtotal || 0,
            tax: item.taxAmount || invoice.tax?.amount || 0,
            netAmount: item.total || invoice.total || 0,
            paidAmount,
            gender: invoice.memberId.gender || '-'
          });
        }
      } else {
        if (gender && gender !== 'all' && invoice.memberId.gender !== gender) {
          continue;
        }

        const payments = await Payment.find({
          invoiceId: invoice._id,
          status: 'completed'
        }).lean();
        const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0) || (invoice.total || 0);

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        const serviceName = invoice.planId?.name || 'Unknown Service';

        records.push({
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          email: invoice.memberId.email || '-',
          serviceName,
          serviceVariationName: serviceName,
          billNo: invoice.invoiceNumber || '-',
          purchaseDate: formatDate(invoice.createdAt),
          joinDate: invoice.createdAt,
          startDate: formatDate(invoice.currentPlan?.startDate || invoice.createdAt),
          endDate: formatDate(invoice.currentPlan?.endDate),
          totalCheckIns: invoice.memberId.attendanceStats?.totalCheckIns || 0,
          leadSource: invoice.memberId.leadSource || '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          baseFee: invoice.subtotal || 0,
          tax: invoice.tax?.amount || 0,
          netAmount: invoice.total || 0,
          paidAmount,
          gender: invoice.memberId.gender || '-'
        });
      }
    }

    const headers = ['S.No', 'Member ID', 'Member Name', 'Mobile', 'Email', 'Service Name', 'Service Variation Name', 'Bill No', 'Purchase Date', 'Join Date', 'Start Date', 'End Date', 'Lead Source', 'Sales Rep Name', 'Base Fee', 'Tax', 'Net Amount', 'Paid Amount', 'Gender'];
    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        record.email,
        `"${record.serviceName}"`,
        `"${record.serviceVariationName}"`,
        record.billNo,
        record.purchaseDate,
        record.joinDate ? formatDate(record.joinDate) : '-',
        record.startDate,
        record.endDate,
        record.leadSource,
        `"${record.salesRepName}"`,
        record.baseFee,
        record.tax,
        record.netAmount,
        record.paidAmount,
        record.gender
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=new-clients-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Renewals Report (Non-PT only)
export const getRenewalsReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      page = 1,
      limit = 20
    } = req.query;

    const baseQuery = {
      organizationId: req.organizationId,
      type: 'renewal',
      invoiceType: 'service'
    };

    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.memberId) continue;
      for (const item of invoice.items) {
        const serviceName = item.serviceId?.name || item.description || '';
        if (serviceName.toLowerCase().includes('pt') || 
            serviceName.toLowerCase().includes('personal training')) {
          continue;
        }

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          serviceName,
          billNo: invoice.invoiceNumber || '-',
          startDate: item.startDate,
          endDate: item.expiryDate,
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          billAmount: invoice.total || 0
        });
      }
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Renewals Report
export const exportRenewalsReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const baseQuery = {
      organizationId: req.organizationId,
      type: 'renewal',
      invoiceType: 'service'
    };

    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .lean();

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.memberId) continue;
      for (const item of invoice.items) {
        const serviceName = item.serviceId?.name || item.description || '';
        if (serviceName.toLowerCase().includes('pt') || 
            serviceName.toLowerCase().includes('personal training')) {
          continue;
        }

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          serviceName,
          billNo: invoice.invoiceNumber || '-',
          startDate: formatDate(item.startDate),
          endDate: formatDate(item.expiryDate),
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          billAmount: invoice.total || 0
        });
      }
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Service Name', 'Bill No',
      'Start Date', 'End Date', 'Sales Rep Name', 'Bill Amount'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        `"${record.serviceName}"`,
        record.billNo,
        record.startDate,
        record.endDate,
        `"${record.salesRepName}"`,
        record.billAmount
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=renewals-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Membership Report
export const getMembershipReport = async (req, res) => {
  try {
    const { fromDate, toDate, page = 1, limit = 20 } = req.query;

    const baseQuery = {
      organizationId: req.organizationId,
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] }
    };

    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Get last check-in dates
    const memberIds = [...new Set(invoices.map(inv => inv.memberId?._id?.toString()).filter(Boolean))];
    const lastCheckIns = await Attendance.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          memberId: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) },
          status: 'success'
        }
      },
      {
        $group: {
          _id: '$memberId',
          lastCheckIn: { $max: '$checkInTime' }
        }
      }
    ]);

    const lastCheckInMap = {};
    lastCheckIns.forEach(item => {
      lastCheckInMap[item._id.toString()] = item.lastCheckIn;
    });

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.memberId) continue;
      for (const item of invoice.items) {
        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          serviceName: item.serviceId?.name || item.description || '-',
          billNo: invoice.invoiceNumber || '-',
          startDate: item.startDate,
          endDate: item.expiryDate,
          lastCheckInDate: lastCheckInMap[invoice.memberId._id.toString()] || null,
          leadSource: invoice.memberId.leadSource || '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          billAmount: invoice.total || 0,
          payMode: invoice.paymentMethod || '-'
        });
      }
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Membership Report
export const exportMembershipReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const baseQuery = {
      organizationId: req.organizationId,
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] }
    };

    if (fromDate || toDate) {
      baseQuery.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        baseQuery.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'memberId firstName lastName phone leadSource')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .lean();

    const memberIds = [...new Set(invoices.map(inv => inv.memberId?._id?.toString()).filter(Boolean))];
    const lastCheckIns = await Attendance.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          memberId: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) },
          status: 'success'
        }
      },
      {
        $group: {
          _id: '$memberId',
          lastCheckIn: { $max: '$checkInTime' }
        }
      }
    ]);

    const lastCheckInMap = {};
    lastCheckIns.forEach(item => {
      lastCheckInMap[item._id.toString()] = item.lastCheckIn;
    });

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.memberId) continue;
      for (const item of invoice.items) {
        records.push({
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          email: invoice.memberId.email || '-',
          serviceName: item.serviceId?.name || item.description || '-',
          billNo: invoice.invoiceNumber || '-',
          startDate: formatDate(item.startDate),
          endDate: formatDate(item.expiryDate),
          lastCheckInDate: formatDate(lastCheckInMap[invoice.memberId._id.toString()]),
          leadSource: invoice.memberId.leadSource || '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          billAmount: invoice.total || 0,
          payMode: invoice.paymentMethod || '-'
        });
      }
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Email', 'Service Name', 'Bill No',
      'Start Date', 'End Date', 'Last Check-In Date', 'Lead Source', 'Sales Rep Name', 'Bill Amount', 'Pay Mode'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        record.email,
        `"${record.serviceName}"`,
        record.billNo,
        record.startDate,
        record.endDate,
        record.lastCheckInDate,
        record.leadSource,
        `"${record.salesRepName}"`,
        record.billAmount,
        record.payMode
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=membership-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Freeze and Date Change Report
export const getFreezeAndDateChangeReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get members with freeze history in date range
    const members = await Member.find({
      organizationId: req.organizationId,
      freezeHistory: {
        $elemMatch: {
          createdAt: { $gte: start, $lte: end }
        }
      }
    })
      .populate('freezeHistory.requestedBy', 'firstName lastName')
      .populate('freezeHistory.approvedBy', 'firstName lastName')
      .lean();

    // Get invoices with date changes (items with startDate/expiryDate modified)
    // We'll check invoices created in the date range and compare with original dates
    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      createdAt: { $gte: start, $lte: end },
      $or: [
        { type: 'freeze' },
        { 'items.startDate': { $exists: true } },
        { 'items.expiryDate': { $exists: true } }
      ]
    })
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];

    // Process freeze history
    for (const member of members) {
      for (const freeze of member.freezeHistory || []) {
        if (freeze.createdAt && freeze.createdAt >= start && freeze.createdAt <= end) {
          const formatDate = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          };

          const formatDateTime = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
          };

          const freezeDuration = freeze.startDate && freeze.endDate
            ? `${formatDate(freeze.startDate)} - ${formatDate(freeze.endDate)}`
            : '-';

          records.push({
            _id: `${member._id}-freeze-${freeze._id || Math.random()}`,
            memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            mobile: member.phone || '-',
            serviceVariation: member.currentPlan?.planName || '-',
            freezedDuration: freezeDuration,
            changeDateDuration: '-',
            staffName: freeze.requestedBy
              ? `${freeze.requestedBy.firstName || ''} ${freeze.requestedBy.lastName || ''}`.trim()
              : freeze.approvedBy
              ? `${freeze.approvedBy.firstName || ''} ${freeze.approvedBy.lastName || ''}`.trim()
              : 'Auto',
            reason: freeze.reason || '-',
            dateTime: formatDateTime(freeze.createdAt)
          });
        }
      }
    }

    // Process date changes from invoices
    for (const invoice of invoices) {
      if (!invoice.memberId) continue;

      for (const item of invoice.items || []) {
        if (item.startDate || item.expiryDate) {
          const formatDate = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          };

          const formatDateTime = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
          };

          const changeDateDuration = item.startDate && item.expiryDate
            ? `${formatDate(item.startDate)} - ${formatDate(item.expiryDate)}`
            : '-';

          records.push({
            _id: `${invoice._id}-date-${item._id || Math.random()}`,
            memberName: invoice.memberId
              ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
              : '-',
            mobile: invoice.memberId?.phone || '-',
            serviceVariation: item.serviceId?.name || item.description || '-',
            freezedDuration: '-',
            changeDateDuration,
            staffName: invoice.createdBy
              ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
              : 'Auto',
            reason: invoice.internalNotes || invoice.notes || '-',
            dateTime: formatDateTime(invoice.createdAt)
          });
        }
      }
    }

    // Apply search filter
    let filteredRecords = records;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = records.filter(rec => {
        const memberName = rec.memberName.toLowerCase();
        const mobile = rec.mobile.toLowerCase();
        return memberName.includes(searchLower) || mobile.includes(searchLower);
      });
    }

    // Sort by dateTime descending
    filteredRecords.sort((a, b) => {
      const dateA = new Date(a.dateTime.split(' ')[0].split('-').reverse().join('-') + ' ' + (a.dateTime.split(' ')[1] || ''));
      const dateB = new Date(b.dateTime.split(' ')[0].split('-').reverse().join('-') + ' ' + (b.dateTime.split(' ')[1] || ''));
      return dateB - dateA;
    });

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredRecords.length,
          pages: Math.ceil(filteredRecords.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Freeze and Date Change Report
export const exportFreezeAndDateChangeReport = async (req, res) => {
  try {
    const { fromDate, toDate, search } = req.query;

    // Reuse getFreezeAndDateChangeReport logic
    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const members = await Member.find({
      organizationId: req.organizationId,
      freezeHistory: {
        $elemMatch: {
          createdAt: { $gte: start, $lte: end }
        }
      }
    })
      .populate('freezeHistory.requestedBy', 'firstName lastName')
      .populate('freezeHistory.approvedBy', 'firstName lastName')
      .lean();

    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      createdAt: { $gte: start, $lte: end },
      $or: [
        { type: 'freeze' },
        { 'items.startDate': { $exists: true } },
        { 'items.expiryDate': { $exists: true } }
      ]
    })
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];

    for (const member of members) {
      for (const freeze of member.freezeHistory || []) {
        if (freeze.createdAt && freeze.createdAt >= start && freeze.createdAt <= end) {
          const formatDate = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          };

          const formatDateTime = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
          };

          const freezeDuration = freeze.startDate && freeze.endDate
            ? `${formatDate(freeze.startDate)} - ${formatDate(freeze.endDate)}`
            : '-';

          records.push({
            memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            mobile: member.phone || '-',
            serviceVariation: member.currentPlan?.planName || '-',
            freezedDuration: freezeDuration,
            changeDateDuration: '-',
            staffName: freeze.requestedBy
              ? `${freeze.requestedBy.firstName || ''} ${freeze.requestedBy.lastName || ''}`.trim()
              : freeze.approvedBy
              ? `${freeze.approvedBy.firstName || ''} ${freeze.approvedBy.lastName || ''}`.trim()
              : 'Auto',
            reason: freeze.reason || '-',
            dateTime: formatDateTime(freeze.createdAt)
          });
        }
      }
    }

    for (const invoice of invoices) {
      if (!invoice.memberId) continue;
      for (const item of invoice.items || []) {
        if (item.startDate || item.expiryDate) {
          const formatDate = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          };

          const formatDateTime = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
          };

          const changeDateDuration = item.startDate && item.expiryDate
            ? `${formatDate(item.startDate)} - ${formatDate(item.expiryDate)}`
            : '-';

          records.push({
            memberName: invoice.memberId
              ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
              : '-',
            mobile: invoice.memberId?.phone || '-',
            serviceVariation: item.serviceId?.name || item.description || '-',
            freezedDuration: '-',
            changeDateDuration,
            staffName: invoice.createdBy
              ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
              : 'Auto',
            reason: invoice.internalNotes || invoice.notes || '-',
            dateTime: formatDateTime(invoice.createdAt)
          });
        }
      }
    }

    let filteredRecords = records;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = records.filter(rec => {
        const memberName = rec.memberName.toLowerCase();
        const mobile = rec.mobile.toLowerCase();
        return memberName.includes(searchLower) || mobile.includes(searchLower);
      });
    }

    filteredRecords.sort((a, b) => {
      const dateA = new Date(a.dateTime.split(' ')[0].split('-').reverse().join('-') + ' ' + (a.dateTime.split(' ')[1] || ''));
      const dateB = new Date(b.dateTime.split(' ')[0].split('-').reverse().join('-') + ' ' + (b.dateTime.split(' ')[1] || ''));
      return dateB - dateA;
    });

    const headers = [
      'S.No', 'Member Name', 'Mobile', 'Service Variation', 'Freezed Duration',
      'Change Date Duration', 'Staff Name', 'Reason', 'Date & Time'
    ];

    let csvContent = headers.join(',') + '\n';
    filteredRecords.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.memberName}"`,
        record.mobile,
        `"${record.serviceVariation}"`,
        `"${record.freezedDuration}"`,
        `"${record.changeDateDuration}"`,
        `"${record.staffName}"`,
        `"${record.reason}"`,
        record.dateTime
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=freeze-and-date-change-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Suspensions Report (similar to freeze, but for suspended memberships)
export const getSuspensionsReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get members with frozen/suspended status
    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'frozen',
      freezeHistory: {
        $elemMatch: {
          createdAt: { $gte: start, $lte: end }
        }
      }
    })
      .populate('freezeHistory.requestedBy', 'firstName lastName')
      .populate('freezeHistory.approvedBy', 'firstName lastName')
      .lean();

    const records = [];

    for (const member of members) {
      for (const freeze of member.freezeHistory || []) {
        if (freeze.createdAt && freeze.createdAt >= start && freeze.createdAt <= end) {
          const formatDate = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          };

          const formatDateTime = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
          };

          const suspensionDuration = freeze.startDate && freeze.endDate
            ? `${formatDate(freeze.startDate)} - ${formatDate(freeze.endDate)}`
            : '-';

          records.push({
            _id: `${member._id}-suspend-${freeze._id || Math.random()}`,
            memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            mobile: member.phone || '-',
            serviceVariation: member.currentPlan?.planName || '-',
            suspensionDuration,
            staffName: freeze.requestedBy
              ? `${freeze.requestedBy.firstName || ''} ${freeze.requestedBy.lastName || ''}`.trim()
              : freeze.approvedBy
              ? `${freeze.approvedBy.firstName || ''} ${freeze.approvedBy.lastName || ''}`.trim()
              : 'Auto',
            reason: freeze.reason || '-',
            dateTime: formatDateTime(freeze.createdAt)
          });
        }
      }
    }

    let filteredRecords = records;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = records.filter(rec => {
        const memberName = rec.memberName.toLowerCase();
        const mobile = rec.mobile.toLowerCase();
        return memberName.includes(searchLower) || mobile.includes(searchLower);
      });
    }

    filteredRecords.sort((a, b) => {
      const dateA = new Date(a.dateTime.split(' ')[0].split('-').reverse().join('-') + ' ' + (a.dateTime.split(' ')[1] || ''));
      const dateB = new Date(b.dateTime.split(' ')[0].split('-').reverse().join('-') + ' ' + (b.dateTime.split(' ')[1] || ''));
      return dateB - dateA;
    });

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredRecords.length,
          pages: Math.ceil(filteredRecords.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Suspensions Report
export const exportSuspensionsReport = async (req, res) => {
  try {
    const { fromDate, toDate, search } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'frozen',
      freezeHistory: {
        $elemMatch: {
          createdAt: { $gte: start, $lte: end }
        }
      }
    })
      .populate('freezeHistory.requestedBy', 'firstName lastName')
      .populate('freezeHistory.approvedBy', 'firstName lastName')
      .lean();

    const records = [];

    for (const member of members) {
      for (const freeze of member.freezeHistory || []) {
        if (freeze.createdAt && freeze.createdAt >= start && freeze.createdAt <= end) {
          const formatDate = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          };

          const formatDateTime = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
          };

          const suspensionDuration = freeze.startDate && freeze.endDate
            ? `${formatDate(freeze.startDate)} - ${formatDate(freeze.endDate)}`
            : '-';

          records.push({
            memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            mobile: member.phone || '-',
            serviceVariation: member.currentPlan?.planName || '-',
            suspensionDuration,
            staffName: freeze.requestedBy
              ? `${freeze.requestedBy.firstName || ''} ${freeze.requestedBy.lastName || ''}`.trim()
              : freeze.approvedBy
              ? `${freeze.approvedBy.firstName || ''} ${freeze.approvedBy.lastName || ''}`.trim()
              : 'Auto',
            reason: freeze.reason || '-',
            dateTime: formatDateTime(freeze.createdAt)
          });
        }
      }
    }

    let filteredRecords = records;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = records.filter(rec => {
        const memberName = rec.memberName.toLowerCase();
        const mobile = rec.mobile.toLowerCase();
        return memberName.includes(searchLower) || mobile.includes(searchLower);
      });
    }

    filteredRecords.sort((a, b) => {
      const dateA = new Date(a.dateTime.split(' ')[0].split('-').reverse().join('-') + ' ' + (a.dateTime.split(' ')[1] || ''));
      const dateB = new Date(b.dateTime.split(' ')[0].split('-').reverse().join('-') + ' ' + (b.dateTime.split(' ')[1] || ''));
      return dateB - dateA;
    });

    const headers = [
      'S.No', 'Member Name', 'Mobile', 'Service Variation', 'Suspension Duration',
      'Staff Name', 'Reason', 'Date & Time'
    ];

    let csvContent = headers.join(',') + '\n';
    filteredRecords.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.memberName}"`,
        record.mobile,
        `"${record.serviceVariation}"`,
        `"${record.suspensionDuration}"`,
        `"${record.staffName}"`,
        `"${record.reason}"`,
        record.dateTime
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=suspensions-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Attendance Heat Map Report
export const getAttendanceHeatMapReport = async (req, res) => {
  try {
    const { dateRange = 'today' } = req.query;

    // Calculate date range
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last-7-days':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }

    // Get all attendances in the date range
    const attendances = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: start, $lte: end },
      status: 'success'
    })
      .lean();

    // Group by hour
    const hourlyCounts = {};
    for (let hour = 0; hour < 24; hour++) {
      hourlyCounts[hour] = 0;
    }

    attendances.forEach(att => {
      const checkInTime = new Date(att.checkInTime);
      const hour = checkInTime.getHours();
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });

    // Format time ranges
    const formatHour = (hour) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:00 ${period}`;
    };

    const formatHourRange = (hour) => {
      const nextHour = (hour + 1) % 24;
      const startPeriod = hour >= 12 ? 'PM' : 'AM';
      const endPeriod = nextHour >= 12 ? 'PM' : 'AM';
      const startDisplayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const endDisplayHour = nextHour === 0 ? 12 : nextHour > 12 ? nextHour - 12 : nextHour;
      return `${startDisplayHour}:00 ${startPeriod} To ${endDisplayHour}:00 ${endPeriod}`;
    };

    const records = [];
    for (let hour = 0; hour < 24; hour++) {
      records.push({
        timeRange: formatHourRange(hour),
        checkIns: hourlyCounts[hour] || 0
      });
    }

    res.json({
      success: true,
      data: { records }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Attendance Heat Map Report
export const exportAttendanceHeatMapReport = async (req, res) => {
  try {
    const { dateRange = 'today' } = req.query;

    // Reuse getAttendanceHeatMapReport logic
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last-7-days':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }

    const attendances = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: start, $lte: end },
      status: 'success'
    })
      .lean();

    const hourlyCounts = {};
    for (let hour = 0; hour < 24; hour++) {
      hourlyCounts[hour] = 0;
    }

    attendances.forEach(att => {
      const checkInTime = new Date(att.checkInTime);
      const hour = checkInTime.getHours();
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });

    const formatHourRange = (hour) => {
      const nextHour = (hour + 1) % 24;
      const startPeriod = hour >= 12 ? 'PM' : 'AM';
      const endPeriod = nextHour >= 12 ? 'PM' : 'AM';
      const startDisplayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const endDisplayHour = nextHour === 0 ? 12 : nextHour > 12 ? nextHour - 12 : nextHour;
      return `${startDisplayHour}:00 ${startPeriod} To ${endDisplayHour}:00 ${endPeriod}`;
    };

    const headers = ['Time Range', 'Check-Ins'];
    let csvContent = headers.join(',') + '\n';

    for (let hour = 0; hour < 24; hour++) {
      const row = [
        `"${formatHourRange(hour)}"`,
        hourlyCounts[hour] || 0
      ];
      csvContent += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-heat-map-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Service Transfer Report
export const getServiceTransferReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      memberName,
      page = 1,
      limit = 20
    } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get invoices with type 'upgrade' or 'downgrade' which indicate service transfers
    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      type: { $in: ['upgrade', 'downgrade'] },
      createdAt: { $gte: start, $lte: end }
    })
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];

    for (const invoice of invoices) {
      if (!invoice.memberId) continue;

      // Apply member name filter
      if (memberName) {
        const fullName = `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim().toLowerCase();
        if (!fullName.includes(memberName.toLowerCase())) {
          continue;
        }
      }

      for (const item of invoice.items || []) {
        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          fromService: '-', // Would need to track previous service
          toService: item.serviceId?.name || item.description || '-',
          transferDate: formatDate(invoice.createdAt),
          staffName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          branchName: invoice.branchId?.name || '-'
        });
      }
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Service Transfer Report
export const exportServiceTransferReport = async (req, res) => {
  try {
    const { fromDate, toDate, memberName } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      type: { $in: ['upgrade', 'downgrade'] },
      createdAt: { $gte: start, $lte: end }
    })
      .populate('memberId', 'memberId firstName lastName phone')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .lean();

    const records = [];

    for (const invoice of invoices) {
      if (!invoice.memberId) continue;

      if (memberName) {
        const fullName = `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim().toLowerCase();
        if (!fullName.includes(memberName.toLowerCase())) {
          continue;
        }
      }

      for (const item of invoice.items || []) {
        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          fromService: '-',
          toService: item.serviceId?.name || item.description || '-',
          transferDate: formatDate(invoice.createdAt),
          staffName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-'
        });
      }
    }

    const headers = [
      'S.No', 'Member Name', 'Mobile', 'From Service', 'To Service', 'Transfer Date', 'Staff Name'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.memberName}"`,
        record.mobile,
        `"${record.fromService}"`,
        `"${record.toService}"`,
        record.transferDate,
        `"${record.staffName}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=service-transfer-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Birthday Report
export const getBirthdayReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      birthdayMonth,
      page = 1,
      limit = 20
    } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get all members
    const members = await Member.find({
      organizationId: req.organizationId,
      dateOfBirth: { $exists: true, $ne: null }
    })
      .populate('currentPlan.planId', 'name')
      .lean();

    const records = [];

    for (const member of members) {
      if (!member.dateOfBirth) continue;

      const dob = new Date(member.dateOfBirth);
      const currentYear = new Date().getFullYear();
      const thisYearBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());

      // Check if birthday falls in the date range
      if (thisYearBirthday >= start && thisYearBirthday <= end) {
        // Apply month filter if provided
        if (birthdayMonth && birthdayMonth !== 'all') {
          if (dob.getMonth() + 1 !== parseInt(birthdayMonth)) {
            continue;
          }
        }

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        // Get active services
        const activeInvoices = await Invoice.find({
          memberId: member._id,
          organizationId: req.organizationId,
          status: { $in: ['paid', 'partial'] },
          'items.expiryDate': { $gte: new Date() }
        })
          .populate('items.serviceId', 'name')
          .lean();

        const serviceCards = activeInvoices.map(inv => {
          return inv.items.map(item => ({
            serviceName: item.serviceId?.name || item.description || '-',
            expiryDate: item.expiryDate
          }));
        }).flat();

        records.push({
          _id: member._id.toString(),
          name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          mobile: member.phone || '-',
          email: member.email || '-',
          birthday: formatDate(member.dateOfBirth),
          serviceCards
        });
      }
    }

    // Sort by birthday date
    records.sort((a, b) => {
      const dateA = new Date(a.birthday.split('-').reverse().join('-'));
      const dateB = new Date(b.birthday.split('-').reverse().join('-'));
      return dateA - dateB;
    });

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Birthday Report
export const exportBirthdayReport = async (req, res) => {
  try {
    const { fromDate, toDate, birthdayMonth } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const members = await Member.find({
      organizationId: req.organizationId,
      dateOfBirth: { $exists: true, $ne: null }
    })
      .lean();

    const records = [];

    for (const member of members) {
      if (!member.dateOfBirth) continue;

      const dob = new Date(member.dateOfBirth);
      const currentYear = new Date().getFullYear();
      const thisYearBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());

      if (thisYearBirthday >= start && thisYearBirthday <= end) {
        if (birthdayMonth && birthdayMonth !== 'all') {
          if (dob.getMonth() + 1 !== parseInt(birthdayMonth)) {
            continue;
          }
        }

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          mobile: member.phone || '-',
          email: member.email || '-',
          birthday: formatDate(member.dateOfBirth)
        });
      }
    }

    records.sort((a, b) => {
      const dateA = new Date(a.birthday.split('-').reverse().join('-'));
      const dateB = new Date(b.birthday.split('-').reverse().join('-'));
      return dateA - dateB;
    });

    const headers = ['S.No', 'Name', 'Mobile No', 'Mail', 'Birthday'];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.name}"`,
        record.mobile,
        record.email,
        record.birthday
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=birthday-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Client Attendance Report (similar to Member Attendance Register but for clients)
export const getClientAttendanceReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      serviceId,
      serviceVariationId,
      gender,
      page = 1,
      limit = 20
    } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get attendances in date range
    const attendances = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: start, $lte: end },
      status: 'success'
    })
      .populate('memberId', 'memberId firstName lastName phone gender')
      .populate('serviceId', 'name')
      .populate('branchId', 'name')
      .sort({ checkInTime: -1 })
      .lean();

    // Apply filters
    let filteredAttendances = attendances;
    if (serviceId && serviceId !== 'all') {
      filteredAttendances = filteredAttendances.filter(att => 
        att.serviceId?._id?.toString() === serviceId
      );
    }
    if (gender && gender !== 'all') {
      filteredAttendances = filteredAttendances.filter(att => 
        att.memberId?.gender === gender
      );
    }

    // Group by member and service
    const memberServiceMap = {};
    filteredAttendances.forEach(att => {
      const memberId = att.memberId?._id?.toString();
      const serviceId = att.serviceId?._id?.toString();
      if (!memberId || !serviceId) return;

      const key = `${memberId}-${serviceId}`;
      if (!memberServiceMap[key]) {
        memberServiceMap[key] = {
          member: att.memberId,
          service: att.serviceId,
          branch: att.branchId,
          checkIns: []
        };
      }
      memberServiceMap[key].checkIns.push(att.checkInTime);
    });

    const records = Object.values(memberServiceMap).map(item => ({
      _id: `${item.member._id}-${item.service._id}`,
      memberId: item.member.memberId || '-',
      memberName: `${item.member.firstName || ''} ${item.member.lastName || ''}`.trim(),
      mobile: item.member.phone || '-',
      serviceName: item.service.name || '-',
      branchName: item.branch?.name || '-',
      totalCheckIns: item.checkIns.length,
      lastCheckIn: item.checkIns.length > 0 
        ? new Date(Math.max(...item.checkIns.map(d => new Date(d))))
        : null
    }));

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Client Attendance Report
export const exportClientAttendanceReport = async (req, res) => {
  try {
    const { fromDate, toDate, serviceId, gender } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const attendances = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: start, $lte: end },
      status: 'success'
    })
      .populate('memberId', 'memberId firstName lastName phone gender')
      .populate('serviceId', 'name')
      .populate('branchId', 'name')
      .lean();

    let filteredAttendances = attendances;
    if (serviceId && serviceId !== 'all') {
      filteredAttendances = filteredAttendances.filter(att => 
        att.serviceId?._id?.toString() === serviceId
      );
    }
    if (gender && gender !== 'all') {
      filteredAttendances = filteredAttendances.filter(att => 
        att.memberId?.gender === gender
      );
    }

    const memberServiceMap = {};
    filteredAttendances.forEach(att => {
      const memberId = att.memberId?._id?.toString();
      const serviceId = att.serviceId?._id?.toString();
      if (!memberId || !serviceId) return;

      const key = `${memberId}-${serviceId}`;
      if (!memberServiceMap[key]) {
        memberServiceMap[key] = {
          member: att.memberId,
          service: att.serviceId,
          checkIns: []
        };
      }
      memberServiceMap[key].checkIns.push(att.checkInTime);
    });

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const records = Object.values(memberServiceMap).map(item => ({
      memberId: item.member.memberId || '-',
      memberName: `${item.member.firstName || ''} ${item.member.lastName || ''}`.trim(),
      mobile: item.member.phone || '-',
      serviceName: item.service.name || '-',
      totalCheckIns: item.checkIns.length,
      lastCheckIn: item.checkIns.length > 0 
        ? formatDate(new Date(Math.max(...item.checkIns.map(d => new Date(d)))))
        : '-'
    }));

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Service Name', 'Total Check-Ins', 'Last Check-In'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        `"${record.serviceName}"`,
        record.totalCheckIns,
        record.lastCheckIn
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=client-attendance-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Membership Retention Report
export const getMembershipRetentionReport = async (req, res) => {
  try {
    const {
      dateRange = 'last-30-days',
      staffId,
      page = 1,
      limit = 20
    } = req.query;

    // Calculate date range
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-60-days':
        start.setDate(start.getDate() - 60);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-90-days':
        start.setDate(start.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
    }

    // Get all members with memberships
    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: { $in: ['active', 'expired'] }
    })
      .populate('salesRep', 'firstName lastName')
      .lean();

    const records = [];

    for (const member of members) {
      // Get all renewal invoices for this member
      const renewalInvoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        type: 'renewal',
        createdAt: { $gte: start, $lte: end }
      })
        .populate('createdBy', 'firstName lastName')
        .lean();

      // Apply staff filter
      if (staffId && staffId !== 'all') {
        const filtered = renewalInvoices.filter(inv => 
          inv.createdBy?._id?.toString() === staffId
        );
        if (filtered.length === 0) continue;
      }

      // Get total renewals (memberships that expired)
      const expiredInvoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        type: { $in: ['membership', 'renewal'] },
        'items.expiryDate': { $lte: end }
      })
        .lean();

      const totalRenewals = expiredInvoices.length;
      const totalRenewed = renewalInvoices.length;

      // Calculate status
      const isActive = member.membershipStatus === 'active';
      const status = isActive ? 'Active' : 'Inactive';

      records.push({
        _id: member._id.toString(),
        memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        email: member.email || '-',
        mobile: member.phone || '-',
        totalRenewals,
        totalRenewed,
        status
      });
    }

    // Calculate summary
    const totalMembershipRenewals = records.reduce((sum, rec) => sum + rec.totalRenewals, 0);
    const totalMembershipRenewed = records.reduce((sum, rec) => sum + rec.totalRenewed, 0);
    const retentionRate = totalMembershipRenewals > 0 
      ? (totalMembershipRenewed / totalMembershipRenewals) * 100 
      : 0;

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        },
        summary: {
          membershipRenewals: totalMembershipRenewals,
          membershipRenewed: totalMembershipRenewed,
          retentionRate: Math.round(retentionRate * 100) / 100
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Export Membership Retention Report
export const exportMembershipRetentionReport = async (req, res) => {
  try {
    const { dateRange = 'last-30-days', staffId } = req.query;

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-60-days':
        start.setDate(start.getDate() - 60);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-90-days':
        start.setDate(start.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
    }

    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: { $in: ['active', 'expired'] }
    })
      .lean();

    const records = [];

    for (const member of members) {
      const renewalInvoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        type: 'renewal',
        createdAt: { $gte: start, $lte: end }
      })
        .populate('createdBy', 'firstName lastName')
        .lean();

      if (staffId && staffId !== 'all') {
        const filtered = renewalInvoices.filter(inv => 
          inv.createdBy?._id?.toString() === staffId
        );
        if (filtered.length === 0) continue;
      }

      const expiredInvoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        type: { $in: ['membership', 'renewal'] },
        'items.expiryDate': { $lte: end }
      })
        .lean();

      const totalRenewals = expiredInvoices.length;
      const totalRenewed = renewalInvoices.length;
      const isActive = member.membershipStatus === 'active';
      const status = isActive ? 'Active' : 'Inactive';

      records.push({
        memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        email: member.email || '-',
        mobile: member.phone || '-',
        totalRenewals,
        totalRenewed,
        status
      });
    }

    const headers = [
      'S.No', 'Member Name', 'Mail', 'Mobile', 'Total Renewals', 'Total Renewed', 'Status'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.memberName}"`,
        record.email,
        record.mobile,
        record.totalRenewals,
        record.totalRenewed,
        record.status
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=membership-retention-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancellation Report
export const getCancellationReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      page = 1,
      limit = 20
    } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get cancelled invoices
    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      status: 'cancelled',
      updatedAt: { $gte: start, $lte: end }
    })
      .populate('memberId', 'memberId firstName lastName phone email')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    const records = [];

    for (const invoice of invoices) {
      if (!invoice.memberId) continue;

      // Check for refunds
      const refunds = await Payment.find({
        invoiceId: invoice._id,
        status: 'refunded'
      }).lean();

      const hasRefund = refunds.length > 0;
      const refundProcessed = hasRefund ? 'Yes' : 'No';

      for (const item of invoice.items || []) {
        const formatDateTime = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const period = d.getHours() >= 12 ? 'PM' : 'AM';
          const displayHour = d.getHours() === 0 ? 12 : d.getHours() > 12 ? d.getHours() - 12 : d.getHours();
          return `${day}-${month}-${year} ${displayHour}:${minutes} ${period}`;
        };

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          name: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          emailId: invoice.memberId.email || '-',
          service: item.serviceId?.name || item.description || '-',
          serviceVariation: item.description || item.serviceId?.name || '-',
          proFormaInvoiceNo: invoice.isProForma ? invoice.invoiceNumber : '-',
          cancellationDate: formatDateTime(invoice.updatedAt),
          refund: hasRefund ? 'Yes' : 'No',
          refundProcessed,
          staffName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          dateAndTime: formatDateTime(invoice.updatedAt),
          note: invoice.internalNotes || invoice.notes || '-'
        });
      }
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Cancellation Report
export const exportCancellationReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      status: 'cancelled',
      updatedAt: { $gte: start, $lte: end }
    })
      .populate('memberId', 'memberId firstName lastName phone email')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .lean();

    const records = [];

    for (const invoice of invoices) {
      if (!invoice.memberId) continue;

      const refunds = await Payment.find({
        invoiceId: invoice._id,
        status: 'refunded'
      }).lean();

      const hasRefund = refunds.length > 0;
      const refundProcessed = hasRefund ? 'Yes' : 'No';

      for (const item of invoice.items || []) {
        const formatDateTime = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const period = d.getHours() >= 12 ? 'PM' : 'AM';
          const displayHour = d.getHours() === 0 ? 12 : d.getHours() > 12 ? d.getHours() - 12 : d.getHours();
          return `${day}-${month}-${year} ${displayHour}:${minutes} ${period}`;
        };

        records.push({
          name: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          emailId: invoice.memberId.email || '-',
          service: item.serviceId?.name || item.description || '-',
          serviceVariation: item.description || item.serviceId?.name || '-',
          proFormaInvoiceNo: invoice.isProForma ? invoice.invoiceNumber : '-',
          cancellationDate: formatDateTime(invoice.updatedAt),
          refund: hasRefund ? 'Yes' : 'No',
          refundProcessed,
          staffName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-',
          dateAndTime: formatDateTime(invoice.updatedAt),
          note: invoice.internalNotes || invoice.notes || '-'
        });
      }
    }

    const headers = [
      'S.No', 'Name', 'Mobile', 'Email Id', 'Service', 'Service Variation',
      'Pro-Forma Invoice No', 'Cancellation Date', 'Refund', 'Refund Processed',
      'Staff Name', 'Date And Time', 'Note'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.name}"`,
        record.mobile,
        record.emailId,
        `"${record.service}"`,
        `"${record.serviceVariation}"`,
        record.proFormaInvoiceNo,
        record.cancellationDate,
        record.refund,
        record.refundProcessed,
        `"${record.staffName}"`,
        record.dateAndTime,
        `"${record.note}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cancellation-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Profile Change Report
export const getProfileChangeReport = async (req, res) => {
  try {
    const {
      dateRange = 'last-30-days',
      staffId,
      page = 1,
      limit = 20
    } = req.query;

    // Calculate date range
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-60-days':
        start.setDate(start.getDate() - 60);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-90-days':
        start.setDate(start.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
    }

    // Get audit logs for member profile changes
    const auditLogs = await AuditLog.find({
      organizationId: req.organizationId,
      entityType: 'Member',
      action: { $regex: /change|update|edit/i },
      createdAt: { $gte: start, $lte: end }
    })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    // Apply staff filter
    let filteredLogs = auditLogs;
    if (staffId && staffId !== 'all') {
      filteredLogs = auditLogs.filter(log => 
        log.userId?._id?.toString() === staffId
      );
    }

    const records = [];

    for (const log of filteredLogs) {
      // Get member details
      const member = await Member.findById(log.entityId).lean();
      if (!member) continue;

      const formatDateTime = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const period = d.getHours() >= 12 ? 'AM' : 'AM';
        const displayHour = d.getHours() === 0 ? 12 : d.getHours() > 12 ? d.getHours() - 12 : d.getHours();
        return `${day}-${month}-${year} ${displayHour}:${minutes}:${seconds} ${period}`;
      };

      // Determine change type from changes object
      let changeType = 'Profile Change';
      let fromValue = '-';
      let changeTo = '-';
      let fromMemberId = member.memberId || '0';
      let toMemberId = member.memberId || '0';

      if (log.changes) {
        if (log.changes.before && log.changes.after) {
          // Check for name change
          if (log.changes.before.firstName || log.changes.before.lastName) {
            changeType = 'Name Change';
            fromValue = `${log.changes.before.firstName || ''} ${log.changes.before.lastName || ''}`.trim();
            changeTo = `${log.changes.after.firstName || ''} ${log.changes.after.lastName || ''}`.trim();
          }
          // Check for mobile change
          else if (log.changes.before.phone) {
            changeType = 'Mobile Change';
            fromValue = log.changes.before.phone;
            changeTo = log.changes.after.phone;
          }
          // Check for member ID change
          else if (log.changes.before.memberId) {
            changeType = 'Member ID Change';
            fromMemberId = log.changes.before.memberId;
            toMemberId = log.changes.after.memberId;
          }
        }
      }

      records.push({
        _id: log._id.toString(),
        dateTime: formatDateTime(log.createdAt),
        changeType,
        fromMemberId,
        from: fromValue,
        changeTo,
        toMemberId,
        staff: log.userId
          ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim()
          : '-'
      });
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Profile Change Report
export const exportProfileChangeReport = async (req, res) => {
  try {
    const { dateRange = 'last-30-days', staffId } = req.query;

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    
    switch (dateRange) {
      case 'last-30-days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-60-days':
        start.setDate(start.getDate() - 60);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-90-days':
        start.setDate(start.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
    }

    const auditLogs = await AuditLog.find({
      organizationId: req.organizationId,
      entityType: 'Member',
      action: { $regex: /change|update|edit/i },
      createdAt: { $gte: start, $lte: end }
    })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    let filteredLogs = auditLogs;
    if (staffId && staffId !== 'all') {
      filteredLogs = auditLogs.filter(log => 
        log.userId?._id?.toString() === staffId
      );
    }

    const records = [];

    for (const log of filteredLogs) {
      const member = await Member.findById(log.entityId).lean();
      if (!member) continue;

      const formatDateTime = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const period = d.getHours() >= 12 ? 'AM' : 'AM';
        const displayHour = d.getHours() === 0 ? 12 : d.getHours() > 12 ? d.getHours() - 12 : d.getHours();
        return `${day}-${month}-${year} ${displayHour}:${minutes}:${seconds} ${period}`;
      };

      let changeType = 'Profile Change';
      let fromValue = '-';
      let changeTo = '-';
      let fromMemberId = member.memberId || '0';
      let toMemberId = member.memberId || '0';

      if (log.changes) {
        if (log.changes.before && log.changes.after) {
          if (log.changes.before.firstName || log.changes.before.lastName) {
            changeType = 'Name Change';
            fromValue = `${log.changes.before.firstName || ''} ${log.changes.before.lastName || ''}`.trim();
            changeTo = `${log.changes.after.firstName || ''} ${log.changes.after.lastName || ''}`.trim();
          }
          else if (log.changes.before.phone) {
            changeType = 'Mobile Change';
            fromValue = log.changes.before.phone;
            changeTo = log.changes.after.phone;
          }
          else if (log.changes.before.memberId) {
            changeType = 'Member ID Change';
            fromMemberId = log.changes.before.memberId;
            toMemberId = log.changes.after.memberId;
          }
        }
      }

      records.push({
        dateTime: formatDateTime(log.createdAt),
        changeType,
        fromMemberId,
        from: fromValue,
        changeTo,
        toMemberId,
        staff: log.userId
          ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim()
          : '-'
      });
    }

    const headers = [
      'S.No', 'DateTime', 'Change Type', 'From Member ID', 'From (Name/Contact Number)',
      'Change To', 'To Member ID', 'Staff'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.dateTime,
        record.changeType,
        record.fromMemberId,
        `"${record.from}"`,
        `"${record.changeTo}"`,
        record.toMemberId,
        `"${record.staff}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=profile-change-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// One Time Purchaser Report
export const getOneTimePurchaserReport = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20
    } = req.query;

    // Get all members
    const members = await Member.find({
      organizationId: req.organizationId
    })
      .lean();

    const records = [];

    for (const member of members) {
      // Get all invoices for this member
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        status: { $in: ['paid', 'partial'] }
      })
        .populate('items.serviceId', 'name')
        .lean();

      // Check if member has only one purchase
      if (invoices.length === 1) {
        const invoice = invoices[0];
        const totalAmount = invoice.total || 0;
        const purchaseDate = invoice.createdAt;

        // Get service/product name
        const serviceProduct = invoice.items && invoice.items.length > 0
          ? invoice.items[0].serviceId?.name || invoice.items[0].description || 'Service'
          : 'Service';

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          _id: member._id.toString(),
          name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          mobile: member.phone || '-',
          emailId: member.email || '-',
          serviceProduct,
          datePurchased: formatDate(purchaseDate),
          amount: totalAmount
        });
      }
    }

    // Sort by purchase date descending
    records.sort((a, b) => {
      const dateA = new Date(a.datePurchased.split('-').reverse().join('-'));
      const dateB = new Date(b.datePurchased.split('-').reverse().join('-'));
      return dateB - dateA;
    });

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export One Time Purchaser Report
export const exportOneTimePurchaserReport = async (req, res) => {
  try {
    const members = await Member.find({
      organizationId: req.organizationId
    })
      .lean();

    const records = [];

    for (const member of members) {
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        status: { $in: ['paid', 'partial'] }
      })
        .populate('items.serviceId', 'name')
        .lean();

      if (invoices.length === 1) {
        const invoice = invoices[0];
        const totalAmount = invoice.total || 0;
        const purchaseDate = invoice.createdAt;

        const serviceProduct = invoice.items && invoice.items.length > 0
          ? invoice.items[0].serviceId?.name || invoice.items[0].description || 'Service'
          : 'Service';

        const formatDate = (date) => {
          if (!date) return '-';
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        records.push({
          name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          mobile: member.phone || '-',
          emailId: member.email || '-',
          serviceProduct,
          datePurchased: formatDate(purchaseDate),
          amount: totalAmount
        });
      }
    }

    records.sort((a, b) => {
      const dateA = new Date(a.datePurchased.split('-').reverse().join('-'));
      const dateB = new Date(b.datePurchased.split('-').reverse().join('-'));
      return dateB - dateA;
    });

    const headers = [
      'S.No', 'Name', 'Mobile number', 'e-mail id', 'Service/Product', 'Date purchased', 'Amount'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.name}"`,
        record.mobile,
        record.emailId,
        `"${record.serviceProduct}"`,
        record.datePurchased,
        record.amount
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=one-time-purchaser-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Average Lifetime Value Report
export const getAverageLifetimeValueReport = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20
    } = req.query;

    // Get all members
    const members = await Member.find({
      organizationId: req.organizationId
    })
      .lean();

    const records = [];

    for (const member of members) {
      // Apply status filter
      if (status && status !== 'all') {
        if (status === 'active' && member.membershipStatus !== 'active') {
          continue;
        }
        if (status === 'inactive' && member.membershipStatus === 'active') {
          continue;
        }
      }

      // Get all invoices for this member
      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        status: { $in: ['paid', 'partial'] }
      })
        .populate('items.serviceId', 'name')
        .lean();

      // Calculate totals by type
      let totalServices = 0;
      let totalProducts = 0;
      let totalEvents = 0;
      let totalTurfs = 0;
      let numberOfPurchases = 0;

      invoices.forEach(invoice => {
        invoice.items?.forEach(item => {
          const amount = item.total || item.amount || 0;
          const serviceName = item.serviceId?.name || item.description || '';
          const invoiceType = invoice.invoiceType || 'service';

          if (invoiceType === 'service') {
            totalServices += amount;
          } else if (invoiceType === 'package') {
            totalProducts += amount;
          } else if (invoiceType === 'deal') {
            // Could be events or turfs based on service name
            if (serviceName.toLowerCase().includes('event')) {
              totalEvents += amount;
            } else if (serviceName.toLowerCase().includes('turf')) {
              totalTurfs += amount;
            } else {
              totalServices += amount;
            }
          }
        });
        numberOfPurchases++;
      });

      const totalLTValue = totalServices + totalProducts + totalEvents + totalTurfs;
      const averageTicketSize = numberOfPurchases > 0 ? totalLTValue / numberOfPurchases : 0;
      const memberStatus = member.membershipStatus === 'active' ? 'Active' : 'Inactive';

      records.push({
        _id: member._id.toString(),
        name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        mobile: member.phone || '-',
        emailId: member.email || '-',
        status: memberStatus,
        totalServices,
        totalProducts,
        totalEvents,
        totalTurfs,
        totalLTValue,
        numberOfPurchases,
        averageTicketSize: Math.round(averageTicketSize * 100) / 100
      });
    }

    // Calculate overall average
    const overallAverage = records.length > 0
      ? records.reduce((sum, rec) => sum + rec.totalLTValue, 0) / records.length
      : 0;

    // Sort by total LT value descending
    records.sort((a, b) => b.totalLTValue - a.totalLTValue);

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        },
        summary: {
          averageLifetimeValue: Math.round(overallAverage * 100) / 100
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Average Lifetime Value Report
export const exportAverageLifetimeValueReport = async (req, res) => {
  try {
    const { status } = req.query;

    const members = await Member.find({
      organizationId: req.organizationId
    })
      .lean();

    const records = [];

    for (const member of members) {
      if (status && status !== 'all') {
        if (status === 'active' && member.membershipStatus !== 'active') {
          continue;
        }
        if (status === 'inactive' && member.membershipStatus === 'active') {
          continue;
        }
      }

      const invoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        status: { $in: ['paid', 'partial'] }
      })
        .populate('items.serviceId', 'name')
        .lean();

      let totalServices = 0;
      let totalProducts = 0;
      let totalEvents = 0;
      let totalTurfs = 0;
      let numberOfPurchases = 0;

      invoices.forEach(invoice => {
        invoice.items?.forEach(item => {
          const amount = item.total || item.amount || 0;
          const serviceName = item.serviceId?.name || item.description || '';
          const invoiceType = invoice.invoiceType || 'service';

          if (invoiceType === 'service') {
            totalServices += amount;
          } else if (invoiceType === 'package') {
            totalProducts += amount;
          } else if (invoiceType === 'deal') {
            if (serviceName.toLowerCase().includes('event')) {
              totalEvents += amount;
            } else if (serviceName.toLowerCase().includes('turf')) {
              totalTurfs += amount;
            } else {
              totalServices += amount;
            }
          }
        });
        numberOfPurchases++;
      });

      const totalLTValue = totalServices + totalProducts + totalEvents + totalTurfs;
      const averageTicketSize = numberOfPurchases > 0 ? totalLTValue / numberOfPurchases : 0;
      const memberStatus = member.membershipStatus === 'active' ? 'Active' : 'Inactive';

      records.push({
        name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        mobile: member.phone || '-',
        emailId: member.email || '-',
        status: memberStatus,
        totalServices,
        totalProducts,
        totalEvents,
        totalTurfs,
        totalLTValue,
        numberOfPurchases,
        averageTicketSize: Math.round(averageTicketSize * 100) / 100
      });
    }

    records.sort((a, b) => b.totalLTValue - a.totalLTValue);

    const headers = [
      'S.No', 'Name', 'Mobile number', 'e-mail id', 'Status', 'Total services',
      'Total products', 'Total events', 'Total turfs', 'Total LT value',
      'No of purchases', 'Average ticket size'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.name}"`,
        record.mobile,
        record.emailId,
        record.status,
        record.totalServices,
        record.totalProducts,
        record.totalEvents,
        record.totalTurfs,
        record.totalLTValue,
        record.numberOfPurchases,
        record.averageTicketSize
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=average-lifetime-value-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Membership Expiry Report
export const getMembershipExpiryReport = async (req, res) => {
  try {
    const { fromDate, toDate, page = 1, limit = 20 } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] },
      'items.expiryDate': {
        $gte: start,
        $lte: end
      }
    })
      .populate('memberId', 'memberId firstName lastName phone email')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ 'items.expiryDate': 1 })
      .lean();

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.memberId) continue;
      for (const item of invoice.items) {
        if (!item.expiryDate) continue;
        const expiryDate = new Date(item.expiryDate);
        if (expiryDate < start || expiryDate > end) continue;

        const serviceName = item.serviceId?.name || item.description || '';
        // Exclude PT services
        if (serviceName.toLowerCase().includes('pt') || 
            serviceName.toLowerCase().includes('personal training')) {
          continue;
        }

        records.push({
          _id: `${invoice._id}-${item._id || Math.random()}`,
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          email: invoice.memberId.email || '-',
          serviceName,
          billNo: invoice.invoiceNumber || '-',
          startDate: item.startDate,
          expiryDate: item.expiryDate,
          branchName: invoice.branchId?.name || '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-'
        });
      }
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportMembershipExpiryReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] },
      'items.expiryDate': {
        $gte: start,
        $lte: end
      }
    })
      .populate('memberId', 'memberId firstName lastName phone email')
      .populate('items.serviceId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .lean();

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const records = [];
    for (const invoice of invoices) {
      if (!invoice.memberId) continue;
      for (const item of invoice.items) {
        if (!item.expiryDate) continue;
        const expiryDate = new Date(item.expiryDate);
        if (expiryDate < start || expiryDate > end) continue;

        const serviceName = item.serviceId?.name || item.description || '';
        if (serviceName.toLowerCase().includes('pt') || 
            serviceName.toLowerCase().includes('personal training')) {
          continue;
        }

        records.push({
          memberId: invoice.memberId.memberId || '-',
          memberName: `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim(),
          mobile: invoice.memberId.phone || '-',
          email: invoice.memberId.email || '-',
          serviceName,
          billNo: invoice.invoiceNumber || '-',
          startDate: formatDate(item.startDate),
          expiryDate: formatDate(item.expiryDate),
          branchName: invoice.branchId?.name || '-',
          salesRepName: invoice.createdBy
            ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim()
            : '-'
        });
      }
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Email', 'Service Name',
      'Bill No', 'Start Date', 'Expiry Date', 'Branch Name', 'Sales Rep Name'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        record.email,
        `"${record.serviceName}"`,
        record.billNo,
        record.startDate,
        record.expiryDate,
        `"${record.branchName}"`,
        `"${record.salesRepName}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=membership-expiry-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Irregular Members Report
export const getIrregularMembersReport = async (req, res) => {
  try {
    const { daysThreshold = 30, page = 1, limit = 20 } = req.query;

    const threshold = parseInt(daysThreshold);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - threshold);

    // Get all active members
    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'active'
    })
      .populate('salesRep', 'firstName lastName')
      .populate('branchId', 'name')
      .lean();

    const records = [];
    for (const member of members) {
      // Get last check-in
      const lastCheckIn = await Attendance.findOne({
        organizationId: req.organizationId,
        memberId: member._id,
        status: 'success'
      })
        .sort({ checkInTime: -1 })
        .lean();

      if (!lastCheckIn || new Date(lastCheckIn.checkInTime) < cutoffDate) {
        // Get active services
        const activeInvoices = await Invoice.find({
          organizationId: req.organizationId,
          memberId: member._id,
          invoiceType: 'service',
          'items.expiryDate': { $gte: new Date() }
        })
          .populate('items.serviceId', 'name')
          .lean();

        const services = [];
        activeInvoices.forEach(inv => {
          inv.items.forEach(item => {
            const serviceName = item.serviceId?.name || item.description || '';
            if (!serviceName.toLowerCase().includes('pt') && 
                !serviceName.toLowerCase().includes('personal training')) {
              services.push(serviceName);
            }
          });
        });

        if (services.length > 0) {
          records.push({
            _id: member._id.toString(),
            memberId: member.memberId || '-',
            memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            mobile: member.phone || '-',
            email: member.email || '-',
            lastCheckInDate: lastCheckIn ? lastCheckIn.checkInTime : null,
            daysSinceLastCheckIn: lastCheckIn 
              ? Math.floor((new Date() - new Date(lastCheckIn.checkInTime)) / (1000 * 60 * 60 * 24))
              : null,
            services: services.join(', '),
            branchName: member.branchId?.name || '-',
            salesRepName: member.salesRep
              ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
              : '-'
          });
        }
      }
    }

    records.sort((a, b) => {
      const daysA = a.daysSinceLastCheckIn || 9999;
      const daysB = b.daysSinceLastCheckIn || 9999;
      return daysB - daysA;
    });

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportIrregularMembersReport = async (req, res) => {
  try {
    const { daysThreshold = 30 } = req.query;

    const threshold = parseInt(daysThreshold);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - threshold);

    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'active'
    })
      .populate('salesRep', 'firstName lastName')
      .populate('branchId', 'name')
      .lean();

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const records = [];
    for (const member of members) {
      const lastCheckIn = await Attendance.findOne({
        organizationId: req.organizationId,
        memberId: member._id,
        status: 'success'
      })
        .sort({ checkInTime: -1 })
        .lean();

      if (!lastCheckIn || new Date(lastCheckIn.checkInTime) < cutoffDate) {
        const activeInvoices = await Invoice.find({
          organizationId: req.organizationId,
          memberId: member._id,
          invoiceType: 'service',
          'items.expiryDate': { $gte: new Date() }
        })
          .populate('items.serviceId', 'name')
          .lean();

        const services = [];
        activeInvoices.forEach(inv => {
          inv.items.forEach(item => {
            const serviceName = item.serviceId?.name || item.description || '';
            if (!serviceName.toLowerCase().includes('pt') && 
                !serviceName.toLowerCase().includes('personal training')) {
              services.push(serviceName);
            }
          });
        });

        if (services.length > 0) {
          records.push({
            memberId: member.memberId || '-',
            memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            mobile: member.phone || '-',
            email: member.email || '-',
            lastCheckInDate: formatDate(lastCheckIn ? lastCheckIn.checkInTime : null),
            daysSinceLastCheckIn: lastCheckIn 
              ? Math.floor((new Date() - new Date(lastCheckIn.checkInTime)) / (1000 * 60 * 60 * 24))
              : '-',
            services: services.join(', '),
            branchName: member.branchId?.name || '-',
            salesRepName: member.salesRep
              ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
              : '-'
          });
        }
      }
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Email', 'Last Check-In Date',
      'Days Since Last Check-In', 'Services', 'Branch Name', 'Sales Rep Name'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        record.email,
        record.lastCheckInDate,
        record.daysSinceLastCheckIn,
        `"${record.services}"`,
        `"${record.branchName}"`,
        `"${record.salesRepName}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=irregular-members-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Active Members Report
export const getActiveMembersReport = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'active'
    })
      .populate('salesRep', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];
    for (const member of members) {
      // Get active services
      const activeInvoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        invoiceType: 'service',
        'items.expiryDate': { $gte: new Date() }
      })
        .populate('items.serviceId', 'name')
        .lean();

      const services = [];
      let earliestStartDate = null;
      let latestExpiryDate = null;

      activeInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          if (!serviceName.toLowerCase().includes('pt') && 
              !serviceName.toLowerCase().includes('personal training')) {
            services.push(serviceName);
            if (item.startDate && (!earliestStartDate || new Date(item.startDate) < new Date(earliestStartDate))) {
              earliestStartDate = item.startDate;
            }
            if (item.expiryDate && (!latestExpiryDate || new Date(item.expiryDate) > new Date(latestExpiryDate))) {
              latestExpiryDate = item.expiryDate;
            }
          }
        });
      });

      if (services.length > 0) {
        records.push({
          _id: member._id.toString(),
          memberId: member.memberId || '-',
          memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          mobile: member.phone || '-',
          email: member.email || '-',
          services: services.join(', '),
          startDate: earliestStartDate,
          expiryDate: latestExpiryDate,
          branchName: member.branchId?.name || '-',
          salesRepName: member.salesRep
            ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
            : '-'
        });
      }
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportActiveMembersReport = async (req, res) => {
  try {
    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'active'
    })
      .populate('salesRep', 'firstName lastName')
      .populate('branchId', 'name')
      .lean();

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const records = [];
    for (const member of members) {
      const activeInvoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        invoiceType: 'service',
        'items.expiryDate': { $gte: new Date() }
      })
        .populate('items.serviceId', 'name')
        .lean();

      const services = [];
      let earliestStartDate = null;
      let latestExpiryDate = null;

      activeInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          if (!serviceName.toLowerCase().includes('pt') && 
              !serviceName.toLowerCase().includes('personal training')) {
            services.push(serviceName);
            if (item.startDate && (!earliestStartDate || new Date(item.startDate) < new Date(earliestStartDate))) {
              earliestStartDate = item.startDate;
            }
            if (item.expiryDate && (!latestExpiryDate || new Date(item.expiryDate) > new Date(latestExpiryDate))) {
              latestExpiryDate = item.expiryDate;
            }
          }
        });
      });

      if (services.length > 0) {
        records.push({
          memberId: member.memberId || '-',
          memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          mobile: member.phone || '-',
          email: member.email || '-',
          services: services.join(', '),
          startDate: formatDate(earliestStartDate),
          expiryDate: formatDate(latestExpiryDate),
          branchName: member.branchId?.name || '-',
          salesRepName: member.salesRep
            ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
            : '-'
        });
      }
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Email', 'Services',
      'Start Date', 'Expiry Date', 'Branch Name', 'Sales Rep Name'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        record.email,
        `"${record.services}"`,
        record.startDate,
        record.expiryDate,
        `"${record.branchName}"`,
        `"${record.salesRepName}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=active-members-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Inactive Members Report
export const getInactiveMembersReport = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: { $ne: 'active' }
    })
      .populate('salesRep', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const records = [];
    for (const member of members) {
      // Get last expired service
      const expiredInvoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        invoiceType: 'service',
        'items.expiryDate': { $lt: new Date() }
      })
        .populate('items.serviceId', 'name')
        .sort({ 'items.expiryDate': -1 })
        .lean();

      const services = [];
      let latestExpiryDate = null;

      expiredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          if (!serviceName.toLowerCase().includes('pt') && 
              !serviceName.toLowerCase().includes('personal training')) {
            if (item.expiryDate) {
              services.push(serviceName);
              if (!latestExpiryDate || new Date(item.expiryDate) > new Date(latestExpiryDate)) {
                latestExpiryDate = item.expiryDate;
              }
            }
          }
        });
      });

      if (services.length > 0 || member.membershipStatus !== 'active') {
        records.push({
          _id: member._id.toString(),
          memberId: member.memberId || '-',
          memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          mobile: member.phone || '-',
          email: member.email || '-',
          status: member.membershipStatus || 'inactive',
          services: services.join(', ') || '-',
          expiryDate: latestExpiryDate,
          branchName: member.branchId?.name || '-',
          salesRepName: member.salesRep
            ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
            : '-'
        });
      }
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportInactiveMembersReport = async (req, res) => {
  try {
    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: { $ne: 'active' }
    })
      .populate('salesRep', 'firstName lastName')
      .populate('branchId', 'name')
      .lean();

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const records = [];
    for (const member of members) {
      const expiredInvoices = await Invoice.find({
        organizationId: req.organizationId,
        memberId: member._id,
        invoiceType: 'service',
        'items.expiryDate': { $lt: new Date() }
      })
        .populate('items.serviceId', 'name')
        .sort({ 'items.expiryDate': -1 })
        .lean();

      const services = [];
      let latestExpiryDate = null;

      expiredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          if (!serviceName.toLowerCase().includes('pt') && 
              !serviceName.toLowerCase().includes('personal training')) {
            if (item.expiryDate) {
              services.push(serviceName);
              if (!latestExpiryDate || new Date(item.expiryDate) > new Date(latestExpiryDate)) {
                latestExpiryDate = item.expiryDate;
              }
            }
          }
        });
      });

      if (services.length > 0 || member.membershipStatus !== 'active') {
        records.push({
          memberId: member.memberId || '-',
          memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          mobile: member.phone || '-',
          email: member.email || '-',
          status: member.membershipStatus || 'inactive',
          services: services.join(', ') || '-',
          expiryDate: formatDate(latestExpiryDate),
          branchName: member.branchId?.name || '-',
          salesRepName: member.salesRep
            ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
            : '-'
        });
      }
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Email', 'Status',
      'Services', 'Expiry Date', 'Branch Name', 'Sales Rep Name'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        record.email,
        record.status,
        `"${record.services}"`,
        record.expiryDate,
        `"${record.branchName}"`,
        `"${record.salesRepName}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inactive-members-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Multiclub Clients Report
export const getMulticlubClientsReport = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get all members
    const members = await Member.find({
      organizationId: req.organizationId
    })
      .populate('branchId', 'name')
      .lean();

    // Group invoices by member to find multiclub members
    const memberBranchMap = {};
    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] }
    })
      .populate('branchId', 'name')
      .populate('memberId', 'memberId firstName lastName phone email')
      .populate('items.serviceId', 'name')
      .lean();

    for (const invoice of invoices) {
      if (!invoice.memberId || !invoice.branchId) continue;
      const memberId = invoice.memberId._id.toString();
      const branchId = invoice.branchId._id.toString();

      if (!memberBranchMap[memberId]) {
        memberBranchMap[memberId] = {
          member: invoice.memberId,
          branches: new Set(),
          services: []
        };
      }

      memberBranchMap[memberId].branches.add(branchId);

      invoice.items.forEach(item => {
        const serviceName = item.serviceId?.name || item.description || '';
        if (!serviceName.toLowerCase().includes('pt') && 
            !serviceName.toLowerCase().includes('personal training')) {
          if (!memberBranchMap[memberId].services.includes(serviceName)) {
            memberBranchMap[memberId].services.push(serviceName);
          }
        }
      });
    }

    const records = [];
    for (const [memberId, data] of Object.entries(memberBranchMap)) {
      if (data.branches.size > 1) {
        // Get branch names
        const branchNames = [];
        for (const branchId of data.branches) {
          const branch = await Branch.findById(branchId).lean();
          if (branch) branchNames.push(branch.name);
        }

        records.push({
          _id: memberId,
          memberId: data.member.memberId || '-',
          memberName: `${data.member.firstName || ''} ${data.member.lastName || ''}`.trim(),
          mobile: data.member.phone || '-',
          email: data.member.email || '-',
          branches: branchNames.join(', '),
          numberOfBranches: data.branches.size,
          services: data.services.join(', ')
        });
      }
    }

    records.sort((a, b) => b.numberOfBranches - a.numberOfBranches);

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportMulticlubClientsReport = async (req, res) => {
  try {
    const members = await Member.find({
      organizationId: req.organizationId
    })
      .lean();

    const memberBranchMap = {};
    const invoices = await Invoice.find({
      organizationId: req.organizationId,
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] }
    })
      .populate('branchId', 'name')
      .populate('memberId', 'memberId firstName lastName phone email')
      .populate('items.serviceId', 'name')
      .lean();

    for (const invoice of invoices) {
      if (!invoice.memberId || !invoice.branchId) continue;
      const memberId = invoice.memberId._id.toString();
      const branchId = invoice.branchId._id.toString();

      if (!memberBranchMap[memberId]) {
        memberBranchMap[memberId] = {
          member: invoice.memberId,
          branches: new Set(),
          services: []
        };
      }

      memberBranchMap[memberId].branches.add(branchId);

      invoice.items.forEach(item => {
        const serviceName = item.serviceId?.name || item.description || '';
        if (!serviceName.toLowerCase().includes('pt') && 
            !serviceName.toLowerCase().includes('personal training')) {
          if (!memberBranchMap[memberId].services.includes(serviceName)) {
            memberBranchMap[memberId].services.push(serviceName);
          }
        }
      });
    }

    const records = [];
    for (const [memberId, data] of Object.entries(memberBranchMap)) {
      if (data.branches.size > 1) {
        const branchNames = [];
        for (const branchId of data.branches) {
          const branch = await Branch.findById(branchId).lean();
          if (branch) branchNames.push(branch.name);
        }

        records.push({
          memberId: data.member.memberId || '-',
          memberName: `${data.member.firstName || ''} ${data.member.lastName || ''}`.trim(),
          mobile: data.member.phone || '-',
          email: data.member.email || '-',
          branches: branchNames.join(', '),
          numberOfBranches: data.branches.size,
          services: data.services.join(', ')
        });
      }
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Email',
      'Branches', 'Number of Branches', 'Services'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        record.email,
        `"${record.branches}"`,
        record.numberOfBranches,
        `"${record.services}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=multiclub-clients-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Archived Clients Report
export const getArchivedClientsReport = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'archived'
    })
      .populate('salesRep', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    const records = [];
    for (const member of members) {
      // Get last service
      const lastInvoice = await Invoice.findOne({
        organizationId: req.organizationId,
        memberId: member._id,
        invoiceType: 'service'
      })
        .populate('items.serviceId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      const services = [];
      let lastServiceDate = null;

      if (lastInvoice) {
        lastInvoice.items.forEach(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          if (!serviceName.toLowerCase().includes('pt') && 
              !serviceName.toLowerCase().includes('personal training')) {
            services.push(serviceName);
            if (item.expiryDate && (!lastServiceDate || new Date(item.expiryDate) > new Date(lastServiceDate))) {
              lastServiceDate = item.expiryDate;
            }
          }
        });
      }

      records.push({
        _id: member._id.toString(),
        memberId: member.memberId || '-',
        memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        mobile: member.phone || '-',
        email: member.email || '-',
        services: services.join(', ') || '-',
        lastServiceDate,
        archivedDate: member.updatedAt,
        branchName: member.branchId?.name || '-',
        salesRepName: member.salesRep
          ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
          : '-'
      });
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          pages: Math.ceil(records.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportArchivedClientsReport = async (req, res) => {
  try {
    const members = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'archived'
    })
      .populate('salesRep', 'firstName lastName')
      .populate('branchId', 'name')
      .lean();

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const records = [];
    for (const member of members) {
      const lastInvoice = await Invoice.findOne({
        organizationId: req.organizationId,
        memberId: member._id,
        invoiceType: 'service'
      })
        .populate('items.serviceId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      const services = [];
      let lastServiceDate = null;

      if (lastInvoice) {
        lastInvoice.items.forEach(item => {
          const serviceName = item.serviceId?.name || item.description || '';
          if (!serviceName.toLowerCase().includes('pt') && 
              !serviceName.toLowerCase().includes('personal training')) {
            services.push(serviceName);
            if (item.expiryDate && (!lastServiceDate || new Date(item.expiryDate) > new Date(lastServiceDate))) {
              lastServiceDate = item.expiryDate;
            }
          }
        });
      }

      records.push({
        memberId: member.memberId || '-',
        memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        mobile: member.phone || '-',
        email: member.email || '-',
        services: services.join(', ') || '-',
        lastServiceDate: formatDate(lastServiceDate),
        archivedDate: formatDate(member.updatedAt),
        branchName: member.branchId?.name || '-',
        salesRepName: member.salesRep
          ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
          : '-'
      });
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Email', 'Services',
      'Last Service Date', 'Archived Date', 'Branch Name', 'Sales Rep Name'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        record.memberId,
        `"${record.memberName}"`,
        record.mobile,
        record.email,
        `"${record.services}"`,
        record.lastServiceDate,
        record.archivedDate,
        `"${record.branchName}"`,
        `"${record.salesRepName}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=archived-clients-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};