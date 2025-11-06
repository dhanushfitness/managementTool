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

