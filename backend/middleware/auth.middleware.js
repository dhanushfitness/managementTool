import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('organizationId', 'name email isActive');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    if (!user.organizationId || !user.organizationId.isActive) {
      return res.status(401).json({ success: false, message: 'Organization not found or inactive' });
    }

    req.user = user;
    req.organizationId = user.organizationId._id;
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

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Owners and managers have all permissions
    if (['owner', 'manager'].includes(req.user.role)) {
      return next();
    }

    // Check specific permission
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      message: `Permission denied: ${permission}` 
    });
  };
};

