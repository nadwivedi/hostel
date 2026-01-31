const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

// Get all tenants (filtered by user, all for admin)
exports.getAllTenants = async (req, res) => {
  try {
    const { propertyId, locationId, status } = req.query;
    const filter = req.isAdmin ? {} : { userId: req.user._id };

    // Accept both propertyId and locationId as aliases
    const propId = propertyId || locationId;
    if (propId) {
      // Find rooms belonging to this property to also match tenants by roomId
      const propertyRooms = await Room.find({ propertyId: propId }).select('_id');
      const roomIds = propertyRooms.map(r => r._id);

      // Match tenants by propertyId OR by roomId belonging to this property
      filter.$or = [
        { propertyId: propId },
        { roomId: { $in: roomIds } }
      ];
    }
    if (status) filter.status = status;

    const tenants = await Tenant.find(filter)
      .populate('propertyId', 'name location propertyType')
      .populate({
        path: 'roomId',
        select: 'roomNumber floor rentType rentAmount propertyId',
        populate: {
          path: 'propertyId',
          select: 'name location propertyType'
        }
      })
      .sort({ createdAt: -1 });
    res.status(200).json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single tenant
exports.getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('propertyId', 'name location propertyType')
      .populate('roomId', 'roomNumber floor rentType rentAmount beds');
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
    const {
      name, mobile, email, adharNo, adharImg, photo, dob, gender,
      propertyId, locationId, roomId, bedNumber, rentAmount, advanceAmount, joiningDate, notes
    } = req.body;

    // Accept both propertyId and locationId
    const actualPropertyId = propertyId || locationId;

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

    // Calculate advanceLeft if room is assigned
    const advance = advanceAmount || 0;
    const rent = rentAmount || 0;
    const advanceLeft = advance > 0 && rent > 0 ? advance - rent : 0;

    const tenantData = {
      name: name.trim(),
      mobile,
      email: email || '',
      adharNo: adharNo || '',
      adharImg: adharImg || '',
      photo: photo || '',
      dob: dob || undefined,
      gender: gender || undefined,
      joiningDate: joiningDate || new Date(),
      userId: req.isAdmin ? req.body.userId : req.user._id,
      // Occupancy fields
      propertyId: actualPropertyId || undefined,
      roomId: roomId || undefined,
      bedNumber: bedNumber || null,
      rentAmount: rent || undefined,
      advanceAmount: advance,
      advanceLeft: advanceLeft > 0 ? advanceLeft : 0,
      status: 'ACTIVE',
      notes: notes || '',
    };

    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ success: false, message: 'userId is required when admin creates a tenant' });
    }

    const tenant = await Tenant.create(tenantData);

    // Update room/bed status if room is assigned
    if (roomId) {
      const room = await Room.findById(roomId);
      if (room) {
        if (bedNumber) {
          const bed = room.beds.find(b => b.bedNumber === bedNumber);
          if (bed) {
            bed.status = 'OCCUPIED';
          }
        } else {
          room.status = 'OCCUPIED';
        }
        await room.save();
      }

      // Auto-create payment for the joining month and next month
      const joinDateObj = new Date(tenantData.joiningDate);
      const paymentMonth = joinDateObj.getMonth() + 1; // 1-12
      const paymentYear = joinDateObj.getFullYear();
      const dueDay = joinDateObj.getDate();

      // Check if payment already exists
      const existingPayment = await Payment.findOne({
        tenantId: tenant._id,
        month: paymentMonth,
        year: paymentYear,
      });

      if (!existingPayment && rent > 0) {
        // Create first month payment (joining month) - marked as PAID from advance
        const firstMonthDueDate = new Date(paymentYear, paymentMonth - 1, dueDay);

        await Payment.create({
          userId: tenantData.userId,
          tenantId: tenant._id,
          month: paymentMonth,
          year: paymentYear,
          rentAmount: rent,
          amountPaid: rent,
          dueDate: firstMonthDueDate,
          paymentDate: new Date(tenantData.joiningDate),
          status: 'PAID',
        });

        // Next month payment will be auto-created by cron job 4 days before due date
        console.log(`Created first month payment for tenant ${tenant.name}. Next payment will be created by cron job.`);
      }
    }

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate('propertyId', 'name location propertyType')
      .populate('roomId', 'roomNumber floor rentType rentAmount');

    res.status(201).json({ success: true, data: populatedTenant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update tenant
exports.updateTenant = async (req, res) => {
  try {
    const {
      userId, name, mobile, email, adharNo, adharImg, photo, dob, gender,
      propertyId, roomId, bedNumber, rentAmount, advanceAmount, joiningDate, leaveDate, status, notes
    } = req.body;
    const tenantId = req.params.id;

    if (!userId || userId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID format' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (!req.isAdmin && tenant.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this tenant' });
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Please provide valid tenant name' });
    }

    if (mobile !== undefined && (typeof mobile !== 'string' || mobile.length !== 10)) {
      return res.status(400).json({ success: false, message: 'Please provide valid 10-digit mobile number' });
    }

    if (email !== undefined && email !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Please provide valid email address' });
      }
    }

    if (adharNo !== undefined && adharNo !== '' && adharNo.length !== 12) {
      return res.status(400).json({ success: false, message: 'Please provide valid 12-digit Aadhar number' });
    }

    if (gender !== undefined && gender !== '' && !['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Gender must be Male or Female' });
    }

    if (status !== undefined && !['ACTIVE', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or COMPLETED' });
    }

    // Handle status change to COMPLETED - free up room/bed
    if (status === 'COMPLETED' && tenant.status !== 'COMPLETED' && tenant.roomId) {
      const room = await Room.findById(tenant.roomId);
      if (room) {
        if (tenant.bedNumber) {
          const bed = room.beds.find(b => b.bedNumber === tenant.bedNumber);
          if (bed) {
            bed.status = 'AVAILABLE';
          }
        } else {
          room.status = 'AVAILABLE';
        }
        await room.save();
      }
    }

    const updateData = {
      ...(name !== undefined && { name: name.trim() }),
      ...(mobile !== undefined && { mobile }),
      ...(email !== undefined && { email: email || '' }),
      ...(adharNo !== undefined && { adharNo: adharNo || '' }),
      ...(adharImg !== undefined && { adharImg: adharImg || '' }),
      ...(photo !== undefined && { photo: photo || '' }),
      ...(dob !== undefined && { dob: dob || undefined }),
      ...(gender !== undefined && { gender: gender || undefined }),
      ...(propertyId !== undefined && { propertyId: propertyId || null }),
      ...(roomId !== undefined && { roomId: roomId || null }),
      ...(bedNumber !== undefined && { bedNumber: bedNumber || null }),
      ...(rentAmount !== undefined && { rentAmount }),
      ...(advanceAmount !== undefined && { advanceAmount }),
      ...(joiningDate !== undefined && { joiningDate }),
      ...(leaveDate !== undefined && { leaveDate }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    };

    // Recalculate advanceLeft if rentAmount or advanceAmount changed
    if (rentAmount !== undefined || advanceAmount !== undefined) {
      const newRent = rentAmount !== undefined ? rentAmount : tenant.rentAmount;
      const newAdvance = advanceAmount !== undefined ? advanceAmount : tenant.advanceAmount;
      const newAdvanceLeft = newAdvance - newRent;
      updateData.advanceLeft = newAdvanceLeft > 0 ? newAdvanceLeft : 0;
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(tenantId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('propertyId', 'name location propertyType')
      .populate('roomId', 'roomNumber floor rentType rentAmount');

    res.status(200).json({ success: true, data: updatedTenant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete tenant
exports.deleteTenant = async (req, res) => {
  try {
    const { userId } = req.body;
    const tenantId = req.params.id;

    if (!userId || userId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID format' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && tenant.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this tenant' });
    }

    // Free up room/bed if tenant had one assigned
    if (tenant.roomId) {
      const room = await Room.findById(tenant.roomId);
      if (room) {
        if (tenant.bedNumber) {
          const bed = room.beds.find(b => b.bedNumber === tenant.bedNumber);
          if (bed) {
            bed.status = 'AVAILABLE';
          }
        } else {
          room.status = 'AVAILABLE';
        }
        await room.save();
      }
    }

    await Tenant.findByIdAndDelete(tenantId);
    res.status(200).json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
