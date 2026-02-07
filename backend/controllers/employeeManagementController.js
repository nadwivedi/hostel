const mongoose = require('mongoose');
const Property = require('../models/Property');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Building = require('../models/Building');
const Payment = require('../models/Payment');

const hasAssignedProperty = (req, propertyId) =>
  req.assignedPropertyIds.some((id) => id.toString() === propertyId.toString());

const getManagedProperty = async (req, propertyId) => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    return null;
  }

  const property = await Property.findOne({
    _id: propertyId,
    userId: req.ownerId,
  });

  if (!property) {
    return null;
  }

  if (!hasAssignedProperty(req, property._id)) {
    return 'forbidden';
  }

  return property;
};

const getManagedRoom = async (req, roomId) => {
  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return null;
  }

  const room = await Room.findOne({
    _id: roomId,
    userId: req.ownerId,
  });

  if (!room) {
    return null;
  }

  if (!room.propertyId || !hasAssignedProperty(req, room.propertyId)) {
    return 'forbidden';
  }

  return room;
};

const freeRoomForTenant = async (tenant) => {
  if (!tenant.roomId) return;

  const room = await Room.findById(tenant.roomId);
  if (!room) return;

  if (tenant.bedNumber) {
    const bed = room.beds.find((b) => b.bedNumber === tenant.bedNumber);
    if (bed) {
      bed.status = 'AVAILABLE';
    }

    const occupiedBeds = room.beds.filter((b) => b.status === 'OCCUPIED').length;
    room.status = occupiedBeds > 0 ? 'OCCUPIED' : 'AVAILABLE';
  } else {
    const otherActiveTenants = await Tenant.countDocuments({
      roomId: room._id,
      status: 'ACTIVE',
      _id: { $ne: tenant._id },
    });
    if (otherActiveTenants === 0) {
      room.status = 'AVAILABLE';
    }
  }

  await room.save();
};

const occupyRoomForTenant = async (room, bedNumber) => {
  if (room.rentType === 'PER_BED') {
    const bed = room.beds.find((b) => b.bedNumber === bedNumber);
    if (!bed) {
      throw new Error('Selected bed not found');
    }
    if (bed.status !== 'AVAILABLE') {
      throw new Error('Selected bed is already occupied');
    }
    bed.status = 'OCCUPIED';
    room.status = 'OCCUPIED';
    await room.save();
    return;
  }

  const activeCount = await Tenant.countDocuments({
    roomId: room._id,
    status: 'ACTIVE',
  });
  if (activeCount > 0 || room.status === 'OCCUPIED') {
    throw new Error('Room is already occupied');
  }

  room.status = 'OCCUPIED';
  await room.save();
};

exports.getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      userId: req.ownerId,
      _id: { $in: req.assignedPropertyIds },
    }).sort({ name: 1 });

    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyPropertyById = async (req, res) => {
  try {
    const property = await getManagedProperty(req, req.params.propertyId);

    if (property === 'forbidden') {
      return res.status(403).json({ message: 'No access to this property' });
    }

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPropertyRooms = async (req, res) => {
  try {
    const property = await getManagedProperty(req, req.params.propertyId);
    if (property === 'forbidden') {
      return res.status(403).json({ message: 'No access to this property' });
    }
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const filter = { userId: req.ownerId, propertyId: property._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.buildingId) filter.buildingId = req.query.buildingId;

    const rooms = await Room.find(filter)
      .populate('propertyId', 'name location propertyType')
      .populate('buildingId', 'name')
      .sort({ roomNumber: 1 });

    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPropertyBuildings = async (req, res) => {
  try {
    const property = await getManagedProperty(req, req.params.propertyId);
    if (property === 'forbidden') {
      return res.status(403).json({ message: 'No access to this property' });
    }
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const buildings = await Building.find({
      propertyId: property._id,
      userId: req.ownerId,
    })
      .populate('propertyId', 'name')
      .sort({ name: 1 });

    res.status(200).json(buildings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPropertyTenants = async (req, res) => {
  try {
    const property = await getManagedProperty(req, req.params.propertyId);
    if (property === 'forbidden') {
      return res.status(403).json({ message: 'No access to this property' });
    }
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const filter = {
      userId: req.ownerId,
      propertyId: property._id,
    };
    if (req.query.status) filter.status = req.query.status;

    const tenants = await Tenant.find(filter)
      .populate('propertyId', 'name location propertyType')
      .populate({
        path: 'roomId',
        select: 'roomNumber floor rentType rentAmount beds propertyId',
        populate: { path: 'propertyId', select: 'name location propertyType' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTenant = async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      adharNo,
      adharImg,
      photo,
      dob,
      gender,
      propertyId,
      roomId,
      bedNumber,
      rentAmount,
      advanceAmount,
      joiningDate,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide tenant name' });
    }
    if (!mobile || String(mobile).length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide valid 10-digit mobile number' });
    }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Please provide valid email address' });
      }
    }
    if (adharNo && String(adharNo).length !== 12) {
      return res.status(400).json({ success: false, message: 'Please provide valid 12-digit Aadhar number' });
    }
    if (gender && !['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Gender must be Male or Female' });
    }

    const targetPropertyId = propertyId;
    if (!targetPropertyId) {
      return res.status(400).json({ success: false, message: 'propertyId is required' });
    }

    const property = await getManagedProperty(req, targetPropertyId);
    if (property === 'forbidden') {
      return res.status(403).json({ success: false, message: 'No access to this property' });
    }
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    let room = null;
    if (roomId) {
      room = await getManagedRoom(req, roomId);
      if (room === 'forbidden') {
        return res.status(403).json({ success: false, message: 'No access to this room' });
      }
      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
      }
      if (room.propertyId.toString() !== property._id.toString()) {
        return res.status(400).json({ success: false, message: 'Room does not belong to selected property' });
      }

      try {
        await occupyRoomForTenant(room, bedNumber);
      } catch (occupyError) {
        return res.status(400).json({ success: false, message: occupyError.message });
      }
    }

    const advance = Number(advanceAmount) || 0;
    const rent = Number(rentAmount) || room?.rentAmount || 0;
    const tenantData = {
      userId: req.ownerId,
      name: name.trim(),
      mobile: String(mobile),
      email: email || '',
      adharNo: adharNo || '',
      adharImg: adharImg || '',
      photo: photo || '',
      dob: dob || undefined,
      gender: gender || undefined,
      propertyId: property._id,
      roomId: room?._id || undefined,
      bedNumber: bedNumber || null,
      rentAmount: rent || undefined,
      advanceAmount: advance,
      advanceLeft: advance > 0 && rent > 0 ? Math.max(0, advance - rent) : 0,
      joiningDate: joiningDate || new Date(),
      status: 'ACTIVE',
      notes: notes || '',
    };

    const tenant = await Tenant.create(tenantData);

    if (room && rent > 0) {
      const joinDateObj = new Date(tenantData.joiningDate);
      const paymentMonth = joinDateObj.getMonth() + 1;
      const paymentYear = joinDateObj.getFullYear();
      const dueDay = joinDateObj.getDate();

      const existingPayment = await Payment.findOne({
        tenantId: tenant._id,
        month: paymentMonth,
        year: paymentYear,
      });

      if (!existingPayment) {
        const dueDate = new Date(paymentYear, paymentMonth - 1, dueDay);
        await Payment.create({
          userId: req.ownerId,
          tenantId: tenant._id,
          month: paymentMonth,
          year: paymentYear,
          rentAmount: rent,
          amountPaid: rent,
          dueDate,
          paymentDate: new Date(tenantData.joiningDate),
          status: 'PAID',
        });
      }
    }

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate('propertyId', 'name location propertyType')
      .populate('roomId', 'roomNumber floor rentType rentAmount beds');

    res.status(201).json({ success: true, data: populatedTenant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID format' });
    }

    const tenant = await Tenant.findOne({ _id: tenantId, userId: req.ownerId });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    if (!tenant.propertyId || !hasAssignedProperty(req, tenant.propertyId)) {
      return res.status(403).json({ success: false, message: 'No access to this tenant' });
    }

    const {
      name,
      mobile,
      email,
      adharNo,
      adharImg,
      photo,
      dob,
      gender,
      roomId,
      bedNumber,
      rentAmount,
      advanceAmount,
      joiningDate,
      leaveDate,
      notes,
    } = req.body;

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Please provide valid tenant name' });
    }
    if (mobile !== undefined && String(mobile).length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide valid 10-digit mobile number' });
    }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Please provide valid email address' });
      }
    }
    if (adharNo && String(adharNo).length !== 12) {
      return res.status(400).json({ success: false, message: 'Please provide valid 12-digit Aadhar number' });
    }
    if (gender !== undefined && gender !== '' && !['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Gender must be Male or Female' });
    }

    const incomingRoomId = roomId === undefined ? tenant.roomId?.toString() : roomId;
    const roomChanged = String(tenant.roomId || '') !== String(incomingRoomId || '');
    const bedChanged = String(tenant.bedNumber || '') !== String(bedNumber || '');

    let nextRoom = null;
    if (incomingRoomId) {
      nextRoom = await getManagedRoom(req, incomingRoomId);
      if (nextRoom === 'forbidden') {
        return res.status(403).json({ success: false, message: 'No access to selected room' });
      }
      if (!nextRoom) {
        return res.status(404).json({ success: false, message: 'Selected room not found' });
      }
      if (nextRoom.propertyId.toString() !== tenant.propertyId.toString()) {
        return res.status(400).json({ success: false, message: 'Selected room must belong to tenant property' });
      }
    }

    if (roomChanged || bedChanged) {
      await freeRoomForTenant(tenant);
      if (nextRoom) {
        try {
          await occupyRoomForTenant(nextRoom, bedNumber);
        } catch (occupyError) {
          return res.status(400).json({ success: false, message: occupyError.message });
        }
      }
    }

    const updateData = {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(mobile !== undefined && { mobile: String(mobile) }),
      ...(email !== undefined && { email: email || '' }),
      ...(adharNo !== undefined && { adharNo: adharNo || '' }),
      ...(adharImg !== undefined && { adharImg: adharImg || '' }),
      ...(photo !== undefined && { photo: photo || '' }),
      ...(dob !== undefined && { dob: dob || undefined }),
      ...(gender !== undefined && { gender: gender || undefined }),
      ...(roomId !== undefined && { roomId: roomId || null }),
      ...(bedNumber !== undefined && { bedNumber: bedNumber || null }),
      ...(rentAmount !== undefined && { rentAmount: Number(rentAmount) || 0 }),
      ...(advanceAmount !== undefined && { advanceAmount: Number(advanceAmount) || 0 }),
      ...(joiningDate !== undefined && { joiningDate }),
      ...(leaveDate !== undefined && { leaveDate }),
      ...(notes !== undefined && { notes: notes || '' }),
    };

    if (rentAmount !== undefined || advanceAmount !== undefined) {
      const newRent = rentAmount !== undefined ? Number(rentAmount) || 0 : tenant.rentAmount || 0;
      const newAdvance = advanceAmount !== undefined ? Number(advanceAmount) || 0 : tenant.advanceAmount || 0;
      updateData.advanceLeft = Math.max(0, newAdvance - newRent);
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(tenantId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('propertyId', 'name location propertyType')
      .populate('roomId', 'roomNumber floor rentType rentAmount beds');

    res.status(200).json({ success: true, data: updatedTenant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.markTenantLeft = async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID format' });
    }

    const tenant = await Tenant.findOne({ _id: tenantId, userId: req.ownerId });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    if (!tenant.propertyId || !hasAssignedProperty(req, tenant.propertyId)) {
      return res.status(403).json({ success: false, message: 'No access to this tenant' });
    }

    if (tenant.status !== 'COMPLETED') {
      await freeRoomForTenant(tenant);
    }

    tenant.status = 'COMPLETED';
    tenant.leaveDate = req.body.leaveDate || new Date();
    await tenant.save();

    res.status(200).json({ success: true, data: tenant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID format' });
    }

    const tenant = await Tenant.findOne({ _id: tenantId, userId: req.ownerId });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    if (!tenant.propertyId || !hasAssignedProperty(req, tenant.propertyId)) {
      return res.status(403).json({ success: false, message: 'No access to this tenant' });
    }

    await freeRoomForTenant(tenant);
    await Tenant.findByIdAndDelete(tenantId);

    res.status(200).json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markRoomEmpty = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await getManagedRoom(req, roomId);

    if (room === 'forbidden') {
      return res.status(403).json({ success: false, message: 'No access to this room' });
    }
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const activeTenants = await Tenant.find({
      userId: req.ownerId,
      roomId: room._id,
      status: 'ACTIVE',
    });

    const leaveDate = req.body.leaveDate || new Date();
    await Tenant.updateMany(
      { _id: { $in: activeTenants.map((t) => t._id) } },
      { $set: { status: 'COMPLETED', leaveDate } }
    );

    room.status = 'AVAILABLE';
    if (room.rentType === 'PER_BED' && Array.isArray(room.beds)) {
      room.beds = room.beds.map((b) => ({ ...b.toObject(), status: 'AVAILABLE' }));
    }
    await room.save();

    res.status(200).json({
      success: true,
      message: 'Room marked as empty successfully',
      updatedTenants: activeTenants.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
