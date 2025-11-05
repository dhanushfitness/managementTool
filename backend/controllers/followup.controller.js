import FollowUp from '../models/FollowUp.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import Enquiry from '../models/Enquiry.js';
import { createObjectCsvWriter } from 'csv-writer';

// Helper function to get date range
const getDateRange = (fromDate, toDate) => {
  if (fromDate && toDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    return { start: from, end: to };
  }
  // Default to today if no dates provided
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { start: today, end: tomorrow };
};

export const getTaskboard = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      staffId,
      callType,
      callStatus,
      tab = 'upcoming' // 'upcoming' or 'attempted'
    } = req.query;

    const dateRange = getDateRange(fromDate, toDate);
    
    // Build query
    const query = {
      organizationId: req.organizationId,
      scheduledTime: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    };

    // Apply filters
    if (staffId && staffId !== 'all') {
      query.assignedTo = staffId;
    }

    if (callType && callType !== 'all') {
      query.callType = callType;
    }

    if (callStatus && callStatus !== 'all') {
      query.callStatus = callStatus;
    }

    // Filter by tab
    if (tab === 'upcoming') {
      query.callStatus = { $in: ['scheduled', 'missed'] };
    } else if (tab === 'attempted') {
      query.callStatus = { $in: ['attempted', 'contacted', 'not-contacted'] };
    }

    // Fetch follow-ups with populated data
    const followUps = await FollowUp.find(query)
      .populate('assignedTo', 'firstName lastName')
      .populate('relatedTo.entityId')
      .sort({ scheduledTime: 1 })
      .lean();

    // Format response with member details
    const formattedFollowUps = await Promise.all(
      followUps.map(async (followUp, index) => {
        let memberName = '';
        let memberMobile = '';
        let memberId = '';

        if (followUp.relatedTo?.entityType === 'member' && followUp.relatedTo?.entityId) {
          const member = await Member.findById(followUp.relatedTo.entityId).lean();
          if (member) {
            memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
            memberMobile = member.phone || '';
            memberId = member.memberId || '';
          }
        } else if (followUp.relatedTo?.entityType === 'enquiry' && followUp.relatedTo?.entityId) {
          const enquiry = await Enquiry.findById(followUp.relatedTo.entityId).lean();
          if (enquiry) {
            memberName = enquiry.name || '';
            memberMobile = enquiry.phone || '';
            memberId = enquiry.enquiryId || '';
          }
        }

        // Format scheduled time
        const scheduledTime = followUp.scheduledTime ? new Date(followUp.scheduledTime) : null;
        const timeStr = scheduledTime
          ? scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'N/A';
        const dateStr = scheduledTime
          ? scheduledTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '';

        return {
          sNo: index + 1,
          _id: followUp._id,
          time: timeStr,
          callType: followUp.callType || 'follow-up-call',
          memberName: memberName || 'N/A',
          memberMobile: memberMobile || 'N/A',
          memberMobileDate: dateStr,
          callStatus: followUp.callStatus || 'scheduled',
          staffName: followUp.assignedTo
            ? `${followUp.assignedTo.firstName || ''} ${followUp.assignedTo.lastName || ''}`.trim()
            : 'Unassigned',
          scheduledTime: followUp.scheduledTime,
          dueDate: followUp.dueDate
        };
      })
    );

    res.json({
      success: true,
      followUps: formattedFollowUps,
      total: formattedFollowUps.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskboardStats = async (req, res) => {
  try {
    const { fromDate, toDate, staffId, callType } = req.query;
    const dateRange = getDateRange(fromDate, toDate);

    const query = {
      organizationId: req.organizationId,
      scheduledTime: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    };

    if (staffId && staffId !== 'all') {
      query.assignedTo = staffId;
    }

    if (callType && callType !== 'all') {
      query.callType = callType;
    }

    // Get all follow-ups in date range
    const allFollowUps = await FollowUp.find(query).lean();

    const total = allFollowUps.length;
    const scheduled = allFollowUps.filter(f => f.callStatus === 'scheduled').length;
    const attempted = allFollowUps.filter(f => f.callStatus === 'attempted').length;
    const contacted = allFollowUps.filter(f => f.callStatus === 'contacted').length;
    const notContacted = allFollowUps.filter(f => f.callStatus === 'not-contacted').length;
    const missed = allFollowUps.filter(f => f.callStatus === 'missed').length;

    // Calculate percentages
    const scheduledPercent = total > 0 ? Math.round((scheduled / total) * 100) : 0;
    const attemptedPercent = total > 0 ? Math.round((attempted / total) * 100) : 0;
    const contactedPercent = total > 0 ? Math.round((contacted / total) * 100) : 0;
    const notContactedPercent = total > 0 ? Math.round((notContacted / total) * 100) : 0;
    const missedPercent = total > 0 ? Math.round((missed / total) * 100) : 0;

    res.json({
      success: true,
      stats: {
        scheduled: { count: scheduled, percent: scheduledPercent },
        attempted: { count: attempted, percent: attemptedPercent },
        contacted: { count: contacted, percent: contactedPercent },
        notContacted: { count: notContacted, percent: notContactedPercent },
        missed: { count: missed, percent: missedPercent },
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFollowUpStatus = async (req, res) => {
  try {
    const { followUpId } = req.params;
    const { callStatus } = req.body;

    const followUp = await FollowUp.findOne({
      _id: followUpId,
      organizationId: req.organizationId
    });

    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    followUp.callStatus = callStatus;
    
    if (callStatus === 'attempted') {
      followUp.attemptedAt = new Date();
    } else if (callStatus === 'contacted') {
      followUp.contactedAt = new Date();
      followUp.status = 'completed';
    }

    await followUp.save();

    res.json({ success: true, followUp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportTaskboard = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      staffId,
      callType,
      callStatus
    } = req.query;

    const dateRange = getDateRange(fromDate, toDate);
    
    const query = {
      organizationId: req.organizationId,
      scheduledTime: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    };

    if (staffId && staffId !== 'all') {
      query.assignedTo = staffId;
    }

    if (callType && callType !== 'all') {
      query.callType = callType;
    }

    if (callStatus && callStatus !== 'all') {
      query.callStatus = callStatus;
    }

    const followUps = await FollowUp.find(query)
      .populate('assignedTo', 'firstName lastName')
      .populate('relatedTo.entityId')
      .sort({ scheduledTime: 1 })
      .lean();

    // Format data for CSV
    const csvData = await Promise.all(
      followUps.map(async (followUp, index) => {
        let memberName = '';
        let memberMobile = '';

        if (followUp.relatedTo?.entityType === 'member' && followUp.relatedTo?.entityId) {
          const member = await Member.findById(followUp.relatedTo.entityId).lean();
          if (member) {
            memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
            memberMobile = member.phone || '';
          }
        } else if (followUp.relatedTo?.entityType === 'enquiry' && followUp.relatedTo?.entityId) {
          const enquiry = await Enquiry.findById(followUp.relatedTo.entityId).lean();
          if (enquiry) {
            memberName = enquiry.name || '';
            memberMobile = enquiry.phone || '';
          }
        }

        const scheduledTime = followUp.scheduledTime ? new Date(followUp.scheduledTime) : null;
        const timeStr = scheduledTime
          ? scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'N/A';

        return {
          'S.No': index + 1,
          'Time': timeStr,
          'Call Type': followUp.callType || 'N/A',
          'Member Name': memberName || 'N/A',
          'Member Mobile': memberMobile || 'N/A',
          'Call Status': followUp.callStatus || 'N/A',
          'Staff Name': followUp.assignedTo
            ? `${followUp.assignedTo.firstName || ''} ${followUp.assignedTo.lastName || ''}`.trim()
            : 'Unassigned'
        };
      })
    );

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="taskboard-${Date.now()}.csv"`);

    // Convert to CSV string manually
    const headers = ['S.No', 'Time', 'Call Type', 'Member Name', 'Member Mobile', 'Call Status', 'Staff Name'];
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ];

    res.send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

