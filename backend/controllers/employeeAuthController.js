const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// POST /api/employees/auth/login
exports.login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Login ID and password are required' });
    }

    // Find employee by email or mobile
    const employee = await Employee.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { mobile: loginId },
      ],
    }).populate('assignedProperties', '_id name');

    if (!employee) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!employee.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated. Contact your manager.' });
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        employeeId: employee._id,
        ownerId: employee.ownerId,
        isEmployee: true,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('employeeToken', token, COOKIE_OPTIONS);

    res.status(200).json({
      message: 'Login successful',
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        email: employee.email,
        mobile: employee.mobile,
        isEmployee: true,
        permissions: employee.permissions,
        assignedProperties: employee.assignedProperties,
        ownerId: employee.ownerId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/employees/auth/logout
exports.logout = async (req, res) => {
  try {
    res.clearCookie('employeeToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/employees/auth/me  (requires protectEmployee middleware)
exports.me = async (req, res) => {
  try {
    const employee = req.employee;

    res.status(200).json({
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        email: employee.email,
        mobile: employee.mobile,
        isEmployee: true,
        permissions: employee.permissions,
        assignedProperties: employee.assignedProperties,
        ownerId: employee.ownerId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
