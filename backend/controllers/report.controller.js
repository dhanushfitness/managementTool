import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Member from '../models/Member.js';
import Attendance from '../models/Attendance.js';

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

