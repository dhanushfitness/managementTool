import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  source: {
    type: String,
    enum: ['razorpay', 'whatsapp', 'biometric'],
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventType: {
    type: String,
    required: true
  },
  payload: mongoose.Schema.Types.Mixed,
  signature: String,
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'retrying'],
    default: 'pending',
    index: true
  },
  processedAt: Date,
  error: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Indexes
webhookEventSchema.index({ organizationId: 1, status: 1 });
webhookEventSchema.index({ source: 1, eventType: 1 });
webhookEventSchema.index({ createdAt: -1 });

const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);

export default WebhookEvent;

