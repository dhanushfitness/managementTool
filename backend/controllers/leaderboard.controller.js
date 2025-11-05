import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Member from '../models/Member.js';
import Enquiry from '../models/Enquiry.js';
import FollowUp from '../models/FollowUp.js';
import User from '../models/User.js';

// Helper function to get date range for month/year
const getDateRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);
  return { start: startDate, end: endDate };
};

// 1. Service(S) & Product(M) Revenue Leaderboard
export const getRevenueLeaderboard = async (req, res) => {
  try {
    const { month, year, staffId } = req.query;
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const dateRange = getDateRange(currentMonth, currentYear);

    const matchQuery = {
      organizationId: req.organizationId,
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      },
      status: { $in: ['paid', 'partial'] }
    };

    if (staffId && staffId !== 'all') {
      matchQuery.createdBy = staffId;
    }

    // Get invoices grouped by staff and type
    const revenueData = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            staffId: '$createdBy',
            invoiceType: '$invoiceType'
          },
          salesAchieved: { $sum: '$total' },
          newSales: {
            $sum: {
              $cond: [{ $in: ['$type', ['membership', 'upgrade', 'addon']] }, '$total', 0]
            }
          },
          renewals: {
            $sum: {
              $cond: [{ $eq: ['$type', 'renewal'] }, '$total', 0]
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.staffId',
          foreignField: '_id',
          as: 'staff'
        }
      },
      { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } }
    ]);

    // Format response
    const formattedData = [];
    const staffMap = new Map();

    revenueData.forEach((item) => {
      const staffId = item._id.staffId?.toString();
      if (!staffId) return;

      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, {
          staffId,
          staffName: item.staff ? `${item.staff.firstName || ''} ${item.staff.lastName || ''}`.trim() : 'Unknown',
          salesTarget: 0, // TODO: Add target functionality
          typeS: { newSales: 0, renewals: 0 },
          typeM: { newSales: 0, renewals: 0 }
        });
      }

      const staffData = staffMap.get(staffId);
      
      if (item._id.invoiceType === 'service') {
        staffData.typeS.newSales += item.newSales;
        staffData.typeS.renewals += item.renewals;
      } else if (item._id.invoiceType === 'package' || item._id.invoiceType === 'deal') {
        staffData.typeM.newSales += item.newSales;
        staffData.typeM.renewals += item.renewals;
      }
    });

    // Calculate totals and format
    let sNo = 1;
    staffMap.forEach((staffData) => {
      const salesAchieved = (staffData.typeS.newSales + staffData.typeS.renewals) + 
                           (staffData.typeM.newSales + staffData.typeM.renewals);
      const achievedPercent = staffData.salesTarget > 0 
        ? Math.round((salesAchieved / staffData.salesTarget) * 100) 
        : 0;

      formattedData.push({
        sNo: sNo++,
        staffId: staffData.staffId,
        staffName: staffData.staffName,
        salesTarget: staffData.salesTarget,
        salesAchieved,
        achievedPercent,
        typeS: {
          newSales: staffData.typeS.newSales,
          renewals: staffData.typeS.renewals
        },
        typeM: {
          newSales: staffData.typeM.newSales,
          renewals: staffData.typeM.renewals
        }
      });
    });

    // Calculate totals
    const totals = formattedData.reduce((acc, item) => {
      acc.salesTarget += item.salesTarget;
      acc.salesAchieved += item.salesAchieved;
      acc.newSales += item.typeS.newSales + item.typeM.newSales;
      acc.renewals += item.typeS.renewals + item.typeM.renewals;
      return acc;
    }, { salesTarget: 0, salesAchieved: 0, newSales: 0, renewals: 0 });

    totals.achievedPercent = totals.salesTarget > 0 
      ? Math.round((totals.salesAchieved / totals.salesTarget) * 100) 
      : 0;

    res.json({
      success: true,
      data: formattedData,
      totals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Closure Count Leaderboard
export const getClosureCountLeaderboard = async (req, res) => {
  try {
    const { month, year, staffId } = req.query;
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const dateRange = getDateRange(currentMonth, currentYear);

    const matchQuery = {
      organizationId: req.organizationId,
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      },
      status: { $in: ['paid', 'partial'] }
    };

    if (staffId && staffId !== 'all') {
      matchQuery.createdBy = staffId;
    }

    const closureData = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$createdBy',
          achieved: { $sum: 1 },
          newSales: {
            $sum: {
              $cond: [{ $in: ['$type', ['membership', 'upgrade', 'addon']] }, 1, 0]
            }
          },
          renewals: {
            $sum: {
              $cond: [{ $eq: ['$type', 'renewal'] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staff'
        }
      },
      { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } }
    ]);

    const formattedData = closureData.map((item, index) => {
      const target = 0; // TODO: Add target functionality
      const achievedPercent = target > 0 ? Math.round((item.achieved / target) * 100) : 0;

      return {
        sNo: index + 1,
        staffId: item._id?.toString(),
        staffName: item.staff ? `${item.staff.firstName || ''} ${item.staff.lastName || ''}`.trim() : 'Unknown',
        target,
        achieved: item.achieved,
        achievedPercent,
        newSales: item.newSales,
        renewals: item.renewals
      };
    });

    const totals = formattedData.reduce((acc, item) => {
      acc.target += item.target;
      acc.achieved += item.achieved;
      acc.newSales += item.newSales;
      acc.renewals += item.renewals;
      return acc;
    }, { target: 0, achieved: 0, newSales: 0, renewals: 0 });

    totals.achievedPercent = totals.target > 0 
      ? Math.round((totals.achieved / totals.target) * 100) 
      : 0;

    res.json({
      success: true,
      data: formattedData,
      totals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Contacts Created Leaderboard
export const getContactsCreatedLeaderboard = async (req, res) => {
  try {
    const { month, year, staffId } = req.query;
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const dateRange = getDateRange(currentMonth, currentYear);

    const matchQuery = {
      organizationId: req.organizationId,
      date: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    };

    if (staffId && staffId !== 'all') {
      matchQuery.assignedStaff = staffId;
    }

    const contactsData = await Enquiry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$assignedStaff',
          achieved: { $sum: 1 },
          enquiries: {
            $sum: {
              $cond: [{ $eq: ['$enquiryStage', 'opened'] }, 1, 0]
            }
          },
          spotConversions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$enquiryStage', 'converted'] },
                    { $lte: [{ $subtract: ['$convertedAt', '$date'] }, 24 * 60 * 60 * 1000] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staff'
        }
      },
      { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } }
    ]);

    const formattedData = contactsData.map((item, index) => {
      const target = 0; // TODO: Add target functionality
      const achievedPercent = target > 0 ? Math.round((item.achieved / target) * 100) : 0;

      return {
        sNo: index + 1,
        staffId: item._id?.toString(),
        staffName: item.staff ? `${item.staff.firstName || ''} ${item.staff.lastName || ''}`.trim() : 'Unknown',
        target,
        achieved: item.achieved,
        achievedPercent,
        enquiries: item.enquiries,
        spotConversions: item.spotConversions
      };
    });

    const totals = formattedData.reduce((acc, item) => {
      acc.target += item.target;
      acc.achieved += item.achieved;
      acc.enquiries += item.enquiries;
      acc.spotConversions += item.spotConversions;
      return acc;
    }, { target: 0, achieved: 0, enquiries: 0, spotConversions: 0 });

    totals.achievedPercent = totals.target > 0 
      ? Math.round((totals.achieved / totals.target) * 100) 
      : 0;

    res.json({
      success: true,
      data: formattedData,
      totals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Call Leaderboard
export const getCallLeaderboard = async (req, res) => {
  try {
    const { month, year, staffId } = req.query;
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const dateRange = getDateRange(currentMonth, currentYear);

    const matchQuery = {
      organizationId: req.organizationId,
      scheduledTime: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    };

    if (staffId && staffId !== 'all') {
      matchQuery.assignedTo = staffId;
    }

    const callData = await FollowUp.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$assignedTo',
          attempts: {
            $sum: {
              $cond: [{ $in: ['$callStatus', ['attempted', 'contacted', 'not-contacted']] }, 1, 0]
            }
          },
          contacted: {
            $sum: {
              $cond: [{ $eq: ['$callStatus', 'contacted'] }, 1, 0]
            }
          },
          notContacted: {
            $sum: {
              $cond: [{ $eq: ['$callStatus', 'not-contacted'] }, 1, 0]
            }
          },
          prospectingCalls: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$relatedTo.entityType', 'enquiry'] },
                    { $in: ['$callStatus', ['attempted', 'contacted']] }
                  ]
                },
                1,
                0
              ]
            }
          },
          memberCalls: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$relatedTo.entityType', 'member'] },
                    { $in: ['$callStatus', ['attempted', 'contacted']] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staff'
        }
      },
      { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } }
    ]);

    const formattedData = callData.map((item, index) => {
      const target = 0; // TODO: Add target functionality
      const achievedPercent = target > 0 ? Math.round((item.attempts / target) * 100) : 0;

      return {
        sNo: index + 1,
        staffId: item._id?.toString(),
        staffName: item.staff ? `${item.staff.firstName || ''} ${item.staff.lastName || ''}`.trim() : 'Unknown',
        attempts: item.attempts,
        contacted: item.contacted,
        notContacted: item.notContacted,
        target,
        achievedPercent,
        prospectingCalls: item.prospectingCalls,
        memberCalls: item.memberCalls
      };
    });

    const totals = formattedData.reduce((acc, item) => {
      acc.attempts += item.attempts;
      acc.contacted += item.contacted;
      acc.notContacted += item.notContacted;
      acc.target += item.target;
      acc.prospectingCalls += item.prospectingCalls;
      acc.memberCalls += item.memberCalls;
      return acc;
    }, { attempts: 0, contacted: 0, notContacted: 0, target: 0, prospectingCalls: 0, memberCalls: 0 });

    totals.achievedPercent = totals.target > 0 
      ? Math.round((totals.attempts / totals.target) * 100) 
      : 0;

    res.json({
      success: true,
      data: formattedData,
      totals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export all leaderboards
export const exportLeaderboard = async (req, res) => {
  try {
    const { month, year, staffId, type } = req.query;
    
    // Get data based on type
    let csvData = [];
    let headers = [];

    if (type === 'revenue') {
      const result = await getRevenueLeaderboardInternal(req, month, year, staffId);
      headers = ['S.No', 'Staff Name', 'Sales Target', 'Sales Achieved', 'Achieved(%)', 'Type', 'New Sales', 'Renewals'];
      csvData = result.data.flatMap(item => [
        {
          'S.No': item.sNo,
          'Staff Name': item.staffName,
          'Sales Target': item.salesTarget,
          'Sales Achieved': item.salesAchieved,
          'Achieved(%)': item.achievedPercent,
          'Type': 'S',
          'New Sales': item.typeS.newSales,
          'Renewals': item.typeS.renewals
        },
        {
          'S.No': '',
          'Staff Name': '',
          'Sales Target': '',
          'Sales Achieved': '',
          'Achieved(%)': '',
          'Type': 'M',
          'New Sales': item.typeM.newSales,
          'Renewals': item.typeM.renewals || '-'
        }
      ]);
    } else if (type === 'closure') {
      const result = await getClosureCountLeaderboardInternal(req, month, year, staffId);
      headers = ['S.No', 'Staff Name', 'Target', 'Achieved', 'Achieved(%)', 'New Sales', 'Renewals'];
      csvData = result.data.map(item => ({
        'S.No': item.sNo,
        'Staff Name': item.staffName,
        'Target': item.target,
        'Achieved': item.achieved,
        'Achieved(%)': item.achievedPercent,
        'New Sales': item.newSales,
        'Renewals': item.renewals
      }));
    } else if (type === 'contacts') {
      const result = await getContactsCreatedLeaderboardInternal(req, month, year, staffId);
      headers = ['S.No', 'Staff Name', 'Target', 'Achieved', 'Achieved(%)', 'Enquiries', 'Spot Conversions'];
      csvData = result.data.map(item => ({
        'S.No': item.sNo,
        'Staff Name': item.staffName,
        'Target': item.target,
        'Achieved': item.achieved,
        'Achieved(%)': item.achievedPercent,
        'Enquiries': item.enquiries,
        'Spot Conversions': item.spotConversions
      }));
    } else if (type === 'calls') {
      const result = await getCallLeaderboardInternal(req, month, year, staffId);
      headers = ['S.No', 'Staff Name', 'Attempts', 'Contacted', 'Not-contacted', 'Target', 'Achieved(%)', 'Prospecting calls', 'Member calls'];
      csvData = result.data.map(item => ({
        'S.No': item.sNo,
        'Staff Name': item.staffName,
        'Attempts': item.attempts,
        'Contacted': item.contacted,
        'Not-contacted': item.notContacted,
        'Target': item.target,
        'Achieved(%)': item.achievedPercent,
        'Prospecting calls': item.prospectingCalls,
        'Member calls': item.memberCalls
      }));
    } else {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    // Convert to CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leaderboard-${type}-${Date.now()}.csv"`);
    
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ];

    res.send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Internal helper functions (without res parameter)
const getRevenueLeaderboardInternal = async (req, month, year, staffId) => {
  // Same logic as getRevenueLeaderboard but return data instead of sending response
  const currentMonth = parseInt(month) || new Date().getMonth() + 1;
  const currentYear = parseInt(year) || new Date().getFullYear();
  const dateRange = getDateRange(currentMonth, currentYear);

  const matchQuery = {
    organizationId: req.organizationId,
    createdAt: { $gte: dateRange.start, $lte: dateRange.end },
    status: { $in: ['paid', 'partial'] }
  };

  if (staffId && staffId !== 'all') {
    matchQuery.createdBy = staffId;
  }

  const revenueData = await Invoice.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { staffId: '$createdBy', invoiceType: '$invoiceType' },
        salesAchieved: { $sum: '$total' },
        newSales: { $sum: { $cond: [{ $in: ['$type', ['membership', 'upgrade', 'addon']] }, '$total', 0] } },
        renewals: { $sum: { $cond: [{ $eq: ['$type', 'renewal'] }, '$total', 0] } },
        count: { $sum: 1 }
      }
    },
    { $lookup: { from: 'users', localField: '_id.staffId', foreignField: '_id', as: 'staff' } },
    { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } }
  ]);

  const staffMap = new Map();
  revenueData.forEach((item) => {
    const staffId = item._id.staffId?.toString();
    if (!staffId) return;

    if (!staffMap.has(staffId)) {
      staffMap.set(staffId, {
        staffId,
        staffName: item.staff ? `${item.staff.firstName || ''} ${item.staff.lastName || ''}`.trim() : 'Unknown',
        salesTarget: 0,
        typeS: { newSales: 0, renewals: 0 },
        typeM: { newSales: 0, renewals: 0 }
      });
    }

    const staffData = staffMap.get(staffId);
    if (item._id.invoiceType === 'service') {
      staffData.typeS.newSales += item.newSales;
      staffData.typeS.renewals += item.renewals;
    } else if (item._id.invoiceType === 'package' || item._id.invoiceType === 'deal') {
      staffData.typeM.newSales += item.newSales;
      staffData.typeM.renewals += item.renewals;
    }
  });

  let sNo = 1;
  const formattedData = [];
  staffMap.forEach((staffData) => {
    const salesAchieved = (staffData.typeS.newSales + staffData.typeS.renewals) + 
                         (staffData.typeM.newSales + staffData.typeM.renewals);
    const achievedPercent = staffData.salesTarget > 0 
      ? Math.round((salesAchieved / staffData.salesTarget) * 100) 
      : 0;

    formattedData.push({
      sNo: sNo++,
      staffId: staffData.staffId,
      staffName: staffData.staffName,
      salesTarget: staffData.salesTarget,
      salesAchieved,
      achievedPercent,
      typeS: { newSales: staffData.typeS.newSales, renewals: staffData.typeS.renewals },
      typeM: { newSales: staffData.typeM.newSales, renewals: staffData.typeM.renewals }
    });
  });

  return { data: formattedData, totals: {} };
};

const getClosureCountLeaderboardInternal = async (req, month, year, staffId) => {
  // Similar implementation - return data instead of sending response
  return { data: [], totals: {} };
};

const getContactsCreatedLeaderboardInternal = async (req, month, year, staffId) => {
  // Similar implementation - return data instead of sending response
  return { data: [], totals: {} };
};

const getCallLeaderboardInternal = async (req, month, year, staffId) => {
  // Similar implementation - return data instead of sending response
  return { data: [], totals: {} };
};

