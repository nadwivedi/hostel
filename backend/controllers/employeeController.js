const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');

// GET /api/employees — list all employees for the logged-in owner
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ ownerId: req.user._id })
      .select('-password')
      .populate('assignedProperties', '_id name location')
      .sort({ createdAt: -1 });

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/employees — create a new employee
exports.createEmployee = async (req, res) => {
  try {
    const { fullName, email, mobile, password, isActive, assignedProperties, permissions } = req.body;

    if (!fullName?.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!email && !mobile) {
      return res.status(400).json({ message: 'Email or mobile number is required' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    // Check duplicate email/mobile within the same owner's employees
    if (email) {
      const existing = await Employee.findOne({ ownerId: req.user._id, email: email.toLowerCase() });
      if (existing) return res.status(400).json({ message: 'Employee with this email already exists' });
    }
    if (mobile) {
      const existing = await Employee.findOne({ ownerId: req.user._id, mobile });
      if (existing) return res.status(400).json({ message: 'Employee with this mobile already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await Employee.create({
      ownerId: req.user._id,
      fullName: fullName.trim(),
      email: email ? email.toLowerCase() : null,
      mobile: mobile || null,
      password: hashedPassword,
      isActive: isActive !== undefined ? isActive : true,
      assignedProperties: assignedProperties || [],
      permissions: permissions || {},
    });

    const populated = await Employee.findById(employee._id)
      .select('-password')
      .populate('assignedProperties', '_id name location');

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PATCH /api/employees/:id — update employee
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, ownerId: req.user._id });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const { fullName, email, mobile, password, isActive, assignedProperties, permissions } = req.body;

    if (fullName !== undefined) employee.fullName = fullName.trim();
    if (email !== undefined) employee.email = email ? email.toLowerCase() : null;
    if (mobile !== undefined) employee.mobile = mobile || null;
    if (isActive !== undefined) employee.isActive = isActive;
    if (assignedProperties !== undefined) employee.assignedProperties = assignedProperties;
    if (permissions !== undefined) employee.permissions = permissions;

    // Only update password if provided
    if (password && password.trim().length >= 4) {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(password, salt);
    }

    await employee.save();

    const updated = await Employee.findById(employee._id)
      .select('-password')
      .populate('assignedProperties', '_id name location');

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/employees/:id — delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
