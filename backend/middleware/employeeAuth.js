const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Protect routes that only employees can access.
 * Reads `employeeToken` cookie, verifies JWT, attaches req.employee + req.ownerId + req.permissions.
 */
const protectEmployee = async (req, res, next) => {
  try {
    const token = req.cookies.employeeToken;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no employee token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.isEmployee) {
      return res.status(401).json({ message: 'Invalid employee token' });
    }

    const employee = await Employee.findById(decoded.employeeId)
      .select('-password')
      .populate('assignedProperties', '_id name');

    if (!employee) {
      return res.status(401).json({ message: 'Employee not found' });
    }

    if (!employee.isActive) {
      return res.status(401).json({ message: 'Employee account is inactive' });
    }

    req.employee = employee;
    req.ownerId = employee.ownerId;
    req.permissions = employee.permissions;
    req.assignedPropertyIds = employee.assignedProperties.map((p) => p._id);

    // Set req.user so downstream handlers that use req.user._id for filtering still work
    req.user = { _id: employee.ownerId };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please log in again' });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Check a specific permission for an employee.
 * Usage: checkPermission('tenants', 'add')
 * Non-employees (owners) always pass through.
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    // If this is an owner (not employee), allow all
    if (!req.employee) return next();

    const perm = req.permissions?.[resource];
    if (!perm || !perm[action]) {
      return res.status(403).json({
        message: `Permission denied: you don't have "${action}" access to "${resource}"`,
      });
    }

    next();
  };
};

module.exports = { protectEmployee, checkPermission };
