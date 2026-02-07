const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Property = require('../models/Property');

const PERMISSION_DEFAULTS = {
  tenants: { view: false, add: false, edit: false, delete: false },
  rooms: { view: false, add: false, edit: false, delete: false },
  payments: { view: false, add: false, edit: false, delete: false },
  properties: { view: false, add: false, edit: false, delete: false },
  buildings: { view: false, add: false, edit: false, delete: false },
};

const toPlain = (value) => {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  return value;
};

const mergePermissions = (existingPermissions = {}, incomingPermissions = {}) => {
  const base = toPlain(existingPermissions);

  return {
    tenants: { ...PERMISSION_DEFAULTS.tenants, ...(toPlain(base.tenants) || {}), ...(incomingPermissions.tenants || {}) },
    rooms: { ...PERMISSION_DEFAULTS.rooms, ...(toPlain(base.rooms) || {}), ...(incomingPermissions.rooms || {}) },
    payments: { ...PERMISSION_DEFAULTS.payments, ...(toPlain(base.payments) || {}), ...(incomingPermissions.payments || {}) },
    properties: { ...PERMISSION_DEFAULTS.properties, ...(toPlain(base.properties) || {}), ...(incomingPermissions.properties || {}) },
    buildings: { ...PERMISSION_DEFAULTS.buildings, ...(toPlain(base.buildings) || {}), ...(incomingPermissions.buildings || {}) },
  };
};

// Get all employees for current owner
exports.getAllEmployees = async (req, res) => {
  try {
    const filter = { ownerId: req.user._id };

    const employees = await Employee.find(filter)
      .select('-password')
      .populate('assignedProperties', 'name location propertyType')
      .sort({ createdAt: -1 });

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single employee
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }

    const employee = await Employee.findById(id)
      .select('-password')
      .populate('assignedProperties', 'name location propertyType');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check ownership
    if (employee.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this employee' });
    }

    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create employee
exports.createEmployee = async (req, res) => {
  try {
    const { email, mobile, password, fullName, isActive, assignedProperties, permissions } = req.body;

    // Validation
    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide employee name' });
    }

    if (!email && !mobile) {
      return res.status(400).json({ success: false, message: 'Please provide email or mobile number' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Please provide valid email address' });
      }
    }

    if (mobile && mobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide valid 10-digit mobile number' });
    }

    // Check for duplicate email/mobile within the same owner
    const existingEmployee = await Employee.findOne({
      ownerId: req.user._id,
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(mobile ? [{ mobile }] : []),
      ]
    });

    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Employee with this email or mobile already exists' });
    }

    // Validate assigned properties belong to the owner
    if (assignedProperties && assignedProperties.length > 0) {
      const validProperties = await Property.find({
        _id: { $in: assignedProperties },
        userId: req.user._id,
      });

      if (validProperties.length !== assignedProperties.length) {
        return res.status(400).json({ success: false, message: 'Some assigned properties are invalid' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employeeData = {
      ownerId: req.user._id,
      email: email ? email.toLowerCase() : undefined,
      mobile: mobile || undefined,
      password: hashedPassword,
      fullName: fullName.trim(),
      isActive: isActive !== undefined ? isActive : true,
      assignedProperties: assignedProperties || [],
      permissions: permissions || {
        tenants: { view: false, add: false, edit: false, delete: false },
        rooms: { view: false, add: false, edit: false, delete: false },
        payments: { view: false, add: false, edit: false, delete: false },
        properties: { view: false, add: false, edit: false, delete: false },
        buildings: { view: false, add: false, edit: false, delete: false },
      },
    };

    const employee = await Employee.create(employeeData);

    const populatedEmployee = await Employee.findById(employee._id)
      .select('-password')
      .populate('assignedProperties', 'name location propertyType');

    res.status(201).json({ success: true, data: populatedEmployee });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Employee with this email or mobile already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, mobile, fullName, isActive, password, assignedProperties, permissions } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check ownership
    if (employee.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this employee' });
    }

    // Validation
    if (fullName !== undefined && (typeof fullName !== 'string' || fullName.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Please provide valid employee name' });
    }

    if (email !== undefined && email !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Please provide valid email address' });
      }
    }

    if (mobile !== undefined && mobile !== '' && mobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide valid 10-digit mobile number' });
    }

    // Validate assigned properties belong to owner
    if (assignedProperties !== undefined) {
      if (!Array.isArray(assignedProperties)) {
        return res.status(400).json({ success: false, message: 'assignedProperties must be an array' });
      }

      if (assignedProperties.length > 0) {
        const validProperties = await Property.find({
          _id: { $in: assignedProperties },
          userId: req.user._id,
        }).select('_id');

        if (validProperties.length !== assignedProperties.length) {
          return res.status(400).json({ success: false, message: 'Some assigned properties are invalid' });
        }
      }
    }

    if (permissions !== undefined && typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'permissions must be an object' });
    }

    // Check for duplicate email/mobile
    if (email || mobile) {
      const duplicateQuery = {
        _id: { $ne: id },
        ownerId: req.user._id,
        $or: [],
      };

      if (email) duplicateQuery.$or.push({ email: email.toLowerCase() });
      if (mobile) duplicateQuery.$or.push({ mobile });

      if (duplicateQuery.$or.length > 0) {
        const existingEmployee = await Employee.findOne(duplicateQuery);
        if (existingEmployee) {
          return res.status(400).json({ success: false, message: 'Employee with this email or mobile already exists' });
        }
      }
    }

    const updateData = {
      ...(fullName !== undefined && { fullName: fullName.trim() }),
      ...(email !== undefined && { email: email ? email.toLowerCase() : undefined }),
      ...(mobile !== undefined && { mobile: mobile || undefined }),
      ...(isActive !== undefined && { isActive }),
      ...(assignedProperties !== undefined && { assignedProperties }),
    };

    if (permissions !== undefined) {
      updateData.permissions = mergePermissions(employee.permissions, permissions || {});
    }

    // Update password if provided
    if (password && password.length >= 4) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .select('-password')
      .populate('assignedProperties', 'name location propertyType');

    res.status(200).json({ success: true, data: updatedEmployee });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Employee with this email or mobile already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check ownership
    if (employee.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this employee' });
    }

    await Employee.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update employee permissions
exports.updatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check ownership
    if (employee.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this employee' });
    }

    if (!permissions) {
      return res.status(400).json({ success: false, message: 'Please provide permissions' });
    }

    // Merge permissions
    const updatedPermissions = mergePermissions(employee.permissions, permissions);

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { permissions: updatedPermissions },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('assignedProperties', 'name location propertyType');

    res.status(200).json({ success: true, data: updatedEmployee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Assign properties to employee
exports.assignProperties = async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID format' });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check ownership
    if (employee.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this employee' });
    }

    // Validate properties belong to the owner
    if (propertyIds && propertyIds.length > 0) {
      const validProperties = await Property.find({
        _id: { $in: propertyIds },
        userId: req.user._id,
      });

      if (validProperties.length !== propertyIds.length) {
        return res.status(400).json({ success: false, message: 'Some properties are invalid or do not belong to you' });
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { assignedProperties: propertyIds || [] },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('assignedProperties', 'name location propertyType');

    res.status(200).json({ success: true, data: updatedEmployee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
