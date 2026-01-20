const Tenant = require('../models/Tenant');

// Get all tenants (filtered by user, all for admin)
exports.getAllTenants = async (req, res) => {
  try {
    const filter = req.isAdmin ? {} : { userId: req.user._id };
    const tenants = await Tenant.find(filter).sort({ createdAt: -1 });
    res.status(200).json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single tenant
exports.getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && tenant.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this tenant' });
    }

    res.status(200).json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create tenant
exports.createTenant = async (req, res) => {
  try {
    const { name, mobile, email, adharNo, adharImg, photo, dob, gender } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide tenant name' });
    }

    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide valid 10-digit mobile number' });
    }

    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Please provide valid email address' });
      }
    }

    if (adharNo && adharNo.length !== 12) {
      return res.status(400).json({ success: false, message: 'Please provide valid 12-digit Aadhar number' });
    }

    if (gender && gender !== '' && !['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Gender must be Male or Female' });
    }

    const tenantData = {
      name: name.trim(),
      mobile,
      email: email || '',
      adharNo: adharNo || '',
      adharImg: adharImg || '',
      photo: photo || '',
      dob: dob || undefined,
      gender: gender || undefined,
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ success: false, message: 'userId is required when admin creates a tenant' });
    }

    const tenant = await Tenant.create(tenantData);
    res.status(201).json({ success: true, data: tenant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update tenant
exports.updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && tenant.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this tenant' });
    }

    // Don't allow changing userId
    const { userId, ...updateData } = req.body;

    const updatedTenant = await Tenant.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updatedTenant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete tenant
exports.deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && tenant.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this tenant' });
    }

    await Tenant.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
