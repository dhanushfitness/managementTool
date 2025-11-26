import jwt from 'jsonwebtoken';
import Member from '../models/Member.js';
import Organization from '../models/Organization.js';

export const authenticateMember = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is for member type
    if (decoded.type !== 'member') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const member = await Member.findById(decoded.memberId)
      .select('-password')
      .populate('organizationId', 'name email isActive');

    if (!member || !member.isActive) {
      return res.status(401).json({ success: false, message: 'Member not found or inactive' });
    }

    if (!member.organizationId || !member.organizationId.isActive) {
      return res.status(401).json({ success: false, message: 'Organization not found or inactive' });
    }

    req.member = member;
    req.organizationId = member.organizationId._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

