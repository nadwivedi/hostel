const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// Protect employee routes - verify JWT token
const protectEmployee = async (req, res, next) => {
  try {
    const token = req.cookies.employeeToken;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    if (!decoded.isEmployee) {
      return res.status(403).json({ message: 'Not authorized, employee access required' });
    }

    const employee = await Employee.findById(decoded.employeeId)
      .select('-password')
      .populate('assignedProperties', '_id name');

    if (!employee) {
      return res.status(401).json({ message: 'Not authorized, employee not found' });
    }

    if (!employee.isActive) {
      return res.status(401).json({ message: 'Employee account is inactive' });
    }

    req.employee = employee;
    req.isEmployee = true;
    req.ownerId = employee.ownerId;
    req.permissions = employee.permissions;
    req.assignedPropertyIds = employee.assignedProperties.map(p => p._id);

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

// Check if employee has specific permission for a resource
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.isEmployee) {
      return next();
    }

    const resourcePermissions = req.permissions[resource];
    if (!resourcePermissions || !resourcePermissions[action]) {
      return res.status(403).json({
        message: `Permission denied: You don't have ${action} access to ${resource}`
      });
    }

    next();
  };
};

// Check if employee has access to a specific property
const checkPropertyAccess = (req, res, next) => {
  if (!req.isEmployee) {
    return next();
  }

  const propertyId = req.params.propertyId || req.body.propertyId || req.query.propertyId;

  if (propertyId) {
    const hasAccess = req.assignedPropertyIds.some(
      id => id.toString() === propertyId.toString()
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Permission denied: You do not have access to this property'
      });
    }
  }

  next();
};

module.exports = { protectEmployee, requirePermission, checkPropertyAccess };
