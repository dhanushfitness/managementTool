import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  },
  type: {
    type: String,
    enum: ['membership', 'renewal', 'upgrade', 'downgrade', 'addon', 'freeze', 'other', 'pro-forma'],
    required: true
  },
  invoiceType: {
    type: String,
    enum: ['service', 'package', 'deal'],
    default: 'service'
  },
  isProForma: {
    type: Boolean,
    default: false
  },
  items: [{
    description: String,
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan'
    },
    duration: String,
    quantity: { type: Number, default: 1 },
    unitPrice: Number,
    discount: {
      type: { type: String, enum: ['flat', 'percentage'] },
      value: Number,
      amount: Number
    },
    taxRate: Number,
    taxType: String,
    amount: Number,
    taxAmount: Number,
    total: Number,
    startDate: Date,
    expiryDate: Date,
    numberOfSessions: Number,
    sacCode: String
  }],
  sacCode: String,
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: {
      type: String,
      enum: ['flat', 'percentage']
    },
    value: Number,
    amount: Number,
    couponCode: String,
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discount'
    }
  },
  tax: {
    rate: Number,
    amount: Number
  },
  rounding: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  pending: {
    type: Number,
    default: 0
  },
  writeOff: {
    type: Boolean,
    default: false
  },
  writeOffAmount: {
    type: Number,
    default: 0
  },
  writeOffReason: String,
  writeOffDate: Date,
  writeOffBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  discountReason: String,
  customerNotes: String,
  internalNotes: String,
  paymentModes: [{
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'razorpay', 'other']
    },
    amount: Number
  }],
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'],
    default: 'draft',
    index: true
  },
  dueDate: Date,
  paidDate: Date,
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cash', 'card', 'upi', 'bank_transfer', 'other']
  },
  dateOfInvoice: {
    type: Date,
    default: Date.now,
    index: true
  },
  razorpayOrderId: String,
  razorpayQRCodeId: String,
  razorpayPaymentId: String,
  notes: String,
  terms: String,
  currency: {
    type: String,
    default: 'INR'
  },
  pdfUrl: String,
  sentAt: Date,
  remindersSent: {
    type: Number,
    default: 0
  },
  lastReminderSent: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
invoiceSchema.index({ organizationId: 1, status: 1 });
invoiceSchema.index({ organizationId: 1, dueDate: 1 });
invoiceSchema.index({ organizationId: 1, paidDate: -1 });
invoiceSchema.index({ organizationId: 1, createdAt: -1 });
invoiceSchema.index({ organizationId: 1, branchId: 1, status: 1 });
invoiceSchema.index({ organizationId: 1, createdAt: -1, status: 1 });
invoiceSchema.index({ memberId: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;

