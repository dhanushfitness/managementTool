import mongoose from 'mongoose';
import Service from '../models/Service.js';
import Plan from '../models/Plan.js';
import AuditLog from '../models/AuditLog.js';

const buildSlug = (name = '') =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const mapServiceResponse = (service, variations) => ({
  ...service,
  variations: variations
    .filter((variation) => variation.serviceId?.toString() === service._id.toString())
    .map((variation) => ({
      ...variation,
      durationLabel: variation.type === 'duration' && variation.duration
        ? `${variation.duration.value} ${variation.duration.unit}`
        : null
    }))
});

export const getServices = async (req, res) => {
  try {
    const services = await Service.find({ organizationId: req.organizationId })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    if (services.length === 0) {
      return res.json({ success: true, services: [] });
    }

    const serviceIds = services.map((service) => service._id);
    const variations = await Plan.find({
      organizationId: req.organizationId,
      serviceId: { $in: serviceIds }
    })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const payload = services.map((service) => mapServiceResponse(service, variations));

    res.json({ success: true, services: payload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createService = async (req, res) => {
  try {
    const { name, description, category, accentColor, icon, displayOrder, isPromoted } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Service name is required' });
    }

    const slug = buildSlug(name);
    const existing = await Service.findOne({ organizationId: req.organizationId, slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Service name already exists' });
    }

    const service = await Service.create({
      organizationId: req.organizationId,
      name: name.trim(),
      slug,
      description,
      category,
      accentColor,
      icon,
      isPromoted,
      displayOrder,
      createdBy: req.user._id
    });

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'service.created',
      entityType: 'Service',
      entityId: service._id
    });

    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const updates = { ...req.body };
    const service = await Service.findOne({
      _id: req.params.serviceId,
      organizationId: req.organizationId
    });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const before = service.toObject();

    if (updates.name && updates.name !== service.name) {
      const slug = buildSlug(updates.name);
      const duplicate = await Service.findOne({
        organizationId: req.organizationId,
        slug,
        _id: { $ne: service._id }
      });

      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Another service already uses this name' });
      }

      service.slug = slug;
      service.name = updates.name.trim();
      delete updates.name;
    }

    Object.keys(updates).forEach((key) => {
      if (typeof updates[key] === 'undefined') {
        delete updates[key];
      }
    });

    Object.assign(service, updates);
    await service.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'service.updated',
      entityType: 'Service',
      entityId: service._id,
      changes: {
        before,
        after: service.toObject()
      }
    });

    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleServiceStatus = async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.serviceId,
      organizationId: req.organizationId
    });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    service.isActive = !service.isActive;
    await service.save();

    await Plan.updateMany(
      { serviceId: service._id, organizationId: req.organizationId },
      { $set: { isActive: service.isActive } }
    );

    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.serviceId,
      organizationId: req.organizationId
    });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    service.isActive = false;
    service.isPromoted = false;
    await service.save();

    await Plan.updateMany(
      { serviceId: service._id, organizationId: req.organizationId },
      { $set: { isActive: false } }
    );

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'service.deleted',
      entityType: 'Service',
      entityId: service._id
    });

    res.json({ success: true, message: 'Service archived successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createServiceVariation = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = await Service.findOne({
      _id: serviceId,
      organizationId: req.organizationId
    });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const {
      name,
      description,
      type = 'duration',
      duration,
      sessions,
      price,
      setupFee,
      taxRate,
      allowOnlineSale,
      isPopular,
      autoRenew,
      displayOrder,
      variationId
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Variation name is required' });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({ success: false, message: 'Price is required' });
    }

    let parsedDuration;
    if (type === 'duration') {
      if (!duration?.value || !duration?.unit) {
        return res.status(400).json({ success: false, message: 'Duration value and unit are required' });
      }
      parsedDuration = duration;
    }

    const variation = await Plan.create({
      organizationId: req.organizationId,
      serviceId: service._id,
      serviceName: service.name,
      serviceType: service.category,
      name: name.trim(),
      description,
      type,
      duration: parsedDuration,
      sessions,
      price,
      setupFee,
      taxRate,
      allowOnlineSale,
      isPopular,
      autoRenew,
      displayOrder,
      variationId,
      createdBy: req.user._id
    });

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'service.variation.created',
      entityType: 'Plan',
      entityId: variation._id,
      metadata: {
        serviceId: service._id
      }
    });

    res.status(201).json({ success: true, variation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateServiceVariation = async (req, res) => {
  try {
    const { serviceId, variationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(variationId)) {
      return res.status(400).json({ success: false, message: 'Invalid variation id' });
    }

    const variation = await Plan.findOne({
      _id: variationId,
      serviceId,
      organizationId: req.organizationId
    });

    if (!variation) {
      return res.status(404).json({ success: false, message: 'Variation not found' });
    }

    const updates = { ...req.body };
    const before = variation.toObject();

    if (updates.duration && variation.type === 'duration') {
      if (!updates.duration.value || !updates.duration.unit) {
        return res.status(400).json({ success: false, message: 'Duration value and unit are required' });
      }
    }

    Object.assign(variation, updates);
    await variation.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'service.variation.updated',
      entityType: 'Plan',
      entityId: variation._id,
      changes: {
        before,
        after: variation.toObject()
      }
    });

    res.json({ success: true, variation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleServiceVariationStatus = async (req, res) => {
  try {
    const { serviceId, variationId } = req.params;

    const variation = await Plan.findOne({
      _id: variationId,
      serviceId,
      organizationId: req.organizationId
    });

    if (!variation) {
      return res.status(404).json({ success: false, message: 'Variation not found' });
    }

    variation.isActive = !variation.isActive;
    await variation.save();

    res.json({ success: true, variation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteServiceVariation = async (req, res) => {
  try {
    const { serviceId, variationId } = req.params;

    const variation = await Plan.findOne({
      _id: variationId,
      serviceId,
      organizationId: req.organizationId
    });

    if (!variation) {
      return res.status(404).json({ success: false, message: 'Variation not found' });
    }

    await variation.deleteOne();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'service.variation.deleted',
      entityType: 'Plan',
      entityId: variation._id,
      metadata: {
        serviceId
      }
    });

    res.json({ success: true, message: 'Variation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


