import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  voucherDate: {
    type: Date,
    required: true,
    index: true
  },
  voucherNumber: {
    type: String,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['rent', 'utilities', 'salaries', 'equipment', 'maintenance', 'marketing', 'supplies', 'travel', 'professional-services', 'other'],
    index: true
  },
  paidTo: {
    type: String,
    required: true,
    trim: true
  },
  paidTowards: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  amountInWords: String,
  paymentSource: {
    type: String,
    enum: ['cash', 'bank-account', 'credit-card', 'petty-cash', 'other']
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other'],
    default: 'cash'
  },
  attachment: {
    name: String,
    url: String,
    uploadedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
expenseSchema.index({ organizationId: 1, voucherDate: -1 });
expenseSchema.index({ organizationId: 1, category: 1 });
expenseSchema.index({ organizationId: 1, status: 1 });

// Generate voucher number if not provided
expenseSchema.pre('save', async function(next) {
  if (!this.voucherNumber && this.isNew) {
    const count = await mongoose.model('Expense').countDocuments({ 
      organizationId: this.organizationId 
    });
    this.voucherNumber = `DV${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;

