const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Unified authentication middleware that supports User, Admin, and Employee
 * Sets req.isAdmin, req.isEmployee, req.user, req.employee as appropriate
 */
const unifiedProtect = async (req, res, next) => {
  try {
    // Check for admin token first
    const adminToken = req.cookies.adminToken;
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, JWT_SECRET);
        if (decoded.isAdmin) {
          const admin = await Admin.findById(decoded.adminId).select('-password');
          if (admin && admin.isActive) {
            req.admin = admin;
            req.isAdmin = true;
            req.isEmployee = false;
            return next();
          }
        }
      } catch (e) {
        // Token invalid, continue to check other tokens
      }
    }

    // Check for employee token
    const employeeToken = req.cookies.employeeToken;
    if (employeeToken) {
      try {
        const decoded = jwt.verify(employeeToken, JWT_SECRET);
        if (decoded.isEmployee) {
          const employee = await Employee.findById(decoded.employeeId)
            .select('-password')
            .populate('assignedProperties', '_id name');

          if (employee && employee.isActive) {
            req.employee = employee;
            req.isEmployee = true;
            req.isAdmin = false;
            req.ownerId = employee.ownerId;
            req.permissions = employee.permissions;
            req.assignedPropertyIds = employee.assignedProperties.map(p => p._id);
            // Set user context as the owner for data filtering
            req.user = { _id: employee.ownerId };
            return next();
          }
        }
      } catch (e) {
        // Token invalid, continue to check user token
      }
    }

    // Check for user token
    const userToken = req.cookies.token;
    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, JWT_SECRET);
        if (!decoded.isAdmin) {
          const user = await User.findById(decoded.userId).select('-password');
          if (user && user.isActive) {
            req.user = user;
            req.isAdmin = false;
            req.isEmployee = false;
            return next();
          }
        }
      } catch (e) {
        // Token invalid
      }
    }

    return res.status(401).json({ message: 'Not authorized, no valid token provided' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Middleware to check employee permission for a resource/action
 * For non-employees (User/Admin), always passes through
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    // Admin and User (owner) have full access
    if (req.isAdmin || !req.isEmployee) {
      return next();
    }

    // Employee permission check
    const resourcePermissions = req.permissions[resource];
    if (!resourcePermissions || !resourcePermissions[action]) {
      return res.status(403).json({
        message: `Permission denied: You don't have ${action} access to ${resource}`
      });
    }

    next();
  };
};

/**
 * Build filter object based on user type
 * Admin: no filter (sees all)
 * User: filter by userId
 * Employee: filter by ownerId and assigned properties
 */
const buildOwnerFilter = (req, propertyField = 'propertyId') => {
  if (req.isAdmin) {
    return {};
  }

  const filter = { userId: req.user._id };

  // For employees, also filter by assigned properties
  if (req.isEmployee && req.assignedPropertyIds && req.assignedPropertyIds.length > 0) {
    filter[propertyField] = { $in: req.assignedPropertyIds };
  }

  return filter;
};

/**
 * Check if employee has access to a specific property
 */
const hasPropertyAccess = (req, propertyId) => {
  if (req.isAdmin || !req.isEmployee) {
    return true;
  }

  if (!propertyId) {
    return true;
  }

  return req.assignedPropertyIds.some(
    id => id.toString() === propertyId.toString()
  );
};

module.exports = {
  unifiedProtect,
  checkPermission,
  buildOwnerFilter,
  hasPropertyAccess,
};
