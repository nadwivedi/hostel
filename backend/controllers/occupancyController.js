const Occupancy = require('../models/Occupancy');
const Room = require('../models/Room');

// Get all occupancies
exports.getAllOccupancies = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const occupancies = await Occupancy.find(filter)
      .populate('tenantId')
      .populate('roomId')
      .sort({ status: 1, createdAt: -1 });
    res.status(200).json(occupancies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single occupancy
exports.getOccupancyById = async (req, res) => {
  try {
    const occupancy = await Occupancy.findById(req.params.id)
      .populate('tenantId')
      .populate('roomId');
    if (!occupancy) {
      return res.status(404).json({ message: 'Occupancy not found' });
    }
    res.status(200).json(occupancy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create occupancy
exports.createOccupancy = async (req, res) => {
  try {
    const { roomId, bedNumber } = req.body;

    // Create occupancy
    const occupancy = await Occupancy.create(req.body);

    // Update room/bed status
    const room = await Room.findById(roomId);
    if (room) {
      if (bedNumber) {
        // Update bed status by bedNumber
        const bed = room.beds.find(b => b.bedNumber === bedNumber);
        if (bed) {
          bed.status = 'OCCUPIED';
        }
      } else {
        // Update room status (for PER_ROOM type)
        room.status = 'OCCUPIED';
      }
      await room.save();
    }

    const populatedOccupancy = await Occupancy.findById(occupancy._id)
      .populate('tenantId')
      .populate('roomId');

    res.status(201).json(populatedOccupancy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update occupancy
exports.updateOccupancy = async (req, res) => {
  try {
    const { leaveDate, status } = req.body;

    const occupancy = await Occupancy.findById(req.params.id);
    if (!occupancy) {
      return res.status(404).json({ message: 'Occupancy not found' });
    }

    // Update occupancy
    if (leaveDate) occupancy.leaveDate = leaveDate;
    if (status) occupancy.status = status;
    await occupancy.save();

    // If ending occupancy, update room/bed status
    if (status === 'COMPLETED') {
      const room = await Room.findById(occupancy.roomId);
      if (room) {
        if (occupancy.bedNumber) {
          // Update bed status by bedNumber
          const bed = room.beds.find(b => b.bedNumber === occupancy.bedNumber);
          if (bed) {
            bed.status = 'AVAILABLE';
          }
        } else {
          // Update room status (for PER_ROOM type)
          room.status = 'AVAILABLE';
        }
        await room.save();
      }
    }

    const updatedOccupancy = await Occupancy.findById(occupancy._id)
      .populate('tenantId')
      .populate('roomId');

    res.status(200).json(updatedOccupancy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete occupancy
exports.deleteOccupancy = async (req, res) => {
  try {
    const occupancy = await Occupancy.findByIdAndDelete(req.params.id);
    if (!occupancy) {
      return res.status(404).json({ message: 'Occupancy not found' });
    }
    res.status(200).json({ message: 'Occupancy deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
