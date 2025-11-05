import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
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

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, phone, firstName, lastName, organizationName, branchName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create organization
    const organization = await Organization.create({
      name: organizationName,
      email,
      phone,
      createdBy: null // Will update after user creation
    });

    // Create default branch
    const branch = await Branch.create({
      organizationId: organization._id,
      name: branchName || 'Main Branch',
      code: 'MAIN'
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

