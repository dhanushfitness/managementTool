// Additional report controllers to be added to report.controller.js
// These will be appended to the end of the file

import Expense from '../models/Expense.js';

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

    // Reuse getCashFlowStatementReport logic
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

