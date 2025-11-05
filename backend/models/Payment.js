import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
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
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cash', 'card', 'upi', 'bank_transfer', 'other'],
    required: true
  },
  razorpayDetails: {
    orderId: String,
    paymentId: String,
    signature: String,
    method: String,
    bank: String,
    wallet: String,
    vpa: String,
    cardId: String
  },
  transactionId: String,
  receiptNumber: String,
  receiptUrl: String,
  notes: String,
  paidAt: Date,
  refundedAt: Date,
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  razorpayRefundId: String,
  reconciled: {
    type: Boolean,
    default: false
  },
  reconciledAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ organizationId: 1, status: 1 });
paymentSchema.index({ organizationId: 1, paidAt: 1 });
paymentSchema.index({ razorpayDetails: { paymentId: 1 } });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

