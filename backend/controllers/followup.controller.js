import FollowUp from '../models/FollowUp.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import Enquiry from '../models/Enquiry.js';
import { createObjectCsvWriter } from 'csv-writer';

const parseDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  if (typeof value === 'string') {
    const sanitized = value.replace(/\//g, '-');
    const parts = sanitized.split('-');

    if (parts.length === 3) {
      const [p1, p2, p3] = parts;

      const isYearFirst = p1.length === 4;
      const isYearLast = p3.length === 4;

      let day;
      let month;
      let year;

      if (isYearFirst) {
        year = Number(p1);
        month = Number(p2);
        day = Number(p3);
      } else if (isYearLast) {
        day = Number(p1);
        month = Number(p2);
        year = Number(p3);
      } else {
        day = Number(p1);
        month = Number(p2);
        year = Number(p3);
      }

      if (
        Number.isFinite(day) &&
        Number.isFinite(month) &&
        Number.isFinite(year) &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        const parsed = new Date(Date.UTC(year, month - 1, day));
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
  }

  return null;
};

const formatDisplayDate = (value) => {
  const date = parseDateValue(value);
  if (!date) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

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

const ENQUIRY_STATUS_TO_CALL_STATUS = {
  answered: 'contacted',
  'not-called': 'scheduled',
  missed: 'missed',
  'no-answer': 'missed',
  busy: 'attempted',
  enquiry: 'not-contacted',
  'future-prospect': 'not-contacted',
  'not-interested': 'not-contacted'
};

const getCallStatusFromEnquiry = (lastCallStatus) => {
  if (!lastCallStatus) return 'scheduled';
  return ENQUIRY_STATUS_TO_CALL_STATUS[lastCallStatus] || 'scheduled';
};

const buildTaskboardFilters = ({
  organizationId,
  fromDate,
  toDate,
  staffId,
  callType
}) => {
  const baseFilters = [
    { organizationId }
  ];

  if (staffId && staffId !== 'all') {
    baseFilters.push({ assignedTo: staffId });
  }

  if (callType && callType !== 'all') {
    baseFilters.push({ callType });
  }

  const dateRange = getDateRange(fromDate, toDate);
  baseFilters.push({
    $or: [
      {
        scheduledTime: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      },
      {
        $and: [
          { $or: [{ scheduledTime: null }, { scheduledTime: { $exists: false } }] },
          {
            dueDate: {
              $gte: dateRange.start,
              $lte: dateRange.end
            }
          }
        ]
      }
    ]
  });

  return {
    filters: baseFilters,
    dateRange
  };
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

  const { filters, dateRange } = buildTaskboardFilters({
    organizationId: req.organizationId,
    fromDate,
    toDate,
    staffId,
    callType
  });

  const includeEnquiries = !callType || callType === 'all' || callType === 'enquiry-call';

  if (callStatus && callStatus !== 'all') {
    filters.push({ callStatus });
  } else if (tab === 'upcoming') {
    filters.push({ callStatus: { $in: ['scheduled', 'missed', 'not-contacted'] } });
  } else if (tab === 'attempted') {
    filters.push({ callStatus: { $in: ['attempted', 'contacted'] } });
  }

  const query = filters.length > 1 ? { $and: filters } : filters[0];

  const followUps = await FollowUp.find(query)
    .populate('assignedTo', 'firstName lastName')
    .populate('relatedTo.entityId')
    .sort({ scheduledTime: 1, dueDate: 1 })
    .lean();

  const formattedFollowUps = await Promise.all(
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

      const effectiveDate = parseDateValue(followUp.scheduledTime || followUp.dueDate);
      const timeStr = effectiveDate
        ? effectiveDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'N/A';
      const dateLabel = formatDisplayDate(effectiveDate);
      const effectiveISO = effectiveDate ? effectiveDate.toISOString() : null;

      return {
        sNo: index + 1,
        _id: followUp._id,
        time: timeStr,
        callType: followUp.callType || 'follow-up-call',
        memberName: memberName || 'N/A',
        memberMobile: memberMobile || 'N/A',
        memberMobileDate: dateLabel,
        callStatus: followUp.callStatus || 'scheduled',
        staffName: followUp.assignedTo
          ? `${followUp.assignedTo.firstName || ''} ${followUp.assignedTo.lastName || ''}`.trim()
          : 'Unassigned',
        scheduledTime: followUp.scheduledTime,
        dueDate: followUp.dueDate,
        effectiveScheduledTime: effectiveISO,
        dateLabel,
        timeLabel: timeStr,
        entityType: followUp.relatedTo?.entityType || null,
        entityId: followUp.relatedTo?.entityId || null
      };
    })
  );

    let combinedFollowUps = [...formattedFollowUps];

    if (includeEnquiries) {
      const enquiryQuery = {
        organizationId: req.organizationId,
        isArchived: false,
        followUpDate: {
          $exists: true,
          $ne: null,
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      };

      if (staffId && staffId !== 'all') {
        enquiryQuery.assignedStaff = staffId;
      }

      const enquiries = await Enquiry.find(enquiryQuery)
        .populate('assignedStaff', 'firstName lastName')
        .lean();

      const filteredEnquiries = enquiries.filter((enquiry) => {
        const enquiryCallStatus = getCallStatusFromEnquiry(enquiry.lastCallStatus);

        if (callStatus && callStatus !== 'all') {
          return enquiryCallStatus === callStatus;
        }

        if (tab === 'upcoming') {
          return ['scheduled', 'not-contacted', 'missed'].includes(enquiryCallStatus);
        }

        if (tab === 'attempted') {
          return ['attempted', 'contacted'].includes(enquiryCallStatus);
        }

        return true;
      });

      const enquiryFollowUps = filteredEnquiries.map((enquiry) => {
        const effectiveDate = parseDateValue(enquiry.followUpDate);
        const timeStr = effectiveDate
          ? effectiveDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'N/A';
        const dateLabel = formatDisplayDate(effectiveDate);

        const staffName = enquiry.assignedStaff
          ? `${enquiry.assignedStaff.firstName || ''} ${enquiry.assignedStaff.lastName || ''}`.trim()
          : 'Unassigned';

        return {
          _id: `enquiry-${enquiry._id}`,
          isEnquiry: true,
          callType: 'enquiry-call',
          memberName: enquiry.name || 'N/A',
          memberMobile: enquiry.phone || 'N/A',
          callStatus: getCallStatusFromEnquiry(enquiry.lastCallStatus),
          staffName: staffName || 'Unassigned',
          scheduledTime: enquiry.followUpDate || null,
          dueDate: enquiry.followUpDate || enquiry.date,
          effectiveScheduledTime: effectiveDate ? effectiveDate.toISOString() : null,
          dateLabel,
          timeLabel: timeStr,
          entityType: 'enquiry',
          entityId: enquiry._id
        };
      });

      combinedFollowUps.push(...enquiryFollowUps);
    }

    const sortedFollowUps = combinedFollowUps
      .sort((a, b) => {
        const getTimeValue = (item) => {
          if (item.effectiveScheduledTime) return new Date(item.effectiveScheduledTime).getTime();
          if (item.scheduledTime) return new Date(item.scheduledTime).getTime();
          if (item.dueDate) return new Date(item.dueDate).getTime();
          return Number.MAX_SAFE_INTEGER;
        };
        return getTimeValue(a) - getTimeValue(b);
      })
      .map((item, index) => ({
        ...item,
        sNo: index + 1,
        time: item.time || item.timeLabel || 'N/A'
      }));

    res.json({
      success: true,
      followUps: sortedFollowUps,
      total: sortedFollowUps.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskboardStats = async (req, res) => {
  try {
    const { fromDate, toDate, staffId, callType } = req.query;

    const { filters, dateRange } = buildTaskboardFilters({
      organizationId: req.organizationId,
      fromDate,
      toDate,
      staffId,
      callType
    });

    const query = filters.length > 1 ? { $and: filters } : filters[0];

    const allFollowUps = await FollowUp.find(query).lean();

    const includeEnquiries = !callType || callType === 'all' || callType === 'enquiry-call';
    let enquiryCounts = {
      total: 0,
      scheduled: 0,
      attempted: 0,
      contacted: 0,
      notContacted: 0,
      missed: 0
    };

    if (includeEnquiries) {
      const enquiryQuery = {
        organizationId: req.organizationId,
        isArchived: false,
        followUpDate: {
          $exists: true,
          $ne: null,
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      };

      if (staffId && staffId !== 'all') {
        enquiryQuery.assignedStaff = staffId;
      }

      const enquiries = await Enquiry.find(enquiryQuery).lean();

      enquiries.forEach((enquiry) => {
        const status = getCallStatusFromEnquiry(enquiry.lastCallStatus);
        enquiryCounts.total += 1;
        if (status === 'scheduled') enquiryCounts.scheduled += 1;
        else if (status === 'attempted') enquiryCounts.attempted += 1;
        else if (status === 'contacted') enquiryCounts.contacted += 1;
        else if (status === 'missed') enquiryCounts.missed += 1;
        else enquiryCounts.notContacted += 1;
      });
    }

    const total = allFollowUps.length + enquiryCounts.total;

    const scheduledFollowUps = allFollowUps.filter(f => f.callStatus === 'scheduled').length;
    const attemptedFollowUps = allFollowUps.filter(f => f.callStatus === 'attempted').length;
    const contactedFollowUps = allFollowUps.filter(f => f.callStatus === 'contacted').length;
    const notContactedFollowUps = allFollowUps.filter(f => f.callStatus === 'not-contacted').length;
    const missedFollowUps = allFollowUps.filter(f => f.callStatus === 'missed').length;

    const scheduled = scheduledFollowUps + enquiryCounts.scheduled;
    const attempted = attemptedFollowUps + enquiryCounts.attempted;
    const contacted = contactedFollowUps + enquiryCounts.contacted;
    const notContacted = notContactedFollowUps + enquiryCounts.notContacted;
    const missed = missedFollowUps + enquiryCounts.missed;

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

    const { filters } = buildTaskboardFilters({
      organizationId: req.organizationId,
      fromDate,
      toDate,
      staffId,
      callType
    });

    if (callStatus && callStatus !== 'all') {
      filters.push({ callStatus });
    }

    const query = filters.length > 1 ? { $and: filters } : filters[0];

    const followUps = await FollowUp.find(query)
      .populate('assignedTo', 'firstName lastName')
      .populate('relatedTo.entityId')
      .sort({ scheduledTime: 1, dueDate: 1 })
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

        const effectiveDate = followUp.scheduledTime || followUp.dueDate || null;
        const scheduledTime = effectiveDate ? new Date(effectiveDate) : null;
        const timeStr = scheduledTime
          ? scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'N/A';
        const dateStr = scheduledTime
          ? scheduledTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : 'N/A';

        return {
          'S.No': index + 1,
          'Date': dateStr,
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
    const headers = ['S.No', 'Date', 'Time', 'Call Type', 'Member Name', 'Member Mobile', 'Call Status', 'Staff Name'];
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ];

    res.send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

