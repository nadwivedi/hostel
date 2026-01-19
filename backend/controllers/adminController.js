const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, mobile, password, fullName, superAdmin } = req.body;

    if (!email || !mobile || !password || !fullName) {
      return res.status(400).json({ message: 'Email, mobile, password, and full name are required' });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { mobile }],
    });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists with this email or mobile' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      email,
      mobile,
      password: hashedPassword,
      fullName,
    });

    const token = jwt.sign(
      { adminId: admin._id, isAdmin: true, superAdmin: admin.superAdmin },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        mobile: admin.mobile,
        fullName: admin.fullName,
        superAdmin: admin.superAdmin,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Email/mobile and password are required' });
    }

    const admin = await Admin.findOne({
      $or: [{ email: loginId }, { mobile: loginId }],
    });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    const token = jwt.sign(
      { adminId: admin._id, isAdmin: true, superAdmin: admin.superAdmin },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Login successful',
      admin: {
        id: admin._id,
        email: admin.email,
        mobile: admin.mobile,
        fullName: admin.fullName,
        superAdmin: admin.superAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCurrentAdmin = async (req, res) => {
  try {
    res.status(200).json({
      admin: {
        id: req.admin._id,
        email: req.admin.email,
        mobile: req.admin.mobile,
        fullName: req.admin.fullName,
        superAdmin: req.admin.superAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};