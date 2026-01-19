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
    const roomData = {
      ...req.body,
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    // If admin is creating without specifying userId, return error
    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ message: 'userId is required when admin creates a room' });
    }

    const room = await Room.create(roomData);
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update room
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && room.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this room' });
    }

    // Don't allow changing userId
    const { userId, ...updateData } = req.body;

    const updatedRoom = await Room.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updatedRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && room.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this room' });
    }

    await Room.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
