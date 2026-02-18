import Enquiry from '../models/Enquiry.js';
import Member from '../models/Member.js';
import Invoice from '../models/Invoice.js';
import AuditLog from '../models/AuditLog.js';
import Appointment from '../models/Appointment.js';
import { handleError } from '../utils/errorHandler.js';

// Normalize phone number for comparison (remove spaces, dashes, and other special characters)
const normalizePhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

// Generate enquiry ID with collision handling
const generateEnquiryId = async (organizationId) => {
  // Find the highest existing enquiryId for this organization
  const lastEnquiry = await Enquiry.findOne({ organizationId })
    .sort({ enquiryId: -1 })
    .select('enquiryId')
    .lean();

  let nextNumber = 1;
  
  if (lastEnquiry && lastEnquiry.enquiryId) {
    // Extract the number from the last enquiryId (e.g., "ENQ000014" -> 14)
    const match = lastEnquiry.enquiryId.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1;
    }
  }

  // Generate ID and check for collisions (retry up to 10 times)
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const enquiryId = `ENQ${String(nextNumber).padStart(6, '0')}`;
    
    // Check if this ID already exists
    const exists = await Enquiry.findOne({ enquiryId }).select('_id').lean();
    
    if (!exists) {
      return enquiryId;
    }
    
    // If it exists, try the next number
    nextNumber++;
    attempts++;
  }
  
  // Fallback: use timestamp-based ID if all attempts fail
  return `ENQ${Date.now().toString().slice(-6)}`;
};

const mapCallStatusToLastCallStatus = (status) => {
  if (!status) return undefined;

  const statusMap = {
    scheduled: 'scheduled',
    missed: 'missed',
    attempted: 'busy',
    busy: 'busy',
    'no-answer': 'no-answer',
    'not-contacted': 'not-called',
    'not-called': 'not-called',
    contacted: 'answered',
    completed: 'answered',
    answered: 'answered',
    enquiry: 'enquiry',
    'future-prospect': 'future-prospect',
    'not-interested': 'not-interested'
  };

  return statusMap[status] || undefined;
};

export const createEnquiry = async (req, res) => {
  try {
    // Handle follow-up date (map followUpDate to expectedClosureDate) - declare outside loop
    const followUpDate = req.body.followUpDate ? new Date(req.body.followUpDate) : null;
    const hasValidFollowUpDate = Boolean(followUpDate && !Number.isNaN(followUpDate.getTime()));
    
    // Retry logic for handling duplicate key errors
    let enquiry;
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      try {
        const enquiryId = await generateEnquiryId(req.organizationId);
        
        // If service is provided, fetch its name (could be Service or Plan)
        let serviceName = req.body.serviceName;
        let serviceId = req.body.service;
        
        if (serviceId && !serviceName) {
          // Try to find as Plan first
          const Plan = (await import('../models/Plan.js')).default;
          const plan = await Plan.findById(serviceId);
          if (plan) {
            serviceName = plan.name;
            serviceId = plan._id; // Use plan ID for reference
          } else {
            // If not found as Plan, try to find as Service
            const Service = (await import('../models/Service.js')).default;
            const service = await Service.findById(serviceId);
            if (service) {
              serviceName = service.name;
              // For Service, we don't set serviceId reference (as it expects Plan)
              // Just save the serviceName
              serviceId = null;
            }
          }
        }
        
        const enquiryData = {
          ...req.body,
          organizationId: req.organizationId,
          branchId: req.body.branchId || req.user.branchId,
          enquiryId,
          serviceName,
          expectedClosureDate: hasValidFollowUpDate ? followUpDate : req.body.expectedClosureDate,
          followUpDate: hasValidFollowUpDate ? followUpDate : undefined,
          createdBy: req.user._id
        };

        // Set service reference only if it's a Plan, otherwise null
        if (serviceId) {
          enquiryData.service = serviceId;
        } else {
          enquiryData.service = null;
        }

        // Initialize callLogs array
        enquiryData.callLogs = [];

        // If message/notes is provided, add it as a call log entry
        const message = req.body.notes || req.body.message;
        if (message && message.trim()) {
          enquiryData.callLogs.push({
            date: new Date(),
            status: 'enquiry',
            notes: message.trim(),
            staffId: req.body.assignedStaff || req.user._id
          });
          // Update lastCallStatus to 'enquiry' when message is provided
          if (!enquiryData.lastCallStatus || enquiryData.lastCallStatus === 'not-called') {
            enquiryData.lastCallStatus = 'enquiry';
          }
        }
        // If no message and no lastCallStatus set, default to 'not-called'
        else if (!enquiryData.lastCallStatus) {
          enquiryData.lastCallStatus = 'not-called';
        }

        // If follow-up date/time is provided, add to call logs before creating
        if (hasValidFollowUpDate && req.body.assignedStaff) {
          enquiryData.callLogs.push({
            date: followUpDate,
            status: 'scheduled',
            notes: 'Follow-up scheduled during enquiry creation',
            staffId: req.body.assignedStaff
          });
        }

        enquiry = await Enquiry.create(enquiryData);
        break; // Success, exit retry loop
      } catch (error) {
        // Check if it's a duplicate key error
        if (error.code === 11000 && error.keyPattern && error.keyPattern.enquiryId) {
          retries++;
          if (retries >= maxRetries) {
            throw new Error('Failed to generate unique enquiry ID after multiple attempts. Please try again.');
          }
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 50 * retries));
          continue;
        }
        // If it's not a duplicate key error, throw it immediately
        throw error;
      }
    }

    // If follow-up date/time is provided, create FollowUp entry
    if (hasValidFollowUpDate && req.body.assignedStaff) {
      const FollowUp = (await import('../models/FollowUp.js')).default;
      await FollowUp.create({
        organizationId: req.organizationId,
        branchId: enquiry.branchId,
        type: 'follow-up',
        callType: 'enquiry-call',
        callStatus: 'scheduled',
        scheduledTime: followUpDate,
        title: `Follow up with ${enquiry.name}`,
        description: 'Follow-up scheduled during enquiry creation',
        relatedTo: {
          entityType: 'enquiry',
          entityId: enquiry._id
        },
        dueDate: followUpDate,
        status: 'pending',
        assignedTo: req.body.assignedStaff,
        createdBy: req.user._id
      });
    }

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'enquiry.created',
      entityType: 'Enquiry',
      entityId: enquiry._id
    });

    res.status(201).json({ success: true, enquiry });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const getEnquiries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      dateFilter,
      startDate,
      endDate,
      enquiryStage,
      leadSource,
      service,
      staffId,
      gender,
      callTag,
      lastCallStatus,
      isMember,
      isLead,
      isArchived,
      q
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { organizationId: req.organizationId };

    // Date filter
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = { $gte: today, $lt: tomorrow };
    } else if (dateFilter === 'last7days') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      query.date = { $gte: date };
    } else if (dateFilter === 'last30days') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      query.date = { $gte: date };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Other filters
    if (enquiryStage) query.enquiryStage = enquiryStage;
    if (leadSource) query.leadSource = leadSource;
    if (service) query.service = service;
    if (staffId) query.assignedStaff = staffId;
    if (gender) query.gender = gender;
    if (callTag) query.callTag = callTag;
    if (lastCallStatus) query.lastCallStatus = lastCallStatus;
    if (isMember !== undefined) query.isMember = isMember === 'true';
    if (isLead !== undefined) query.isLead = isLead === 'true';
    if (isArchived !== undefined) query.isArchived = isArchived === 'true';
    if (q && q.trim()) {
      const searchTerm = q.trim();
      query.$or = [
        { enquiryId: { $regex: searchTerm, $options: 'i' } },
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const enquiries = await Enquiry.find(query)
      .populate('service', 'name')
      .populate('assignedStaff', 'firstName lastName')
      .populate('convertedToMember', 'memberId firstName lastName')
      .populate('callLogs.staffId', 'firstName lastName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Enquiry.countDocuments(query);

    res.json({
      success: true,
      enquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const searchEnquiries = async (req, res) => {
  try {
    const { q, searchType } = req.query;

    if (!q || !q.trim()) {
      return res.json({ success: true, enquiries: [] });
    }

    const searchTerm = q.trim();
    const query = {
      organizationId: req.organizationId,
      isArchived: false
    };

    switch (searchType) {
      case 'email':
        query.email = { $regex: searchTerm, $options: 'i' };
        break;
      case 'phone':
        query.phone = { $regex: searchTerm, $options: 'i' };
        break;
      case 'enquiry-id':
        query.enquiryId = { $regex: searchTerm, $options: 'i' };
        break;
      case 'member-name':
      default:
        query.name = { $regex: searchTerm, $options: 'i' };
        break;
    }

    const enquiries = await Enquiry.find(query)
      .select('name phone email enquiryId enquiryStage date')
      .sort({ date: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, enquiries });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const getEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      _id: req.params.enquiryId,
      organizationId: req.organizationId
    })
      .populate('service')
      .populate('assignedStaff')
      .populate('convertedToMember')
      .populate('createdBy', 'firstName lastName')
      .populate('callLogs.staffId', 'firstName lastName');

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    // Sort call logs by date descending (most recent first)
    if (enquiry.callLogs && enquiry.callLogs.length > 0) {
      enquiry.callLogs.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA; // Highest date (most recent) first
      });
    }

    res.json({ success: true, enquiry });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const updateEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      _id: req.params.enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    // If service is being updated, fetch its name from either Plan or Service model
    if (req.body.service && !req.body.serviceName) {
      try {
        const Plan = (await import('../models/Plan.js')).default;
        const plan = await Plan.findById(req.body.service);
        if (plan) {
          req.body.serviceName = plan.name;
        } else {
          // Try Service model if Plan not found
          const Service = (await import('../models/Service.js')).default;
          const service = await Service.findById(req.body.service);
          if (service) {
            req.body.serviceName = service.name;
          }
        }
      } catch (error) {
        // If both fail, serviceName will remain undefined
        console.error('Error fetching service name:', error);
      }
    }

    // Handle follow-up date (map followUpDate to expectedClosureDate)
    if (req.body.followUpDate !== undefined) {
      if (!req.body.followUpDate) {
        req.body.followUpDate = null;
      } else {
        const parsedFollowUpDate = new Date(req.body.followUpDate);
        if (Number.isNaN(parsedFollowUpDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid follow-up date' });
        }
        req.body.followUpDate = parsedFollowUpDate;
        req.body.expectedClosureDate = parsedFollowUpDate;
      }
    }

    Object.assign(enquiry, req.body);
    await enquiry.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'enquiry.updated',
      entityType: 'Enquiry',
      entityId: enquiry._id
    });

    res.json({ success: true, enquiry });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      _id: req.params.enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    await Enquiry.deleteOne({ _id: enquiry._id });

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'enquiry.deleted',
      entityType: 'Enquiry',
      entityId: enquiry._id
    });

    res.json({ success: true, message: 'Enquiry deleted successfully' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const convertToMember = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { status, comments } = req.body;

    const enquiry = await Enquiry.findOne({
      _id: enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (enquiry.convertedToMember) {
      return res.status(400).json({ success: false, message: 'Enquiry already converted' });
    }

    // Check for duplicate phone number before creating member
    if (enquiry.phone) {
      const normalizedPhone = normalizePhone(enquiry.phone);
      
      if (normalizedPhone) {
        const allMembers = await Member.find({
          organizationId: req.organizationId,
          isActive: true
        }).select('phone');

        const duplicateMember = allMembers.find(m => {
          const existingNormalized = normalizePhone(m.phone);
          return existingNormalized === normalizedPhone && existingNormalized !== '';
        });

        if (duplicateMember) {
          return res.status(400).json({
            success: false,
            message: 'A member with this contact number already exists. Please use a different contact number.'
          });
        }
      }
    }

    // Create member from enquiry
    const generateMemberId = async (organizationId) => {
      const count = await Member.countDocuments({ organizationId });
      return `MEM${String(count + 1).padStart(6, '0')}`;
    };

    const memberId = await generateMemberId(req.organizationId);
    
    const member = await Member.create({
      organizationId: req.organizationId,
      branchId: enquiry.branchId,
      memberId,
      firstName: enquiry.name.split(' ')[0] || enquiry.name,
      lastName: enquiry.name.split(' ').slice(1).join(' ') || '',
      phone: enquiry.phone,
      email: enquiry.email,
      gender: enquiry.gender,
      source: enquiry.leadSource,
      membershipStatus: 'pending',
      createdBy: req.user._id
    });

    // Add call log entry for conversion
    const conversionMessage = comments 
      ? `Enquiry converted to member. Member ID: ${memberId}. ${comments}`
      : `Enquiry converted to member. Member ID: ${memberId}`;
    const callLogEntry = {
      date: new Date(),
      type: 'enquiry-call',
      status: 'contacted',
      notes: conversionMessage,
      staffId: req.user._id
    };
    enquiry.callLogs.push(callLogEntry);

    // Update enquiry - always set stage to 'converted' when converting to member
    enquiry.convertedToMember = member._id;
    enquiry.convertedAt = new Date();
    enquiry.enquiryStage = 'converted';
    enquiry.isMember = true;
    enquiry.isLead = false;
    await enquiry.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'enquiry.converted',
      entityType: 'Enquiry',
      entityId: enquiry._id
    });

    res.json({ success: true, enquiry, member });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const archiveEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      _id: req.params.enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    enquiry.isArchived = true;
    enquiry.archivedAt = new Date();
    enquiry.enquiryStage = 'archived';
    await enquiry.save();

    res.json({ success: true, enquiry });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const getEnquiryStats = async (req, res) => {
  try {
    const { dateFilter, startDate, endDate, fromDate, toDate } = req.query;
    
    const dateQuery = {};
    // Support both startDate/endDate and fromDate/toDate
    const from = fromDate || startDate;
    const to = toDate || endDate;
    
    if (from && to) {
      // Custom date range
      const fromDateObj = new Date(from);
      fromDateObj.setHours(0, 0, 0, 0);
      const toDateObj = new Date(to);
      toDateObj.setHours(23, 59, 59, 999);
      dateQuery.date = { $gte: fromDateObj, $lte: toDateObj };
    } else if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateQuery.date = { $gte: today, $lt: tomorrow };
    } else if (dateFilter === 'last7days') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      dateQuery.date = { $gte: date };
    } else if (dateFilter === 'last30days') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      dateQuery.date = { $gte: date };
    } else if (startDate || endDate) {
      dateQuery.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateQuery.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.date.$lte = end;
      }
    }

    const query = { organizationId: req.organizationId, ...dateQuery };

    const total = await Enquiry.countDocuments(query);
    const opened = await Enquiry.countDocuments({ ...query, enquiryStage: 'opened' });
    const converted = await Enquiry.countDocuments({ ...query, enquiryStage: 'converted' });
    const archived = await Enquiry.countDocuments({ ...query, isArchived: true });

    res.json({
      success: true,
      stats: {
        total,
        opened,
        converted,
        archived,
        lost: archived
      }
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const importEnquiries = async (req, res) => {
  try {
    // Validate that a file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload a CSV file' 
      });
    }

    const fs = await import('fs');
    const csv = await import('csv-parser');
    const { default: csvParser } = csv;
    
    const results = [];
    const errors = [];
    let lineNumber = 1;

    // Read and parse CSV file
    const stream = fs.default.createReadStream(req.file.path)
      .pipe(csvParser());

    for await (const row of stream) {
      lineNumber++;
      
      try {
        // Validate required fields
        if (!row.name || !row.phone) {
          errors.push({ line: lineNumber, error: 'Missing required fields: name and phone' });
          continue;
        }

        // Generate enquiry ID using the improved function
        const enquiryId = await generateEnquiryId(req.organizationId);

        // Create enquiry object
        const enquiryData = {
          organizationId: req.organizationId,
          branchId: req.branchId || row.branchId,
          enquiryId,
          name: row.name,
          phone: row.phone,
          email: row.email || undefined,
          leadSource: row.leadSource || 'other',
          enquiryStage: row.enquiryStage || 'opened',
          gender: row.gender || undefined,
          fitnessGoal: row.fitnessGoal || undefined,
          callTag: row.callTag || undefined,
          notes: row.notes || undefined,
          createdBy: req.user._id
        };

        // Create enquiry with retry logic for duplicate key errors
        let enquiry;
        let retries = 0;
        const maxRetries = 5;
        
        while (retries < maxRetries) {
          try {
            enquiry = await Enquiry.create(enquiryData);
            break; // Success, exit retry loop
          } catch (error) {
            // Check if it's a duplicate key error
            if (error.code === 11000 && error.keyPattern && error.keyPattern.enquiryId) {
              retries++;
              if (retries >= maxRetries) {
                throw new Error('Failed to generate unique enquiry ID after multiple attempts.');
              }
              // Generate a new ID and retry
              enquiryData.enquiryId = await generateEnquiryId(req.organizationId);
              await new Promise(resolve => setTimeout(resolve, 50 * retries));
              continue;
            }
            // If it's not a duplicate key error, throw it immediately
            throw error;
          }
        }
        
        results.push(enquiry);
      } catch (error) {
        errors.push({ 
          line: lineNumber, 
          error: error.message,
          row: row.name || row.phone 
        });
      }
    }

    // Clean up uploaded file
    fs.default.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      message: `Imported ${results.length} enquiries`,
      imported: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const exportEnquiries = async (req, res) => {
  try {
    const {
      dateFilter,
      startDate,
      endDate,
      enquiryStage,
      leadSource,
      service,
      staffId,
      gender,
      callTag,
      lastCallStatus,
      isArchived
    } = req.query;

    const query = { organizationId: req.organizationId };

    // Date filter (same logic as getEnquiries)
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = { $gte: today, $lt: tomorrow };
    } else if (dateFilter === 'last7days') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      query.date = { $gte: date };
    } else if (dateFilter === 'last30days') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      query.date = { $gte: date };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Other filters
    if (enquiryStage) query.enquiryStage = enquiryStage;
    if (leadSource) query.leadSource = leadSource;
    if (service) query.service = service;
    if (staffId) query.assignedStaff = staffId;
    if (gender) query.gender = gender;
    if (callTag) query.callTag = callTag;
    if (lastCallStatus) query.lastCallStatus = lastCallStatus;
    if (isArchived !== undefined) query.isArchived = isArchived === 'true';

    const enquiries = await Enquiry.find(query)
      .populate('service', 'name')
      .populate('assignedStaff', 'firstName lastName')
      .sort({ date: -1 });

    // Convert to CSV format
    const headers = ['S.No', 'Enquiry ID', 'Date', 'Name', 'Phone', 'Email', 'Service', 'Lead Source', 'Enquiry Stage', 'Last Call Status', 'Call Tag', 'Staff', 'Gender', 'Notes'];
    
    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csvContent = headers.join(',') + '\n';
    
    enquiries.forEach((enquiry, index) => {
      const row = [
        index + 1,
        enquiry.enquiryId,
        enquiry.date.toLocaleDateString(),
        enquiry.name,
        enquiry.phone,
        enquiry.email || '',
        enquiry.serviceName || '',
        enquiry.leadSource,
        enquiry.enquiryStage,
        enquiry.lastCallStatus || '',
        enquiry.callTag || '',
        enquiry.assignedStaff ? `${enquiry.assignedStaff.firstName} ${enquiry.assignedStaff.lastName}` : '',
        enquiry.gender || '',
        enquiry.notes || ''
      ];
      csvContent += row.map(escapeCsvField).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=enquiries-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const bulkArchive = async (req, res) => {
  try {
    const { enquiryIds } = req.body;

    await Enquiry.updateMany(
      {
        _id: { $in: enquiryIds },
        organizationId: req.organizationId
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          enquiryStage: 'archived'
        }
      }
    );

    res.json({ success: true, message: 'Enquiries archived successfully' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

export const bulkChangeStaff = async (req, res) => {
  try {
    const { enquiryIds, staffId } = req.body;

    await Enquiry.updateMany(
      {
        _id: { $in: enquiryIds },
        organizationId: req.organizationId
      },
      {
        $set: { assignedStaff: staffId }
      }
    );

    res.json({ success: true, message: 'Staff changed successfully' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Add call log to enquiry
export const addCallLog = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { type, calledBy, callStatus, notes, scheduleAt } = req.body;

    const enquiry = await Enquiry.findOne({
      _id: enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    const normalizedStatus = callStatus || 'scheduled';
    const parsedScheduleAt = scheduleAt ? new Date(scheduleAt) : null;

    if (normalizedStatus === 'scheduled' && (!parsedScheduleAt || Number.isNaN(parsedScheduleAt.getTime()))) {
      return res.status(400).json({ success: false, message: 'Scheduled date is required when status is scheduled' });
    }

    const callLogEntry = {
      date: parsedScheduleAt && !Number.isNaN(parsedScheduleAt.getTime()) ? parsedScheduleAt : new Date(),
      type: type || 'enquiry-call',
      status: normalizedStatus,
      notes,
      staffId: calledBy || req.user._id,
      calledBy: calledBy || undefined
    };

    enquiry.callLogs.push(callLogEntry);

    const mappedLastStatus = mapCallStatusToLastCallStatus(normalizedStatus);
    if (mappedLastStatus) {
      enquiry.lastCallStatus = mappedLastStatus;
    }

    if (normalizedStatus === 'scheduled' && parsedScheduleAt && !Number.isNaN(parsedScheduleAt.getTime())) {
      enquiry.followUpDate = parsedScheduleAt;
    }

    await enquiry.save();

    const populatedCallLogs = await enquiry.populate({
      path: 'callLogs.staffId',
      select: 'firstName lastName'
    });

    res.json({
      success: true,
      callLog: populatedCallLogs.callLogs[populatedCallLogs.callLogs.length - 1]
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Update a specific call log entry in enquiry
export const updateCallLog = async (req, res) => {
  try {
    const { enquiryId, callLogId } = req.params;
    const { callStatus, notes, scheduleAt, calledBy } = req.body;

    const enquiry = await Enquiry.findOne({
      _id: enquiryId,
      organizationId: req.organizationId
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    const callLog = enquiry.callLogs.id(callLogId);
    if (!callLog) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }

    if (callStatus) {
      callLog.status = callStatus;
    }
    if (notes !== undefined) {
      callLog.notes = notes;
    }
    if (calledBy) {
      callLog.staffId = calledBy;
    }

    if (scheduleAt !== undefined) {
      if (!scheduleAt) {
        if (callStatus === 'scheduled') {
          return res.status(400).json({ success: false, message: 'Scheduled date is required when status is scheduled' });
        }
        callLog.date = new Date();
      } else {
        const parsedScheduleAt = new Date(scheduleAt);
        if (Number.isNaN(parsedScheduleAt.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid scheduled date' });
        }
        callLog.date = parsedScheduleAt;
      }
    } else if (callStatus === 'scheduled' && !callLog.date) {
      return res.status(400).json({ success: false, message: 'Scheduled date is required when status is scheduled' });
    }

    const mappedLastStatus = mapCallStatusToLastCallStatus(callLog.status);
    if (mappedLastStatus) {
      enquiry.lastCallStatus = mappedLastStatus;
    }

    if (callLog.status === 'scheduled' && callLog.date) {
      enquiry.followUpDate = callLog.date;
    }

    await enquiry.save();

    const populatedEnquiry = await Enquiry.findOne({
      _id: enquiryId,
      organizationId: req.organizationId
    }).populate('callLogs.staffId', 'firstName lastName');

    const updatedLog = populatedEnquiry?.callLogs?.find((log) => String(log._id) === String(callLogId));

    res.json({ success: true, callLog: updatedLog });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Get appointments for enquiry
export const getEnquiryAppointments = async (req, res) => {
  try {
    const { enquiryId } = req.params;

    const appointments = await Appointment.find({
      enquiryId,
      organizationId: req.organizationId
    })
      .populate('staffId', 'firstName lastName')
      .sort({ appointmentDate: -1 });

    res.json({ success: true, appointments });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Create appointment for enquiry
export const createEnquiryAppointment = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const appointmentData = {
      ...req.body,
      organizationId: req.organizationId,
      branchId: req.body.branchId || req.user.branchId,
      enquiryId,
      createdBy: req.user._id
    };

    const appointment = await Appointment.create(appointmentData);

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    handleError(error, res, 500);
  }
};

