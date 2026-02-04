const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Generate JWT token for employee
const generateToken = (employeeId) => {
  return jwt.sign(
    { employeeId, isEmployee: true },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Employee login
exports.login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Please provide login ID and password' });
    }

    // Find employee by email or mobile
    const employee = await Employee.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { mobile: loginId }
      ]
    }).populate('assignedProperties', '_id name location');

    if (!employee) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!employee.isActive) {
      return res.status(401).json({ message: 'Account is inactive. Please contact your administrator.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(employee._id);

    // Set cookie
    res.cookie('employeeToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return employee data without password
    const employeeData = {
      _id: employee._id,
      email: employee.email,
      mobile: employee.mobile,
      fullName: employee.fullName,
      isActive: employee.isActive,
      assignedProperties: employee.assignedProperties,
      permissions: employee.permissions,
    };

    res.json({
      message: 'Login successful',
      employee: employeeData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Employee logout
exports.logout = async (req, res) => {
  try {
    res.cookie('employeeToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: new Date(0),
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current employee profile
exports.getCurrentEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee._id)
      .select('-password')
      .populate('assignedProperties', '_id name location propertyType');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }

    const employee = await Employee.findById(req.employee._id);

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, employee.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);
    await employee.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
