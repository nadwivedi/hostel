const mongoose = require('mongoose');
const Room = require('../models/Room');

// Get all rooms (filtered by user, all for admin)
exports.getAllRooms = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = req.isAdmin ? {} : { userId: req.user._id };
    if (status) filter.status = status;

    const rooms = await Room.find(filter).sort({ roomNumber: 1 });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single room
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && room.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this room' });
    }

    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create room
exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, floor, rentType, rentAmount, capacity, beds } = req.body;

    if (!roomNumber || roomNumber.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide room number' });
    }

    if (!rentAmount || isNaN(rentAmount) || rentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid rent amount' });
    }

    if (!capacity || isNaN(capacity) || capacity <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid room capacity' });
    }

    if (rentType && !['PER_ROOM', 'PER_BED'].includes(rentType)) {
      return res.status(400).json({ success: false, message: 'Rent type must be PER_ROOM or PER_BED' });
    }

    if (rentType === 'PER_BED' && (!beds || !Array.isArray(beds) || beds.length === 0)) {
      return res.status(400).json({ success: false, message: 'Please provide beds for PER_BED room type' });
    }

    if (rentType === 'PER_BED' && beds && beds.length > capacity) {
      return res.status(400).json({ success: false, message: 'Number of beds cannot exceed room capacity' });
    }

    const roomData = {
      roomNumber: roomNumber.trim(),
      floor: floor || 1,
      rentType: rentType || 'PER_ROOM',
      rentAmount,
      capacity,
      beds: rentType === 'PER_BED' ? beds : [],
      status: 'AVAILABLE',
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ success: false, message: 'userId is required when admin creates a room' });
    }

    const room = await Room.create(roomData);
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update room
exports.updateRoom = async (req, res) => {
  try {
    const { userId, roomNumber, floor, rentType, rentAmount, capacity, status } = req.body;
    const roomId = req.params.id;

    if (!userId || userId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID format' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!req.isAdmin && room.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this room' });
    }

    if (roomNumber !== undefined && (typeof roomNumber !== 'string' || roomNumber.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Please provide valid room number' });
    }

    if (rentAmount !== undefined && (isNaN(rentAmount) || rentAmount <= 0)) {
      return res.status(400).json({ success: false, message: 'Please provide valid rent amount' });
    }

    if (capacity !== undefined && (isNaN(capacity) || capacity <= 0)) {
      return res.status(400).json({ success: false, message: 'Please provide valid room capacity' });
    }

    if (rentType !== undefined && !['PER_ROOM', 'PER_BED'].includes(rentType)) {
      return res.status(400).json({ success: false, message: 'Rent type must be PER_ROOM or PER_BED' });
    }

    if (status !== undefined && !['AVAILABLE', 'OCCUPIED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be AVAILABLE or OCCUPIED' });
    }

    const updateData = {
      ...(roomNumber !== undefined && { roomNumber: roomNumber.trim() }),
      ...(floor !== undefined && { floor: floor || 1 }),
      ...(rentType !== undefined && { rentType }),
      ...(rentAmount !== undefined && { rentAmount }),
      ...(capacity !== undefined && { capacity }),
      ...(status !== undefined && { status }),
    };

    const updatedRoom = await Room.findByIdAndUpdate(roomId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updatedRoom });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update bed status
exports.updateBedStatus = async (req, res) => {
  try {
    const { roomId, bedId } = req.params;
    const { status } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && room.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this room' });
    }

    const bed = room.beds.id(bedId);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    bed.status = status;
    await room.save();

    res.status(200).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete room
exports.deleteRoom = async (req, res) => {
  try {
    const { userId } = req.body;
    const roomId = req.params.id;

    if (!userId || userId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID format' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && room.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this room' });
    }

    await Room.findByIdAndDelete(roomId);
    res.status(200).json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
