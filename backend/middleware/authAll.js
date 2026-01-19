const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Middleware that allows both users and admins
const protectAll = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    if (decoded.isAdmin) {
      // Admin access
      req.admin = await Admin.findById(decoded.adminId).select('-password');
      req.isAdmin = true;

      if (!req.admin) {
        return res.status(401).json({ message: 'Not authorized, admin not found' });
      }
    } else {
      // User access
      req.user = await User.findById(decoded.userId).select('-password');
      req.isAdmin = false;

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: 'User account is inactive' });
      }
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = { protectAll };
