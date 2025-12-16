import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Member from '../models/Member.js';
import { handleError } from '../utils/errorHandler.js';

// Member login (email only, no password required)
export const memberLogin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const member = await Member.findOne({
      email: email.toLowerCase().trim(),
      isActive: true
    });

    if (!member) {
      return res.status(401).json({ 
        success: false, 
        message: 'No account found with this email address' 
      });
    }

    // Generate token (no password verification needed)
    const token = jwt.sign(
      { 
        memberId: member._id,
        organizationId: member.organizationId,
        type: 'member'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      member: {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        memberId: member.memberId,
        organizationId: member.organizationId
      }
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Set/Update member password (admin only)
export const setMemberPassword = async (req, res) => {
  try {
    const { memberId, password } = req.body;

    if (!memberId || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Member ID and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ 
        success: false, 
        message: 'Member not found' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    member.password = hashedPassword;
    await member.save();

    res.json({ 
      success: true, 
      message: 'Password set successfully' 
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Member change password
export const changeMemberPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    const member = await Member.findById(req.member._id).select('+password');

    const isPasswordValid = await bcrypt.compare(currentPassword, member.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    member.password = hashedPassword;
    await member.save();

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Get member profile
export const getMemberProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id)
      .select('-password')
      .populate('organizationId', 'name');

    if (!member) {
      return res.status(404).json({ 
        success: false, 
        message: 'Member not found' 
      });
    }

    res.json({ success: true, member });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Update member profile (self-service)
export const updateMemberProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id);

    if (!member) {
      return res.status(404).json({ 
        success: false, 
        message: 'Member not found' 
      });
    }

    // Allow updating specific fields only
    const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'dateOfBirth', 'communicationPreferences'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'communicationPreferences' && typeof req.body[field] === 'object') {
          // Merge communication preferences
          member.communicationPreferences = {
            ...member.communicationPreferences,
            ...req.body[field]
          };
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    Object.assign(member, updateData);
    await member.save();

    const memberResponse = member.toObject();
    delete memberResponse.password;

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      member: memberResponse 
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

