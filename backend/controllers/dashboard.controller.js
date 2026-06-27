import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Member from '../models/Member.js';
import Attendance from '../models/Attendance.js';
import FollowUp from '../models/FollowUp.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

// Helper function to get date range
const getDateRange = (fromDate, toDate, dateFilter) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (fromDate && toDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    return { start: from, end: to };
  }

  switch (dateFilter) {
    case 'today':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: today, end: tomorrow };
    case 'last7days':
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      return { start: last7Days, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'last30days':
      const last30Days = new Date(today);
      last30Days.setDate(last30Days.getDate() - 30);
      return { start: last30Days, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'all-time':
      return null;
    default:
      const defaultTomorrow = new Date(today);
      defaultTomorrow.setDate(defaultTomorrow.getDate() + 1);
      return { start: today, end: defaultTomorrow };
  }
};

// Returns the period immediately before the current date range (same duration)
const getPreviousDateRange = (fromDate, toDate, dateFilter) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (fromDate && toDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    const durationMs = to.getTime() - from.getTime() + 1;
    return {
      start: new Date(from.getTime() - durationMs),
      end: new Date(from.getTime() - 1)
    };
  }

  switch (dateFilter) {
    case 'today': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: new Date(today.getTime() - 1) };
    }
    case 'last7days': {
      const prevEnd = new Date(today);
      prevEnd.setDate(prevEnd.getDate() - 7);
      const prevStart = new Date(today);
      prevStart.setDate(prevStart.getDate() - 14);
      return { start: prevStart, end: prevEnd };
    }
    case 'last30days': {
      const prevEnd = new Date(today);
      prevEnd.setDate(prevEnd.getDate() - 30);
      const prevStart = new Date(today);
      prevStart.setDate(prevStart.getDate() - 60);
      return { start: prevStart, end: prevEnd };
    }
    case 'all-time':
      return null;
    default: {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: new Date(today.getTime() - 1) };
    }
  }
};

const buildSalesMatch = (organizationId, dateRange) => {
  const dateCondition = dateRange ? {
    $or: [
      { dateOfInvoice: { $gte: dateRange.start, $lte: dateRange.end } },
      { dateOfInvoice: { $exists: false }, createdAt: { $gte: dateRange.start, $lte: dateRange.end } },
      { dateOfInvoice: null, createdAt: { $gte: dateRange.start, $lte: dateRange.end } }
    ]
  } : {};
  return { organizationId, ...dateCondition };
};

const buildPaymentsMatch = (organizationId, dateRange) => {
  const match = { organizationId, status: 'completed' };
  if (dateRange) {
    match.$or = [
      { paidAt: { $gte: dateRange.start, $lte: dateRange.end } },
      { paidAt: null, createdAt: { $gte: dateRange.start, $lte: dateRange.end } }
    ];
  }
  return match;
};

export const getDashboardStats = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { fromDate, toDate, dateFilter = 'today' } = req.query;
    const dateRange = getDateRange(fromDate, toDate, dateFilter);
    const prevDateRange = getPreviousDateRange(fromDate, toDate, dateFilter);

    // Current period
    const [sales, paymentsCollected, prevSales, prevCollected] = await Promise.all([
      Invoice.aggregate([
        { $match: buildSalesMatch(organizationId, dateRange) },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Payment.aggregate([
        { $match: buildPaymentsMatch(organizationId, dateRange) },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Previous period
      prevDateRange
        ? Invoice.aggregate([
            { $match: buildSalesMatch(organizationId, prevDateRange) },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ])
        : Promise.resolve([]),
      prevDateRange
        ? Payment.aggregate([
            { $match: buildPaymentsMatch(organizationId, prevDateRange) },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ])
        : Promise.resolve([])
    ]);

    // Payments Pending (all outstanding invoices — not period-filtered)
    const dues = await Invoice.aggregate([
      {
        $match: {
          organizationId,
          status: { $in: ['sent', 'overdue', 'partial'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pending' },
          count: { $sum: 1 }
        }
      }
    ]);

    // New Clients (created in date range)
    const newClientsDateMatch = dateRange ? {
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    } : {};
    const newClients = await Member.countDocuments({
      organizationId,
      ...newClientsDateMatch
    });

    // Renewals (members with subscriptions renewed in date range)
    const renewalsDateMatch = dateRange ? {
      'subscriptions.startDate': {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    } : {};
    const renewals = await Member.countDocuments({
      organizationId,
      membershipStatus: 'active',
      ...renewalsDateMatch
    });

    // Check-ins (in date range)
    const checkInsDateMatch = dateRange ? {
      checkInTime: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    } : {};
    const checkIns = await Attendance.countDocuments({
      organizationId,
      status: 'success',
      ...checkInsDateMatch
    });

    // Active members count
    const activeMembers = await Member.countDocuments({
      organizationId,
      membershipStatus: 'active',
      isActive: true
    });

    res.json({
      success: true,
      stats: {
        sales: sales[0]?.total || 0,
        paymentsCollected: paymentsCollected[0]?.total || 0,
        paymentsPending: dues[0]?.total || 0,
        newClients,
        renewals,
        checkIns,
        activeMembers,
        duesCount: dues[0]?.count || 0,
        previousSales: prevDateRange ? (prevSales[0]?.total ?? null) : null,
        previousCollected: prevDateRange ? (prevCollected[0]?.total ?? null) : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRecentActivities = async (req, res) => {
  try {
    // Recent activities would include recent payments, check-ins, etc.
    const recentPayments = await Payment.find({ organizationId: req.organizationId })
      .populate('memberId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentCheckIns = await Attendance.find({ 
      organizationId: req.organizationId,
      status: 'success'
    })
      .populate('memberId', 'firstName lastName')
      .sort({ checkInTime: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      activities: {
        payments: recentPayments,
        checkIns: recentCheckIns
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUpcomingRenewals = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const renewals = await Member.find({
      organizationId: req.organizationId,
      membershipStatus: 'active',
      'currentPlan.endDate': {
        $lte: endDate,
        $gte: new Date()
      }
    })
      .select('firstName lastName phone currentPlan memberId')
      .sort({ 'currentPlan.endDate': 1 })
      .limit(20)
      .lean();

    res.json({ success: true, renewals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPendingPayments = async (req, res) => {
  try {
    const pending = await Invoice.find({
      organizationId: req.organizationId,
      status: { $in: ['sent', 'overdue', 'partial'] }
    })
      .populate('memberId', 'firstName lastName phone')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    res.json({ success: true, pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendanceToday = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.find({
      organizationId: req.organizationId,
      checkInTime: { $gte: today, $lt: tomorrow }
    })
      .populate('memberId', 'firstName lastName memberId profilePicture')
      .populate('branchId', 'name')
      .sort({ checkInTime: -1 })
      .lean();

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getQuickStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalMembers,
      activeMembers,
      todayCheckIns,
      todayRevenue
    ] = await Promise.all([
      Member.countDocuments({ organizationId: req.organizationId, isActive: true }),
      Member.countDocuments({ organizationId: req.organizationId, membershipStatus: 'active', isActive: true }),
      Attendance.countDocuments({ organizationId: req.organizationId, checkInTime: { $gte: today }, status: 'success' }),
      Payment.aggregate([
        {
          $match: {
            organizationId: req.organizationId,
            status: 'completed',
            paidAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        todayCheckIns,
        todayRevenue: todayRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardSummary = async (req, res) => {
  try {
    const today = req.query.date
      ? (() => { const [y, m, d] = req.query.date.split('-').map(Number); return new Date(y, m - 1, d); })()
      : new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Follow-ups (pending for today)
    const followUps = await FollowUp.countDocuments({
      organizationId: req.organizationId,
      status: 'pending',
      dueDate: { $gte: today, $lt: tomorrow }
    });

    // Appointments (today only)
    const appointments = await Appointment.countDocuments({
      organizationId: req.organizationId,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Service expiry (expiring today)
    const serviceExpiry = await Member.countDocuments({
      organizationId: req.organizationId,
      'currentPlan.endDate': { $gte: today, $lt: tomorrow },
      membershipStatus: 'active'
    });

    // Upgrades (eligible for upgrade today)
    const upgrades = await Member.countDocuments({
      organizationId: req.organizationId,
      membershipStatus: 'active',
      'currentPlan.endDate': { $gte: today, $lt: tomorrow }
    });

    // Client birthdays — use JS local date methods (same as birthday report) to avoid UTC vs local mismatch
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const [clientsWithDOB, staffWithDOB] = await Promise.all([
      Member.find({ organizationId: req.organizationId, dateOfBirth: { $exists: true, $ne: null } })
        .select('dateOfBirth').lean(),
      User.find({ organizationId: req.organizationId, dateOfBirth: { $exists: true, $ne: null } })
        .select('dateOfBirth').lean()
    ]);

    const matchesBirthday = (dob) => {
      const d = new Date(dob);
      return !isNaN(d.getTime()) && d.getMonth() === todayMonth && d.getDate() === todayDate;
    };

    const clientBirthdays = clientsWithDOB.filter(m => matchesBirthday(m.dateOfBirth)).length;
    const staffBirthdays = staffWithDOB.filter(u => matchesBirthday(u.dateOfBirth)).length;

    // Pending collections (invoices with pending amount and dueDate today)
    const pendingCollections = await Invoice.countDocuments({
      organizationId: req.organizationId,
      pending: { $gt: 0 },
      dueDate: { $gte: today, $lt: tomorrow }
    });

    res.json({
      success: true,
      data: {
        followUps,
        appointments,
        serviceExpiry,
        upgrades,
        clientBirthdays,
        staffBirthdays,
        pendingCollections
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentCollectedByMode = async (req, res) => {
  try {
    const { fromDate, toDate, dateFilter } = req.query;
    const dateRange = getDateRange(fromDate, toDate, dateFilter);
    
    const dateQuery = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };

    const payments = await Payment.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          status: 'completed',
          paidAt: dateQuery
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    const total = payments.reduce((sum, p) => sum + p.total, 0);

    res.json({
      success: true,
      data: {
        payments: payments.map((p, index) => ({
          sNo: index + 1,
          payMode: p._id || 'Unknown',
          amount: p.total
        })),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdvancePayments = async (req, res) => {
  try {
    // Get advance payments (payments made for future subscriptions)
    const advancePayments = await Payment.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          status: 'completed',
          type: 'advance'
        }
      },
      {
        $group: {
          _id: null,
          collected: { $sum: '$amount' },
          utilized: { $sum: { $ifNull: ['$utilizedAmount', 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        collected: advancePayments[0]?.collected || 0,
        utilized: advancePayments[0]?.utilized || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

