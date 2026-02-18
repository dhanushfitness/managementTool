import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Member from '../models/Member.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import FollowUp from '../models/FollowUp.js';

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
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      // Always set endDate to end of day to include the full end date
      // This ensures we get all invoices created on the end date
      end.setHours(23, 59, 59, 999);
      dateQuery.createdAt = {
        $gte: start,
        $lte: end
      };
      console.log('Service Sales Report - Date Query:', {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        startDateParam: startDate,
        endDateParam: endDate
      });
    } else {
      // Handle date range presets
      // If "all-time" is selected, don't add date filter
      if (dateRange === 'all-time') {
        // No date query - show all invoices
        dateQuery = {};
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
    }

    // Build base query
    // Dashboard shows all invoices regardless of status (no status filter in dashboard query)
    // To match dashboard behavior, we should include all statuses except cancelled/refunded
    // But actually, let's match exactly what dashboard does - no status filter at all
    const baseQuery = {
      organizationId: req.organizationId,
      ...dateQuery
      // No status filter to match dashboard behavior - dashboard includes all invoices
    };
    
    console.log('Service Sales Report - Base Query:', JSON.stringify(baseQuery, null, 2));

    // Filter by sale type (New Bookings vs Rebookings)
    if (saleType === 'new-bookings') {
      baseQuery.type = { $in: ['membership', 'other'] };
    } else if (saleType === 'rebookings') {
      baseQuery.type = { $in: ['renewal', 'upgrade', 'downgrade'] };
    }

    // Get ALL invoices for totals calculation (before pagination)
    const allInvoicesForTotals = await Invoice.find(baseQuery)
      .populate('memberId', 'firstName lastName gender')
      .populate('planId', 'name')
      .populate('items.serviceId', 'name')
      .sort({ createdAt: -1 });

    console.log('Service Sales Report - Total invoices found:', allInvoicesForTotals.length);

    // Get paginated invoices for display
    const invoices = await Invoice.find(baseQuery)
      .populate('memberId', 'firstName lastName gender')
      .populate('planId', 'name')
      .populate('items.serviceId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log('Service Sales Report - Paginated invoices:', invoices.length);

    // Calculate totals from ALL invoices (not just paginated ones)
    let allTotals = { quantity: 0, listPrice: 0, discountValue: 0, totalAmount: 0 };
    for (const invoice of allInvoicesForTotals) {
      // Process each item in the invoice
      for (const item of invoice.items || []) {
        // Apply filters for totals calculation
        if (serviceName) {
          const serviceId = item.serviceId?._id?.toString() || invoice.planId?._id?.toString();
          if (serviceId !== serviceName) continue;
        }

        if (serviceVariation && item.description) {
          if (!item.description.toLowerCase().includes(serviceVariation.toLowerCase())) continue;
        }

        if (gender && invoice.memberId?.gender) {
          if (invoice.memberId.gender !== gender) continue;
        }

        // Apply sale type filter
        if (saleType === 'new-bookings' && !['membership', 'other'].includes(invoice.type)) continue;
        if (saleType === 'rebookings' && !['renewal', 'upgrade', 'downgrade'].includes(invoice.type)) continue;

        const listPrice = (item.unitPrice || 0) * (item.quantity || 1);
        const discountValue = item.discount?.amount || invoice.discount?.amount || 0;
        const totalAmount = item.total || (listPrice - discountValue);

        allTotals.quantity += (item.quantity || 1);
        allTotals.listPrice += listPrice;
        allTotals.discountValue += discountValue;
        allTotals.totalAmount += totalAmount;
      }

      // Handle invoices without items
      if ((!invoice.items || invoice.items.length === 0) && invoice.planId) {
        if (serviceName && invoice.planId._id.toString() !== serviceName) continue;
        if (gender && invoice.memberId?.gender && invoice.memberId.gender !== gender) continue;
        if (saleType === 'new-bookings' && !['membership', 'other'].includes(invoice.type)) continue;
        if (saleType === 'rebookings' && !['renewal', 'upgrade', 'downgrade'].includes(invoice.type)) continue;

        const listPrice = invoice.subtotal || 0;
        const discountValue = invoice.discount?.amount || 0;
        const totalAmount = invoice.total || 0;

        allTotals.quantity += 1;
        allTotals.listPrice += listPrice;
        allTotals.discountValue += discountValue;
        allTotals.totalAmount += totalAmount;
      }
    }

    // Process invoices into booking records (for display)
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

    // Use totals calculated from ALL invoices (not just paginated ones)
    const totals = allTotals;

    // Get total count for pagination - count all bookings matching filters
    let totalBookingsCount = 0;
    for (const invoice of allInvoicesForTotals) {
      let invoiceMatches = false;
      
      for (const item of invoice.items || []) {
        if (serviceName) {
          const serviceId = item.serviceId?._id?.toString() || invoice.planId?._id?.toString();
          if (serviceId !== serviceName) continue;
        }
        if (serviceVariation && item.description) {
          if (!item.description.toLowerCase().includes(serviceVariation.toLowerCase())) continue;
        }
        if (gender && invoice.memberId?.gender) {
          if (invoice.memberId.gender !== gender) continue;
        }
        if (saleType === 'new-bookings' && !['membership', 'other'].includes(invoice.type)) continue;
        if (saleType === 'rebookings' && !['renewal', 'upgrade', 'downgrade'].includes(invoice.type)) continue;
        invoiceMatches = true;
        totalBookingsCount++;
      }

      if ((!invoice.items || invoice.items.length === 0) && invoice.planId) {
        if (serviceName && invoice.planId._id.toString() !== serviceName) continue;
        if (gender && invoice.memberId?.gender && invoice.memberId.gender !== gender) continue;
        if (saleType === 'new-bookings' && !['membership', 'other'].includes(invoice.type)) continue;
        if (saleType === 'rebookings' && !['renewal', 'upgrade', 'downgrade'].includes(invoice.type)) continue;
        totalBookingsCount++;
      }
    }
    
    const totalBookings = totalBookingsCount;

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
    const headers = ['S.No', 'Tax Invoice No.', 'Sale Type', 'Service Name', 'Service Variations', 'Quantity', 'List Price', 'Discount Value', 'Total Amount'];
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
      .populate('currentPlan.planId', 'serviceName name') // Populate plan to get serviceName
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

    const records = paginatedRecords.map(member => {
      // Get service name from plan's serviceName, fallback to planName, then to '-'
      const plan = member.currentPlan?.planId;
      const serviceName = plan?.serviceName || member.currentPlan?.planName || '-';
      
      return {
        _id: member._id,
        memberId: member.memberId || '-',
        memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        mobile: member.phone || '-',
        email: member.email || '-',
        serviceName: serviceName, // Use service name from plan
        joinDate: member.currentPlan?.startDate || member.createdAt,
        startDate: formatDate(member.currentPlan?.startDate || member.createdAt),
        endDate: formatDate(member.currentPlan?.endDate),
        leadSource: member.leadSource || member.source || '-',
        salesRepName: member.salesRep
          ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
          : '-'
      };
    });

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
      
      // Validate the date
      if (isNaN(dob.getTime())) {
        continue;
      }

      // Get month and day from the date of birth (ignore the year)
      const birthMonth = dob.getMonth();
      const birthDay = dob.getDate();

      // Apply month filter first if provided
      if (birthdayMonth && birthdayMonth !== 'all') {
        if (birthMonth + 1 !== parseInt(birthdayMonth)) {
          continue;
        }
      }

      // Check if birthday (month/day) falls in the date range
      // We only consider the month and day, not the year of birth
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      let birthdayInRange = false;
      
      // Check the birthday in each year that falls within the date range
      for (let year = startYear; year <= endYear; year++) {
        const birthdayThisYear = new Date(year, birthMonth, birthDay);
        // Set time to start of day for accurate comparison
        birthdayThisYear.setHours(0, 0, 0, 0);
        
        // Check if this year's birthday falls within the date range
        if (birthdayThisYear >= start && birthdayThisYear <= end) {
          birthdayInRange = true;
          break;
        }
      }

      if (!birthdayInRange) continue;

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
      
      // Validate the date
      if (isNaN(dob.getTime())) {
        continue;
      }

      // Get month and day from the date of birth (ignore the year)
      const birthMonth = dob.getMonth();
      const birthDay = dob.getDate();

      // Apply month filter first if provided
      if (birthdayMonth && birthdayMonth !== 'all') {
        if (birthMonth + 1 !== parseInt(birthdayMonth)) {
          continue;
        }
      }

      // Check if birthday (month/day) falls in the date range
      // We only consider the month and day, not the year of birth
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      let birthdayInRange = false;
      
      // Check the birthday in each year that falls within the date range
      for (let year = startYear; year <= endYear; year++) {
        const birthdayThisYear = new Date(year, birthMonth, birthDay);
        // Set time to start of day for accurate comparison
        birthdayThisYear.setHours(0, 0, 0, 0);
        
        // Check if this year's birthday falls within the date range
        if (birthdayThisYear >= start && birthdayThisYear <= end) {
          birthdayInRange = true;
          break;
        }
      }

      if (!birthdayInRange) continue;

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

// Staff Birthday Report
export const getStaffBirthdayReport = async (req, res) => {
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

    // Get all staff users
    const users = await User.find({
      organizationId: req.organizationId,
      dateOfBirth: { $exists: true, $ne: null }
    })
      .populate('branchId', 'name')
      .lean();

    const records = [];

    for (const user of users) {
      if (!user.dateOfBirth) continue;

      const dob = new Date(user.dateOfBirth);
      
      // Validate the date
      if (isNaN(dob.getTime())) {
        continue;
      }

      // Get month and day from the date of birth (ignore the year)
      const birthMonth = dob.getMonth();
      const birthDay = dob.getDate();

      // Apply month filter first if provided
      if (birthdayMonth && birthdayMonth !== 'all') {
        if (birthMonth + 1 !== parseInt(birthdayMonth)) {
          continue;
        }
      }

      // Check if birthday (month/day) falls in the date range
      // We only consider the month and day, not the year of birth
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      let birthdayInRange = false;
      
      // Check the birthday in each year that falls within the date range
      for (let year = startYear; year <= endYear; year++) {
        const birthdayThisYear = new Date(year, birthMonth, birthDay);
        // Set time to start of day for accurate comparison
        birthdayThisYear.setHours(0, 0, 0, 0);
        
        // Check if this year's birthday falls within the date range
        if (birthdayThisYear >= start && birthdayThisYear <= end) {
          birthdayInRange = true;
          break;
        }
      }

      if (!birthdayInRange) continue;

      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      records.push({
        _id: user._id.toString(),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        mobile: user.phone || '-',
        email: user.email || '-',
        birthday: formatDate(user.dateOfBirth),
        designation: user.jobDesignation || '-',
        branch: user.branchId?.name || '-'
      });
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

// Export Staff Birthday Report
export const exportStaffBirthdayReport = async (req, res) => {
  try {
    const { fromDate, toDate, birthdayMonth } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const users = await User.find({
      organizationId: req.organizationId,
      dateOfBirth: { $exists: true, $ne: null }
    })
      .populate('branchId', 'name')
      .lean();

    const records = [];

    for (const user of users) {
      if (!user.dateOfBirth) continue;

      const dob = new Date(user.dateOfBirth);
      
      // Validate the date
      if (isNaN(dob.getTime())) {
        continue;
      }

      // Get month and day from the date of birth (ignore the year)
      const birthMonth = dob.getMonth();
      const birthDay = dob.getDate();

      // Apply month filter first if provided
      if (birthdayMonth && birthdayMonth !== 'all') {
        if (birthMonth + 1 !== parseInt(birthdayMonth)) {
          continue;
        }
      }

      // Check if birthday (month/day) falls in the date range
      // We only consider the month and day, not the year of birth
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      let birthdayInRange = false;
      
      // Check the birthday in each year that falls within the date range
      for (let year = startYear; year <= endYear; year++) {
        const birthdayThisYear = new Date(year, birthMonth, birthDay);
        // Set time to start of day for accurate comparison
        birthdayThisYear.setHours(0, 0, 0, 0);
        
        // Check if this year's birthday falls within the date range
        if (birthdayThisYear >= start && birthdayThisYear <= end) {
          birthdayInRange = true;
          break;
        }
      }

      if (!birthdayInRange) continue;

      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      records.push({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        mobile: user.phone || '-',
        email: user.email || '-',
        birthday: formatDate(user.dateOfBirth),
        designation: user.jobDesignation || '-',
        branch: user.branchId?.name || '-'
      });
    }

    records.sort((a, b) => {
      const dateA = new Date(a.birthday.split('-').reverse().join('-'));
      const dateB = new Date(b.birthday.split('-').reverse().join('-'));
      return dateA - dateB;
    });

    const headers = ['S.No', 'Name', 'Mobile No', 'Mail', 'Designation', 'Branch', 'Birthday'];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record, index) => {
      const row = [
        index + 1,
        `"${record.name}"`,
        record.mobile,
        record.email,
        `"${record.designation}"`,
        `"${record.branch}"`,
        record.birthday
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=staff-birthday-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Client Attendance Report (similar to Member Attendance Register but for clients)

export const getServiceExpiryReport = async (req, res) => {
  try {
    const { 
      fromDate, 
      toDate, 
      search, 
      memberType = 'all',
      staffId,
      serviceId,
      membershipDuration,
      page = 1, 
      limit = 50 
    } = req.query;

    // Date range is required
    if (!fromDate || !toDate) {
      return res.json({
        success: true,
        data: {
          records: [],
          paidAmount: 0,
          pagination: {
            page: 1,
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });
    }

    // Parse dates correctly - handle YYYY-MM-DD format
    // Normalize dates to start of day to avoid timezone issues
    // Convert YYYY-MM-DD to Date objects and set to start of day
    const startDate = new Date(fromDate);
    startDate.setUTCHours(0, 0, 0, 0);
    
    // For end date, set to start of next day (exclusive) so we include the entire end date
    const endDate = new Date(toDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1); // Add 1 day
    endDate.setUTCHours(0, 0, 0, 0); // Set to start of next day

    // Helper function to normalize a date to start of day for comparison
    const normalizeToDateOnly = (date) => {
      const d = new Date(date);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };

    const getMembershipDurationBucket = (itemStartDate, itemExpiryDate) => {
      if (!itemStartDate || !itemExpiryDate) return 'others';
      const start = normalizeToDateOnly(itemStartDate);
      const end = normalizeToDateOnly(itemExpiryDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 27 && diffDays <= 35) return '1-month';
      if (diffDays >= 56 && diffDays <= 66) return '2-month';
      if (diffDays >= 170 && diffDays <= 190) return '6-month';
      return 'others';
    };

    // Debug logging
    console.log('Service Expiry Query:', {
      organizationId: req.organizationId,
      fromDate,
      toDate,
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    // Step 1: Get all members first (with filters)
    const memberQuery = {
      organizationId: req.organizationId
    };

    // Filter by member type
    if (memberType === 'active') {
      memberQuery.membershipStatus = 'active';
      memberQuery.isActive = true;
    } else if (memberType === 'inactive') {
      memberQuery.$or = [
        { membershipStatus: { $ne: 'active' } },
        { isActive: false }
      ];
    }

    // Filter by staff
    if (staffId && staffId !== 'all') {
      memberQuery.salesRep = staffId;
    }

    const allMembers = await Member.find(memberQuery)
      .populate('salesRep', 'firstName lastName')
      .populate('generalTrainer', 'firstName lastName')
      .lean();

    console.log('Service Expiry - Found members:', allMembers.length);

    // Step 2: For each member, get their current active invoice
    // An active invoice is the latest invoice with status in ['paid', 'partial', 'sent', 'draft']
    const memberIds = allMembers.map(m => m._id);
    
    // Get the latest active invoice for each member
    const currentActiveInvoices = await Invoice.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          memberId: { $in: memberIds },
          status: { $in: ['paid', 'partial', 'sent', 'draft'] } // Active invoice statuses
        }
      },
      {
        $sort: { createdAt: -1 } // Get latest invoice first
      },
      {
        $group: {
          _id: '$memberId',
          latestInvoice: { $first: '$$ROOT' } // Get the most recent invoice for each member
        }
      }
    ]);

    console.log('Service Expiry - Found active invoices:', currentActiveInvoices.length);

    // Step 3: Filter invoices that have items with expiry dates in the date range
    const invoicesWithExpiringItems = [];
    const invoiceMap = {};

    for (const { _id: memberId, latestInvoice } of currentActiveInvoices) {
      // Check if any item in this invoice has expiry date in the range
      const hasExpiringItem = latestInvoice.items?.some(item => {
        if (!item.expiryDate) return false;
        const itemExpiryDate = normalizeToDateOnly(item.expiryDate);
        // Use >= and < (not <=) since endDate is start of next day (exclusive)
        return itemExpiryDate >= startDate && itemExpiryDate < endDate;
      });

      if (hasExpiringItem) {
        invoicesWithExpiringItems.push(latestInvoice);
        invoiceMap[memberId.toString()] = latestInvoice;
      }
    }

    console.log('Service Expiry - Found invoices with expiring items:', invoicesWithExpiringItems.length);

    // Get all service IDs to populate service names
    const serviceIds = [...new Set(
      invoicesWithExpiringItems
        .flatMap(inv => inv.items || [])
        .map(item => item.serviceId)
        .filter(Boolean)
    )];
    
    const plans = await Plan.find({ _id: { $in: serviceIds } }).lean();
    const planMap = {};
    plans.forEach(plan => {
      planMap[plan._id.toString()] = plan;
    });

    // Build member map
    const memberMap = {};
    allMembers.forEach(m => {
      memberMap[m._id.toString()] = m;
    });

    // Step 4: Build records from current active invoice items
    const membersWithExpiringPlans = [];
    for (const invoice of invoicesWithExpiringItems) {
      const memberId = invoice.memberId?.toString() || invoice.memberId;
      const member = memberMap[memberId];
      if (!member) continue;

      // Filter by staff if specified (double check)
      if (staffId && staffId !== 'all') {
        const memberStaffId = member.salesRep?._id?.toString() || member.salesRep?.toString();
        if (memberStaffId !== staffId) continue;
      }

      // Process each item in the invoice
      for (const item of invoice.items || []) {
        if (!item.expiryDate) continue;
        
        const itemExpiryDate = normalizeToDateOnly(item.expiryDate);
        // Use >= and < (not <=) since endDate is start of next day (exclusive)
        if (itemExpiryDate < startDate || itemExpiryDate >= endDate) continue;

        // Filter by service if specified
        if (serviceId && serviceId !== 'all') {
          const itemServiceId = item.serviceId?.toString() || item.serviceId;
          if (itemServiceId !== serviceId) continue;
        }

        // Filter by membership duration bucket if specified
        if (membershipDuration && membershipDuration !== 'all') {
          const durationBucket = getMembershipDurationBucket(item.startDate, item.expiryDate);
          if (durationBucket !== membershipDuration) continue;
        }

        membersWithExpiringPlans.push({
          member,
          invoice,
          item,
          expiryDate: new Date(item.expiryDate)
        });
      }
    }

    // Debug logging
    console.log('Service Expiry - Found invoice items:', membersWithExpiringPlans.length);
    if (membersWithExpiringPlans.length > 0) {
      console.log('Sample item:', {
        memberId: membersWithExpiringPlans[0].member?.memberId,
        name: `${membersWithExpiringPlans[0].member?.firstName} ${membersWithExpiringPlans[0].member?.lastName}`,
        expiryDate: membersWithExpiringPlans[0].expiryDate,
        serviceName: membersWithExpiringPlans[0].item?.description
      });
    }

    // Get member IDs for additional data (use the unique member IDs from the processed items)
    const uniqueMemberIds = [...new Set(membersWithExpiringPlans.map(m => m.member?._id).filter(Boolean))];

    // Get last check-in dates
    const lastCheckIns = await Attendance.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          memberId: { $in: uniqueMemberIds }
        }
      },
      {
        $sort: { checkInTime: -1 }
      },
      {
        $group: {
          _id: '$memberId',
          lastCheckIn: { $first: '$checkInTime' }
        }
      }
    ]);
    const checkInMap = {};
    lastCheckIns.forEach(ci => {
      checkInMap[ci._id.toString()] = ci.lastCheckIn;
    });

    // Get last follow-up/contact dates
    const lastFollowUps = await FollowUp.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          'relatedTo.entityType': 'member',
          'relatedTo.entityId': { $in: uniqueMemberIds }
        }
      },
      {
        $sort: { contactedAt: -1, attemptedAt: -1, createdAt: -1 }
      },
      {
        $group: {
          _id: '$relatedTo.entityId',
          lastContactedDate: { $first: '$contactedAt' },
          lastCallStatus: { $first: '$callStatus' },
          lastStatus: { $first: '$status' }
        }
      }
    ]);
    const followUpMap = {};
    lastFollowUps.forEach(fu => {
      followUpMap[fu._id.toString()] = {
        lastContactedDate: fu.lastContactedDate,
        lastCallStatus: fu.lastCallStatus,
        lastStatus: fu.lastStatus
      };
    });

    // Get last invoice dates and amounts for all members
    const lastInvoices = await Invoice.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          memberId: { $in: uniqueMemberIds },
          status: { $in: ['paid', 'partial'] }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$memberId',
          lastInvoiceDate: { $first: '$createdAt' },
          lastInvoiceTotal: { $first: '$total' },
          lastInvoicePending: { $first: '$pending' },
          lastInvoiceId: { $first: '$_id' }
        }
      },
      {
        $project: {
          _id: 1,
          lastInvoiceDate: 1,
          lastInvoiceAmount: { $subtract: ['$lastInvoiceTotal', '$lastInvoicePending'] }
        }
      }
    ]);
    const lastInvoiceMap = {};
    lastInvoices.forEach(li => {
      lastInvoiceMap[li._id.toString()] = {
        date: li.lastInvoiceDate,
        amount: li.lastInvoiceAmount || 0
      };
    });

    // Build records
    const records = [];
    let totalPaidAmount = 0;

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Process invoice items with expiring services
    for (const { member, invoice, item, expiryDate } of membersWithExpiringPlans) {
      if (!member || !item || !expiryDate) continue;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase();
        const mobile = (member.phone || '').toLowerCase();
        const email = (member.email || '').toLowerCase();
        
        if (!memberName.includes(searchLower) && 
            !mobile.includes(searchLower) && 
            !email.includes(searchLower)) {
          continue;
        }
      }

      // Get service name from item or plan
      let serviceName = item.description || 'Service';
      
      // Get service details from planMap if serviceId exists
      if (item.serviceId) {
        const plan = planMap[item.serviceId.toString()];
        if (plan) {
          serviceName = plan.name || plan.serviceName || serviceName;
        }
      }
      
      // Exclude PT services
      if (serviceName.toLowerCase().includes('pt') || 
          serviceName.toLowerCase().includes('personal training')) {
        continue;
      }

      const memberId = member.memberId || '-';
      const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
      const mobile = member.phone || '-';
      const email = member.email || '-';
      const status = member.membershipStatus === 'active' ? 'Active' : 
                    member.membershipStatus === 'expired' ? 'Expired' : 
                    member.membershipStatus === 'frozen' ? 'Frozen' : 
                    member.membershipStatus === 'cancelled' ? 'Cancelled' : 'Inactive';
      
      const salesRep = member.salesRep 
        ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
        : '-';
      
      const generalTrainer = member.generalTrainer
        ? `${member.generalTrainer.firstName || ''} ${member.generalTrainer.lastName || ''}`.trim()
        : '-';

      const serviceVariationName = serviceName;
      
      // Get amount from invoice item
      const amount = item.total || item.amount || 0;
      totalPaidAmount += amount;

      const startDate = item.startDate ? formatDate(item.startDate) : '-';
      const expiryDateStr = formatDate(expiryDate);
      const serviceDuration = item.startDate && item.expiryDate 
        ? `${formatDate(item.startDate)} To ${formatDate(item.expiryDate)}`
        : '-';

      // Get last invoice date
      const lastInvoiceData = lastInvoiceMap[member._id.toString()];
      const lastInvoiceDate = lastInvoiceData?.date 
        ? formatDate(lastInvoiceData.date) 
        : formatDate(invoice.createdAt);

      const totalSessions = item.numberOfSessions || 'Not Applicable';
      const utilized = 0; // This would need to be calculated from attendance
      const balance = totalSessions === 'Not Applicable' 
        ? '-' 
        : (totalSessions - utilized);

      const checkInData = checkInMap[member._id.toString()];
      const followUpData = followUpMap[member._id.toString()];

      records.push({
        _id: `invoice-${invoice._id}-item-${item._id || Math.random()}`,
        memberId,
        memberName,
        mobile,
        email,
        status,
        salesRep,
        generalTrainer,
        serviceName: serviceName.split(' - ')[0] || serviceName,
        serviceVariationName,
        amount: amount.toFixed(2),
        serviceDuration,
        expiryDate: expiryDateStr,
        lastInvoiceDate,
        totalSessions: totalSessions === 'Not Applicable' ? 'Not Applicable' : totalSessions,
        utilized,
        balance: balance === '-' ? '-' : balance,
        lastContactedDate: followUpData?.lastContactedDate ? formatDate(followUpData.lastContactedDate) : '-',
        lastCheckInDate: checkInData ? formatDate(checkInData) : '-',
        lastStatus: followUpData?.lastStatus || '-',
        lastCallStatus: followUpData?.lastCallStatus || '-',
        invoiceId: invoice._id,
        memberMongoId: member._id
      });
    }


    // Sort records by expiry date (handle date format DD-MM-YYYY)
    records.sort((a, b) => {
      try {
        const dateA = new Date(a.expiryDate.split('-').reverse().join('-'));
        const dateB = new Date(b.expiryDate.split('-').reverse().join('-'));
        return dateA - dateB;
      } catch (e) {
        return 0;
      }
    });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecords = records.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        records: paginatedRecords,
        paidAmount: totalPaidAmount,
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

export const exportServiceExpiryReport = async (req, res) => {
  try {
    const { 
      fromDate, 
      toDate, 
      search, 
      memberType = 'all',
      staffId,
      serviceId,
      membershipDuration
    } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const getMembershipDurationBucket = (itemStartDate, itemExpiryDate) => {
      if (!itemStartDate || !itemExpiryDate) return 'others';
      const start = new Date(itemStartDate);
      const expiry = new Date(itemExpiryDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(expiry.getTime())) return 'others';

      start.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);
      const diffDays = Math.round((expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 27 && diffDays <= 35) return '1-month';
      if (diffDays >= 56 && diffDays <= 66) return '2-month';
      if (diffDays >= 170 && diffDays <= 190) return '6-month';
      return 'others';
    };

    // Build invoice query
    const invoiceQuery = {
      organizationId: req.organizationId,
      invoiceType: 'service',
      type: { $in: ['membership', 'renewal'] },
      'items.expiryDate': {
        $gte: start,
        $lte: end
      }
    };

    if (serviceId && serviceId !== 'all') {
      invoiceQuery['items.serviceId'] = serviceId;
    }

    const invoices = await Invoice.find(invoiceQuery)
      .populate('memberId', 'memberId firstName lastName phone email membershipStatus salesRep generalTrainer')
      .populate('items.serviceId', 'name serviceId variationId')
      .populate('createdBy', 'firstName lastName')
      .populate('branchId', 'name')
      .sort({ 'items.expiryDate': 1 })
      .lean();

    const memberIds = [...new Set(invoices.map(inv => inv.memberId?._id).filter(Boolean))];

    const lastCheckIns = await Attendance.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          memberId: { $in: memberIds }
        }
      },
      {
        $sort: { checkInTime: -1 }
      },
      {
        $group: {
          _id: '$memberId',
          lastCheckIn: { $first: '$checkInTime' }
        }
      }
    ]);
    const checkInMap = {};
    lastCheckIns.forEach(ci => {
      checkInMap[ci._id.toString()] = ci.lastCheckIn;
    });

    const lastFollowUps = await FollowUp.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          'relatedTo.entityType': 'member',
          'relatedTo.entityId': { $in: memberIds }
        }
      },
      {
        $sort: { contactedAt: -1, attemptedAt: -1, createdAt: -1 }
      },
      {
        $group: {
          _id: '$relatedTo.entityId',
          lastContactedDate: { $first: '$contactedAt' },
          lastCallStatus: { $first: '$callStatus' },
          lastStatus: { $first: '$status' }
        }
      }
    ]);
    const followUpMap = {};
    lastFollowUps.forEach(fu => {
      followUpMap[fu._id.toString()] = {
        lastContactedDate: fu.lastContactedDate,
        lastCallStatus: fu.lastCallStatus,
        lastStatus: fu.lastStatus
      };
    });

    const members = await Member.find({
      _id: { $in: memberIds }
    })
      .populate('salesRep', 'firstName lastName')
      .populate('generalTrainer', 'firstName lastName')
      .lean();
    
    const memberMap = {};
    members.forEach(m => {
      memberMap[m._id.toString()] = m;
    });

    // Get last invoice dates for all members
    const lastInvoices = await Invoice.aggregate([
      {
        $match: {
          organizationId: req.organizationId,
          memberId: { $in: memberIds },
          status: { $in: ['paid', 'partial'] }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$memberId',
          lastInvoiceDate: { $first: '$createdAt' }
        }
      }
    ]);
    const lastInvoiceMap = {};
    lastInvoices.forEach(li => {
      lastInvoiceMap[li._id.toString()] = li.lastInvoiceDate;
    });

    const records = [];

    for (const invoice of invoices) {
      if (!invoice.memberId) continue;

      const member = memberMap[invoice.memberId._id.toString()] || invoice.memberId;
      
      if (staffId && staffId !== 'all') {
        const salesRepId = member.salesRep?._id?.toString() || member.salesRep?.toString();
        if (salesRepId !== staffId) continue;
      }

      if (memberType !== 'all') {
        if (memberType === 'active' && member.membershipStatus !== 'active') continue;
        if (memberType === 'inactive' && member.membershipStatus === 'active') continue;
      }

      for (const item of invoice.items) {
        if (!item.expiryDate) continue;
        const expiryDate = new Date(item.expiryDate);
        if (expiryDate < start || expiryDate > end) continue;

        if (membershipDuration && membershipDuration !== 'all') {
          const durationBucket = getMembershipDurationBucket(item.startDate, item.expiryDate);
          if (durationBucket !== membershipDuration) continue;
        }

        const serviceName = item.serviceId?.name || item.description || '';
        if (serviceName.toLowerCase().includes('pt') || 
            serviceName.toLowerCase().includes('personal training')) {
          continue;
        }

        if (search) {
          const searchLower = search.toLowerCase();
          const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase();
          const mobile = (member.phone || '').toLowerCase();
          const email = (member.email || '').toLowerCase();
          
          if (!memberName.includes(searchLower) && 
              !mobile.includes(searchLower) && 
              !email.includes(searchLower)) {
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

        const memberId = member.memberId || '-';
        const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
        const mobile = member.phone || '-';
        const email = member.email || '-';
        const status = member.membershipStatus === 'active' ? 'Active' : 
                      member.membershipStatus === 'expired' ? 'Expired' : 
                      member.membershipStatus === 'frozen' ? 'Frozen' : 
                      member.membershipStatus === 'cancelled' ? 'Cancelled' : 'Inactive';
        
        const salesRep = member.salesRep 
          ? `${member.salesRep.firstName || ''} ${member.salesRep.lastName || ''}`.trim()
          : '-';
        
        const generalTrainer = member.generalTrainer
          ? `${member.generalTrainer.firstName || ''} ${member.generalTrainer.lastName || ''}`.trim()
          : '-';

        const serviceVariationName = item.serviceId?.name || item.description || serviceName;
        const amount = item.total || item.amount || 0;

        const startDate = item.startDate ? formatDate(item.startDate) : '-';
        const expiryDateStr = formatDate(item.expiryDate);
        const serviceDuration = item.startDate && item.expiryDate 
          ? `${formatDate(item.startDate)} To ${formatDate(item.expiryDate)}`
          : '-';

        // Get last invoice date (for export, we'll use the same map if available)
        const lastInvoiceDate = lastInvoiceMap[member._id.toString()] 
          ? formatDate(lastInvoiceMap[member._id.toString()]) 
          : '-';

        const totalSessions = item.numberOfSessions || (member.currentPlan?.sessions?.total) || 'Not Applicable';
        const utilized = item.numberOfSessions 
          ? (member.currentPlan?.sessions?.used || 0)
          : (member.currentPlan?.sessions?.used || 0);
        const balance = item.numberOfSessions 
          ? (item.numberOfSessions - utilized)
          : '-';

        const checkInData = checkInMap[member._id.toString()];
        const followUpData = followUpMap[member._id.toString()];

        records.push({
          'S.No': records.length + 1,
          'Member ID': memberId,
          'Member Name': memberName,
          'Mobile': mobile,
          'Email': email,
          'Status': status,
          'Sales Rep': salesRep,
          'General Trainer': generalTrainer,
          'Service Name': serviceName.split(' - ')[0] || serviceName,
          'Service Variation Name': serviceVariationName,
          'Amount': amount.toFixed(2),
          'Service Duration': serviceDuration,
          'Expiry Date': expiryDateStr,
          'Last Invoice Date': lastInvoiceDate,
          'Total Sessions': totalSessions === 'Not Applicable' ? 'Not Applicable' : totalSessions,
          'Utilized': utilized,
          'Balance': balance === '-' ? '-' : balance,
          'Last Contacted Date': followUpData?.lastContactedDate ? formatDate(followUpData.lastContactedDate) : '-',
          'Last Check-In Date': checkInData ? formatDate(checkInData) : '-',
          'Last Status': followUpData?.lastStatus || '-',
          'Last Call Status': followUpData?.lastCallStatus || '-'
        });
      }
    }

    const headers = [
      'S.No', 'Member ID', 'Member Name', 'Mobile', 'Email', 'Status',
      'Sales Rep', 'General Trainer', 'Service Name', 'Service Variation Name',
      'Amount', 'Service Duration', 'Expiry Date', 'Last Invoice Date',
      'Total Sessions', 'Utilized', 'Balance', 'Last Contacted Date',
      'Last Check-In Date', 'Last Status', 'Last Call Status'
    ];

    let csvContent = headers.join(',') + '\n';
    records.forEach((record) => {
      const row = headers.map(header => {
        const value = record[header] || '-';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=service-expiry-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Irregular Members Report

