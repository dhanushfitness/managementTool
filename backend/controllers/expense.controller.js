import Expense from '../models/Expense.js';
import AuditLog from '../models/AuditLog.js';

// Helper function to convert number to words
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
};

export const createExpense = async (req, res) => {
  try {
    const {
      voucherDate,
      voucherNumber,
      category,
      paidTo,
      paidTowards,
      amount,
      amountInWords,
      paymentSource,
      paymentMode,
      attachment,
      notes
    } = req.body;

    // Generate amount in words if not provided
    let finalAmountInWords = amountInWords;
    if (!finalAmountInWords && amount) {
      const rupees = Math.floor(amount);
      const paise = Math.round((amount - rupees) * 100);
      let words = numberToWords(rupees) + ' Rupees';
      if (paise > 0) {
        words += ' and ' + numberToWords(paise) + ' Paise';
      }
      words += ' Only';
      finalAmountInWords = words;
    }

    const expense = await Expense.create({
      organizationId: req.organizationId,
      branchId: req.body.branchId || req.user.branchId,
      voucherDate: voucherDate || new Date(),
      voucherNumber,
      category,
      paidTo,
      paidTowards: paidTowards || undefined,
      amount: parseFloat(amount),
      amountInWords: finalAmountInWords,
      paymentSource: paymentSource || undefined,
      paymentMode: paymentMode || 'cash',
      attachment: attachment || undefined,
      notes: notes || undefined,
      createdBy: req.user._id
    });

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'expense.created',
      entityType: 'Expense',
      entityId: expense._id
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status, startDate, endDate, branchId } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId };
    if (category) query.category = category;
    if (status) query.status = status;
    if (branchId) query.branchId = branchId;
    if (startDate || endDate) {
      query.voucherDate = {};
      if (startDate) query.voucherDate.$gte = new Date(startDate);
      if (endDate) query.voucherDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('branchId', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ voucherDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(query);

    res.json({
      success: true,
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.expenseId,
      organizationId: req.organizationId
    })
      .populate('branchId', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.expenseId,
      organizationId: req.organizationId
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Generate amount in words if amount changed and words not provided
    if (req.body.amount && !req.body.amountInWords) {
      const rupees = Math.floor(req.body.amount);
      const paise = Math.round((req.body.amount - rupees) * 100);
      let words = numberToWords(rupees) + ' Rupees';
      if (paise > 0) {
        words += ' and ' + numberToWords(paise) + ' Paise';
      }
      words += ' Only';
      req.body.amountInWords = words;
    }

    Object.assign(expense, req.body);
    await expense.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'expense.updated',
      entityType: 'Expense',
      entityId: expense._id
    });

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.expenseId,
      organizationId: req.organizationId
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await expense.deleteOne();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'expense.deleted',
      entityType: 'Expense',
      entityId: expense._id
    });

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.expenseId,
      organizationId: req.organizationId
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    expense.status = 'approved';
    expense.approvedBy = req.user._id;
    expense.approvedAt = new Date();
    await expense.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'expense.approved',
      entityType: 'Expense',
      entityId: expense._id
    });

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

