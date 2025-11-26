import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    console.log('Auth header received:', {
      hasHeader: !!authHeader,
      headerLength: authHeader?.length,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 20),
      url: req.url
    });

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', { 
      userId: decoded.userId, 
      hasUserId: !!decoded.userId,
      decodedKeys: Object.keys(decoded),
      fullDecoded: decoded
    });
    
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('organizationId', 'name email isActive');

    console.log('User lookup result:', { 
      found: !!user, 
      isActive: user?.isActive,
      hasOrganizationId: !!user?.organizationId,
      organizationId: user?.organizationId?._id,
      organizationIsActive: user?.organizationId?.isActive
    });

    if (!user) {
      console.error('User not found for userId:', decoded.userId);
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    if (!user.isActive) {
      console.error('User is inactive:', decoded.userId);
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    if (!user.organizationId) {
      console.error('User has no organizationId:', decoded.userId);
      return res.status(401).json({ success: false, message: 'Organization not found or inactive' });
    }

    if (!user.organizationId.isActive) {
      console.error('User organization is inactive:', user.organizationId._id);
      return res.status(401).json({ success: false, message: 'Organization not found or inactive' });
    }

    req.user = user;
    req.organizationId = user.organizationId._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.error('JWT Error:', error.message);
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      console.error('Token expired');
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    console.error('Authentication error:', error);
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

