const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protectAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Not authorized, admin access required' });
    }

    req.admin = await Admin.findById(decoded.adminId).select('-password');
    req.isAdmin = true;

    if (!req.admin) {
      return res.status(401).json({ message: 'Not authorized, admin not found' });
    }

    if (!req.admin.isActive) {
      return res.status(401).json({ message: 'Admin account is inactive' });
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

const authorizeSuperAdmin = (req, res, next) => {
  if (!req.admin.superAdmin) {
    return res.status(403).json({ message: 'Not authorized, super admin access required' });
  }
  next();
};

module.exports = { protectAdmin, authorizeSuperAdmin };