import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Enquiry from '../models/Enquiry.js';
import Member from '../models/Member.js';
import Attendance from '../models/Attendance.js';

// Helper function to get date range
const getDateRange = (filter) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (filter) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    case 'last7days':
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      return {
        start: last7Days,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    case 'last30days':
      const last30Days = new Date(today);
      last30Days.setDate(last30Days.getDate() - 30);
      return {
        start: last30Days,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    default:
      return null;
  }
};

// Get Revenue Data
export const getRevenueData = async (req, res) => {
  try {
    const { dateFilter = 'today', cityFilter, locationFilter } = req.query;
    const dateRange = getDateRange(dateFilter);
    
    // Get all organizations (for central panel, we show all)
    let organizations = await Organization.find({ isActive: true })
      .select('name address');

    if (cityFilter && cityFilter !== 'all') {
      organizations = organizations.filter(org => 
        org.address?.city?.toLowerCase() === cityFilter.toLowerCase()
      );
    }

    const revenueData = [];

    for (const org of organizations) {
      const branches = await Branch.find({ 
        organizationId: org._id,
        isActive: true 
      }).select('name address city');

      let orgBranches = branches;
      if (locationFilter && locationFilter !== 'all') {
        orgBranches = branches.filter(b => 
          b.name.toLowerCase() === locationFilter.toLowerCase() ||
          b._id.toString() === locationFilter
        );
      }

      for (const branch of orgBranches) {
        // Get invoices for this branch
        const invoiceQuery = {
          organizationId: org._id,
          branchId: branch._id,
          status: { $in: ['paid', 'pending', 'partial'] }
        };

        if (dateRange) {
          invoiceQuery.createdAt = {
            $gte: dateRange.start,
            $lte: dateRange.end
          };
        }

        const invoices = await Invoice.find(invoiceQuery);
        
        // Calculate sales (total invoice amount)
        const sales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        
        // Get payments
        const payments = await Payment.find({
          organizationId: org._id,
          branchId: branch._id,
          status: 'completed'
        });
        
        const collected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const pending = sales - collected;

        revenueData.push({
          businessName: org.name,
          city: branch.address?.city || org.address?.city || 'N/A',
          branch: branch.name,
          sales: sales,
          collected: collected,
          pending: pending
        });
      }
    }

    // Calculate totals
    const totals = revenueData.reduce((acc, item) => ({
      sales: acc.sales + item.sales,
      collected: acc.collected + item.collected,
      pending: acc.pending + item.pending
    }), { sales: 0, collected: 0, pending: 0 });

    res.json({
      success: true,
      data: revenueData,
      totals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Lead Management Data
export const getLeadManagementData = async (req, res) => {
  try {
    const { dateFilter = 'today', cityFilter, locationFilter } = req.query;
    const dateRange = getDateRange(dateFilter);

    let organizations = await Organization.find({ isActive: true })
      .select('name address');

    if (cityFilter && cityFilter !== 'all') {
      organizations = organizations.filter(org => 
        org.address?.city?.toLowerCase() === cityFilter.toLowerCase()
      );
    }

    const leadData = [];

    for (const org of organizations) {
      const branches = await Branch.find({ 
        organizationId: org._id,
        isActive: true 
      }).select('name address city');

      let orgBranches = branches;
      if (locationFilter && locationFilter !== 'all') {
        orgBranches = branches.filter(b => 
          b.name.toLowerCase() === locationFilter.toLowerCase() ||
          b._id.toString() === locationFilter
        );
      }

      for (const branch of orgBranches) {
        const enquiryQuery = {
          organizationId: org._id,
          branchId: branch._id
        };

        if (dateRange) {
          enquiryQuery.enquiryDate = {
            $gte: dateRange.start,
            $lte: dateRange.end
          };
        }

        const enquiries = await Enquiry.find(enquiryQuery);
        
        const enquiriesReceived = enquiries.length;
        const open = enquiries.filter(e => e.enquiryStage === 'opened').length;
        const converted = enquiries.filter(e => e.enquiryStage === 'converted').length;
        const lost = enquiries.filter(e => e.enquiryStage === 'lost' || e.enquiryStage === 'archived' || e.isArchived).length;

        leadData.push({
          businessName: org.name,
          city: branch.address?.city || org.address?.city || 'N/A',
          branch: branch.name,
          enquiriesReceived,
          open,
          converted,
          lost
        });
      }
    }

    const totals = leadData.reduce((acc, item) => ({
      enquiriesReceived: acc.enquiriesReceived + item.enquiriesReceived,
      open: acc.open + item.open,
      converted: acc.converted + item.converted,
      lost: acc.lost + item.lost
    }), {
      enquiriesReceived: 0,
      open: 0,
      converted: 0,
      lost: 0
    });

    res.json({
      success: true,
      data: leadData,
      totals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Clients Data
export const getClientsData = async (req, res) => {
  try {
    const { dateFilter = 'today', cityFilter, locationFilter } = req.query;
    const dateRange = getDateRange(dateFilter);

    let organizations = await Organization.find({ isActive: true })
      .select('name address');

    if (cityFilter && cityFilter !== 'all') {
      organizations = organizations.filter(org => 
        org.address?.city?.toLowerCase() === cityFilter.toLowerCase()
      );
    }

    const clientsData = [];

    for (const org of organizations) {
      const branches = await Branch.find({ 
        organizationId: org._id,
        isActive: true 
      }).select('name address city');

      let orgBranches = branches;
      if (locationFilter && locationFilter !== 'all') {
        orgBranches = branches.filter(b => 
          b.name.toLowerCase() === locationFilter.toLowerCase() ||
          b._id.toString() === locationFilter
        );
      }

      for (const branch of orgBranches) {
        const memberQuery = {
          organizationId: org._id,
          branchId: branch._id
        };

        if (dateRange) {
          memberQuery.createdAt = {
            $gte: dateRange.start,
            $lte: dateRange.end
          };
        }

        // Get new clients (created in date range)
        const newClients = await Member.find(memberQuery);
        
        // Get renewals (members with active subscriptions that were renewed)
        const allMembers = await Member.find({
          organizationId: org._id,
          branchId: branch._id
        }).populate('subscriptions');

        // Calculate new client value
        const newClientValue = newClients.reduce((sum, member) => {
          const subscriptions = member.subscriptions || [];
          return sum + subscriptions.reduce((s, sub) => s + (sub.totalAmount || 0), 0);
        }, 0);

        // Get renewals (simplified - members with active subscriptions)
        const renewals = allMembers.filter(m => {
          const activeSubs = (m.subscriptions || []).filter(s => 
            s.status === 'active' && s.startDate && dateRange &&
            s.startDate >= dateRange.start && s.startDate <= dateRange.end &&
            s.startDate.getTime() !== m.createdAt.getTime()
          );
          return activeSubs.length > 0;
        });

        const renewalValue = renewals.reduce((sum, member) => {
          const subscriptions = member.subscriptions || [];
          return sum + subscriptions.reduce((s, sub) => s + (sub.totalAmount || 0), 0);
        }, 0);

        clientsData.push({
          businessName: org.name,
          city: branch.address?.city || org.address?.city || 'N/A',
          branch: branch.name,
          newClients: newClients.length,
          newClientsValue: newClientValue,
          renewals: renewals.length,
          renewalsValue: renewalValue
        });
      }
    }

    const totals = clientsData.reduce((acc, item) => ({
      newClients: acc.newClients + item.newClients,
      newClientsValue: acc.newClientsValue + item.newClientsValue,
      renewals: acc.renewals + item.renewals,
      renewalsValue: acc.renewalsValue + item.renewalsValue
    }), {
      newClients: 0,
      newClientsValue: 0,
      renewals: 0,
      renewalsValue: 0
    });

    res.json({
      success: true,
      data: clientsData,
      totals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Check-Ins Data
export const getCheckInsData = async (req, res) => {
  try {
    const { dateFilter = 'today', cityFilter, locationFilter } = req.query;
    const dateRange = getDateRange(dateFilter);

    let organizations = await Organization.find({ isActive: true })
      .select('name address');

    if (cityFilter && cityFilter !== 'all') {
      organizations = organizations.filter(org => 
        org.address?.city?.toLowerCase() === cityFilter.toLowerCase()
      );
    }

    const checkInsData = [];

    for (const org of organizations) {
      const branches = await Branch.find({ 
        organizationId: org._id,
        isActive: true 
      }).select('name address city');

      let orgBranches = branches;
      if (locationFilter && locationFilter !== 'all') {
        orgBranches = branches.filter(b => 
          b.name.toLowerCase() === locationFilter.toLowerCase() ||
          b._id.toString() === locationFilter
        );
      }

      for (const branch of orgBranches) {
        const attendanceQuery = {
          organizationId: org._id,
          branchId: branch._id,
          status: 'success' // Only count successful check-ins
        };

        if (dateRange) {
          attendanceQuery.checkInTime = {
            $gte: dateRange.start,
            $lte: dateRange.end
          };
        }

        const checkIns = await Attendance.find(attendanceQuery);

        checkInsData.push({
          businessName: org.name,
          city: branch.address?.city || org.address?.city || 'N/A',
          branch: branch.name,
          checkIns: checkIns.length
        });
      }
    }

    const totals = checkInsData.reduce((acc, item) => ({
      checkIns: acc.checkIns + item.checkIns
    }), { checkIns: 0 });

    res.json({
      success: true,
      data: checkInsData,
      totals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Cities and Locations for filters
export const getFilterOptions = async (req, res) => {
  try {
    const organizations = await Organization.find({ isActive: true })
      .select('address')
      .populate('address');

    const cities = [...new Set(
      organizations
        .map(org => org.address?.city)
        .filter(city => city)
    )];

    const branches = await Branch.find({ isActive: true })
      .select('name organizationId address city')
      .populate('organizationId', 'name');

    const locations = branches.map(branch => ({
      id: branch._id,
      name: branch.name,
      city: branch.address?.city || 'N/A',
      organizationId: branch.organizationId?._id
    }));

    res.json({
      success: true,
      cities,
      locations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
