const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Unified protect middleware.
 * Accepts both owner token (cookie: token) and employee token (cookie: employeeToken).
 * Sets req.user, req.isEmployee, req.ownerId, req.permissions, req.assignedPropertyIds.
 */
const protect = async (req, res, next) => {
  try {
    // ── Try employee token first ───────────────────────────────────────────
    const employeeToken = req.cookies.employeeToken;
    if (employeeToken) {
      try {
        const decoded = jwt.verify(employeeToken, JWT_SECRET);
        if (decoded.isEmployee) {
          const employee = await Employee.findById(decoded.employeeId)
            .select('-password')
            .populate('assignedProperties', '_id name');

          if (employee && employee.isActive) {
            req.employee          = employee;
            req.isEmployee        = true;
            req.ownerId           = employee.ownerId;
            req.permissions       = employee.permissions;
            req.assignedPropertyIds = employee.assignedProperties.map(p => p._id);
            // Set req.user so controllers that use req.user._id still work
            req.user = { _id: employee.ownerId };
            return next();
          }
        }
      } catch (e) {
        // Invalid employee token — fall through and try owner token
      }
    }

    // ── Try owner token ────────────────────────────────────────────────────
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.isAdmin) {
          return res.status(403).json({ message: 'Not authorized, user access required' });
        }

        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return res.status(401).json({ message: 'Not authorized, user not found' });
        if (!user.isActive) return res.status(401).json({ message: 'User account is inactive' });

        req.user       = user;
        req.isEmployee = false;
        req.ownerId    = user._id;
        return next();
      } catch (e) {
        if (e.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired, please log in again' });
        }
        return res.status(401).json({ message: 'Invalid token' });
      }
    }

    return res.status(401).json({ message: 'Not authorized, no token provided' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { protect };
