import WebhookEvent from '../models/WebhookEvent.js';

export const handleWhatsAppWebhook = async (req, res) => {
  try {
    const webhookEvent = await WebhookEvent.create({
      source: 'whatsapp',
      eventId: `${Date.now()}-${Math.random()}`,
      eventType: req.body.type || 'unknown',
      payload: req.body,
      status: 'processed',
      processedAt: new Date()
    });

    // Process WhatsApp delivery status, read receipts, etc.
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleBiometricWebhook = async (req, res) => {
  try {
    const { memberId, deviceId, timestamp, action } = req.body;

    if (action === 'checkin') {
      // Process biometric check-in
      // This would trigger the check-in flow
    }

    const webhookEvent = await WebhookEvent.create({
      source: 'biometric',
      eventId: `${Date.now()}-${Math.random()}`,
      eventType: action || 'checkin',
      payload: req.body,
      status: 'processed',
      processedAt: new Date()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWebhookEvents = async (req, res) => {
  try {
    const { source, status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId };
    if (source) query.source = source;
    if (status) query.status = status;

    const events = await WebhookEvent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WebhookEvent.countDocuments(query);

    res.json({
      success: true,
      events,
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

