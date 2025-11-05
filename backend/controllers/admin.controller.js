import User from '../models/User.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';

// Get Super Admin Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('organizationId', 'name');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return profile data
    res.json({
      success: true,
      profile: {
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode || '+91',
        gender: user.gender,
        rfidCard: user.rfidCard || '',
        defaultTimezone: user.defaultTimezone || 'Asia/Kolkata',
        defaultOpenPage: user.defaultOpenPage || 'snapshot',
        isSuperAdminStaff: user.isSuperAdminStaff || false,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Super Admin Profile
export const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      countryCode,
      gender,
      rfidCard,
      defaultTimezone,
      defaultOpenPage,
      isSuperAdminStaff
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (countryCode) user.countryCode = countryCode;
    if (gender) user.gender = gender.toLowerCase();
    if (rfidCard !== undefined) user.rfidCard = rfidCard;
    if (defaultTimezone) user.defaultTimezone = defaultTimezone;
    if (defaultOpenPage) user.defaultOpenPage = defaultOpenPage.toLowerCase().replace(' ', '-');
    if (isSuperAdminStaff !== undefined) user.isSuperAdminStaff = isSuperAdminStaff;

    await user.save();

    // Log the action
    await AuditLog.create({
      organizationId: user.organizationId,
      userId: user._id,
      action: 'update_profile',
      entityType: 'user',
      entityId: user._id,
      changes: req.body,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode,
        gender: user.gender,
        rfidCard: user.rfidCard,
        defaultTimezone: user.defaultTimezone,
        defaultOpenPage: user.defaultOpenPage,
        isSuperAdminStaff: user.isSuperAdminStaff
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Account Plan
export const getAccountPlan = async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId);

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Format dates
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    res.json({
      success: true,
      accountPlan: {
        smsBalance: {
          transactional: organization.balances?.sms?.transactional || 0,
          promotional: organization.balances?.sms?.promotional || 0
        },
        mailBalance: {
          free: organization.balances?.mail?.free || 0,
          paid: organization.balances?.mail?.paid || 0
        },
        subscriptionStartDate: formatDate(organization.subscription?.startDate),
        subscriptionExpiryDate: formatDate(organization.subscription?.expiresAt),
        plan: organization.subscription?.plan || 'free',
        status: organization.subscription?.status || 'trial'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

