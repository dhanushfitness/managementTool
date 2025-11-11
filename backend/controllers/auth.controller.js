import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
import Plan from '../models/Plan.js';
import { validationResult } from 'express-validator';

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Please set it in your .env file.');
  }
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const DEFAULT_SERVICE_VARIATIONS = [
  {
    serviceName: 'Gym Membership',
    serviceType: 'Membership',
    variations: [
      {
        variationId: 'GM-001',
        name: '1 Month Membership',
        description: '6 Days per week. Valid for 1 month(s).',
        type: 'duration',
        duration: { value: 1, unit: 'months' },
        price: 6000,
        allowOnlineSale: false,
        isPopular: true
      },
      {
        variationId: 'GM-002',
        name: '2 Month Membership',
        description: '6 Days per week. Valid for 2 month(s).',
        type: 'duration',
        duration: { value: 2, unit: 'months' },
        price: 7000,
        allowOnlineSale: false
      },
      {
        variationId: 'GM-003',
        name: '3 Month Membership',
        description: '6 Days per week. Valid for 3 month(s).',
        type: 'duration',
        duration: { value: 3, unit: 'months' },
        price: 8849,
        allowOnlineSale: false
      },
      {
        variationId: 'GM-004',
        name: '4 Months Membership',
        description: '6 Days per week. Valid for 4 month(s).',
        type: 'duration',
        duration: { value: 4, unit: 'months' },
        price: 8000,
        allowOnlineSale: false
      },
      {
        variationId: 'GM-005',
        name: '6 Month Membership',
        description: '6 Days per week. Valid for 6 month(s).',
        type: 'duration',
        duration: { value: 6, unit: 'months' },
        price: 12389,
        allowOnlineSale: false
      },
      {
        variationId: 'GM-006',
        name: '9 Month Membership',
        description: '6 Days per week. Valid for 9 month(s).',
        type: 'duration',
        duration: { value: 9, unit: 'months' },
        price: 12345,
        allowOnlineSale: false
      },
      {
        variationId: 'GM-007',
        name: '1 Year Membership',
        description: '6 Days per week. Valid for 12 month(s).',
        type: 'duration',
        duration: { value: 12, unit: 'months' },
        price: 25000,
        allowOnlineSale: false
      },
      {
        variationId: 'GM-008',
        name: '2 Year Membership',
        description: '6 Days per week. Valid for 24 month(s).',
        type: 'duration',
        duration: { value: 24, unit: 'months' },
        price: 50000,
        allowOnlineSale: false
      },
      {
        variationId: 'GM-009',
        name: 'VIP Lifetime Membership',
        description: '6 Days per week. Valid for 100 month(s).',
        type: 'duration',
        duration: { value: 100, unit: 'months' },
        price: 150000,
        allowOnlineSale: false,
        autoRenew: false
      }
    ]
  },
  {
    serviceName: 'Silver Package',
    serviceType: 'Package',
    variations: [
      {
        variationId: 'SP-001',
        name: 'Silver Package - Standard',
        description: 'Guided workouts with trainer check-ins. Valid for 3 month(s).',
        type: 'duration',
        duration: { value: 3, unit: 'months' },
        price: 18000,
        allowOnlineSale: false
      },
      {
        variationId: 'SP-002',
        name: 'Silver Package - Premium',
        description: 'Includes nutrition templates and group classes. Valid for 6 month(s).',
        type: 'duration',
        duration: { value: 6, unit: 'months' },
        price: 32000,
        allowOnlineSale: false
      }
    ]
  },
  {
    serviceName: 'Gold Package',
    serviceType: 'Package',
    variations: [
      {
        variationId: 'GP-001',
        name: 'Gold Package - Standard',
        description: 'Premium coaching with fortnightly assessments. Valid for 6 month(s).',
        type: 'duration',
        duration: { value: 6, unit: 'months' },
        price: 45000,
        allowOnlineSale: false
      },
      {
        variationId: 'GP-002',
        name: 'Gold Package - Premium',
        description: 'Includes personal coaching slots. Valid for 12 month(s).',
        type: 'duration',
        duration: { value: 12, unit: 'months' },
        price: 82000,
        allowOnlineSale: false,
        isPopular: true
      }
    ]
  },
  {
    serviceName: 'Diamond Package',
    serviceType: 'Package',
    variations: [
      {
        variationId: 'DP-001',
        name: 'Diamond Package - Standard',
        description: 'All-access premium membership. Valid for 12 month(s).',
        type: 'duration',
        duration: { value: 12, unit: 'months' },
        price: 120000,
        allowOnlineSale: false
      },
      {
        variationId: 'DP-002',
        name: 'Diamond Package - Elite',
        description: 'Dedicated coach and concierge support. Valid for 18 month(s).',
        type: 'duration',
        duration: { value: 18, unit: 'months' },
        price: 165000,
        allowOnlineSale: false
      }
    ]
  },
  {
    serviceName: 'Platinum Package',
    serviceType: 'Package',
    variations: [
      {
        variationId: 'PP-001',
        name: 'Platinum Package - Elite',
        description: 'VIP access with wellness consultations. Valid for 12 month(s).',
        type: 'duration',
        duration: { value: 12, unit: 'months' },
        price: 180000,
        allowOnlineSale: false
      },
      {
        variationId: 'PP-002',
        name: 'Platinum Package - Signature',
        description: 'Includes spa, recovery and nutrition labs. Valid for 24 month(s).',
        type: 'duration',
        duration: { value: 24, unit: 'months' },
        price: 250000,
        allowOnlineSale: false
      }
    ]
  },
  {
    serviceName: 'Transformation Package',
    serviceType: 'Program',
    variations: [
      {
        variationId: 'TP-001',
        name: 'Transformation Package - 12 Week',
        description: 'High-touch transformation sprint. Valid for 12 week(s).',
        type: 'duration',
        duration: { value: 12, unit: 'weeks' },
        price: 40000,
        allowOnlineSale: true
      },
      {
        variationId: 'TP-002',
        name: 'Transformation Package - 24 Week',
        description: 'Advanced transformation roadmap. Valid for 24 week(s).',
        type: 'duration',
        duration: { value: 24, unit: 'weeks' },
        price: 70000,
        allowOnlineSale: true
      }
    ]
  }
];

const buildDefaultPlans = (organizationId, userId) => {
  const plans = [];
  let displayOrder = 1;

  DEFAULT_SERVICE_VARIATIONS.forEach((service) => {
    service.variations.forEach((variation) => {
      const plan = {
        organizationId,
        createdBy: userId,
        name: variation.name,
        description: variation.description,
        type: variation.type || 'duration',
        price: variation.price ?? 0,
        setupFee: variation.setupFee ?? 0,
        taxRate: variation.taxRate ?? 0,
        serviceName: service.serviceName,
        serviceType: service.serviceType || 'Membership',
        variationId: variation.variationId,
        allowOnlineSale: variation.allowOnlineSale ?? false,
        isActive: variation.isActive ?? true,
        isPopular: variation.isPopular ?? false,
        displayOrder: variation.displayOrder ?? displayOrder,
        autoRenew: variation.autoRenew ?? true
      };

      if (variation.duration) {
        plan.duration = variation.duration;
      }

      if (variation.sessions) {
        plan.sessions = variation.sessions;
      }

      if (variation.features) {
        plan.features = variation.features;
      }

      if (variation.addOns) {
        plan.addOns = variation.addOns;
      }

      plans.push(plan);
      displayOrder += 1;
    });
  });

  return plans;
};

const createDefaultPlansForOrganization = async (organizationId, userId) => {
  const existingPlans = await Plan.countDocuments({ organizationId });
  if (existingPlans > 0) {
    return;
  }

  const plans = buildDefaultPlans(organizationId, userId);
  if (plans.length === 0) {
    return;
  }

  await Plan.insertMany(plans);
};

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      email,
      password,
      phone,
      firstName,
      lastName,
      organizationName,
      branchName,
      organizationPhone,
      organizationEmail,
      addressStreet,
      addressCity,
      addressState,
      addressZip,
      addressCountry,
      gstNumber,
      taxRate,
      taxInclusive,
      currency,
      timezone
    } = req.body;

    const normalizedTaxRate = taxRate !== undefined && taxRate !== '' ? parseFloat(taxRate) : undefined;
    const normalizedTaxInclusive = typeof taxInclusive === 'string'
      ? taxInclusive.toLowerCase() === 'true'
      : typeof taxInclusive === 'boolean'
        ? taxInclusive
        : undefined;

    const address = {
      street: addressStreet || '',
      city: addressCity || '',
      state: addressState || '',
      zipCode: addressZip || '',
      country: addressCountry || ''
    };

    const hasAddress = Object.values(address).some(value => Boolean(value));

    const taxSettings = {};
    if (gstNumber) taxSettings.gstNumber = gstNumber;
    if (normalizedTaxRate !== undefined && !Number.isNaN(normalizedTaxRate)) {
      taxSettings.taxRate = normalizedTaxRate;
    }
    if (typeof normalizedTaxInclusive === 'boolean') taxSettings.taxInclusive = normalizedTaxInclusive;

    const organizationData = {
      name: organizationName,
      email: (organizationEmail || email || '').trim(),
      phone: (organizationPhone || phone || '').trim(),
      createdBy: null
    };

    if (hasAddress) {
      organizationData.address = {
        ...address,
        country: address.country || 'India'
      };
    }

    if (currency) {
      organizationData.currency = currency;
    }

    if (timezone) {
      organizationData.timezone = timezone;
    }

    if (Object.keys(taxSettings).length > 0) {
      organizationData.taxSettings = { ...taxSettings };
    }

    if (req.file) {
      organizationData.logo = `/uploads/organizations/${req.file.filename}`;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create organization
    const organization = await Organization.create(organizationData);

    const branchAddress = {
      street: addressStreet || '',
      city: addressCity || '',
      state: addressState || '',
      zipCode: addressZip || '',
      country: addressCountry || 'India',
      fullAddress: [addressStreet, addressCity, addressState, addressZip, addressCountry]
        .filter(Boolean)
        .join(', ')
    };

    const branch = await Branch.create({
      organizationId: organization._id,
      name: branchName || 'Main Branch',
      code: 'MAIN',
      brandName: organizationName,
      businessType: 'fitness',
      locality: addressStreet || 'Primary Location',
      city: addressCity || 'Unknown City',
      state: addressState || 'Unknown State',
      country: addressCountry || 'India',
      currency: currency || 'INR',
      timezone: timezone || 'Asia/Kolkata',
      phone: organizationPhone || phone,
      email: organizationEmail || email,
      address: branchAddress
    });

    // Create user (owner)
    const user = await User.create({
      organizationId: organization._id,
      branchId: branch._id,
      email,
      password,
      phone,
      firstName,
      lastName,
      role: 'owner',
      isEmailVerified: false,
      isPhoneVerified: false
    });

    // Update organization createdBy
    organization.createdBy = user._id;
    await organization.save();

    try {
      await createDefaultPlansForOrganization(organization._id, user._id);
    } catch (planError) {
      console.error(`Failed to create default plans for organization ${organization._id}`, planError);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: organization._id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('organizationId');
    
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    // Check if organization exists
    if (!user.organizationId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User organization not found. Please contact administrator.' 
      });
    }

    // Check if organization is active
    if (!user.organizationId.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Organization is inactive. Please contact administrator.' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId._id || user.organizationId,
        organizationName: user.organizationId.name || 'Unknown Organization'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('organizationId', 'name email logo')
      .populate('branchId', 'name code');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPhone = async (req, res) => {
  try {
    const { token, phone } = req.body;
    const user = await User.findOne({ phone, phoneVerificationToken: token });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If user exists, reset link sent to email' });
    }

    // Generate reset token (simplified - in production use crypto)
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // In production, send email with reset link
    res.json({ success: true, message: 'Reset link sent to email', token: resetToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();

    res.json({ success: true, message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!await user.comparePassword(currentPassword)) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

