const mongoose = require('mongoose');
const Occupancy = require('../models/Occupancy');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

// Get all occupancies (filtered by user, all for admin)
exports.getAllOccupancies = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = req.isAdmin ? {} : { userId: req.user._id };
    if (status) filter.status = status;

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

    // Check ownership for non-admin users
    if (!req.isAdmin && occupancy.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this occupancy' });
    }

    res.status(200).json(occupancy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create occupancy
exports.createOccupancy = async (req, res) => {
  try {
    const { tenantId, roomId, bedNumber, rentAmount, advanceAmount, joinDate, status } = req.body;

    if (!tenantId || tenantId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide tenant ID' });
    }

    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide room ID' });
    }

    if (!rentAmount || isNaN(rentAmount) || rentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid rent amount' });
    }

    if (advanceAmount !== undefined && advanceAmount !== null && (isNaN(advanceAmount) || advanceAmount < 0)) {
      return res.status(400).json({ success: false, message: 'Please provide valid advance amount' });
    }

    if (!joinDate) {
      return res.status(400).json({ success: false, message: 'Please provide join date' });
    }

    if (status && !['ACTIVE', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or COMPLETED' });
    }

    const occupancyData = {
      tenantId,
      roomId,
      bedNumber: bedNumber || undefined,
      rentAmount,
      advanceAmount: advanceAmount || 0,
      joinDate,
      leaveDate: undefined,
      status: status || 'ACTIVE',
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ success: false, message: 'userId is required when admin creates an occupancy' });
    }

    const occupancy = await Occupancy.create(occupancyData);

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

    // Auto-create payment for the current month
    const joinDateObj = new Date(joinDate);
    const currentDate = new Date();
    const paymentMonth = joinDateObj.getMonth() + 1; // 1-12
    const paymentYear = joinDateObj.getFullYear();

    // Check if payment already exists for this occupancy and month/year
    const existingPayment = await Payment.findOne({
      occupancyId: occupancy._id,
      month: paymentMonth,
      year: paymentYear,
    });

    if (!existingPayment) {
      await Payment.create({
        userId: occupancyData.userId,
        occupancyId: occupancy._id,
        tenantId,
        month: paymentMonth,
        year: paymentYear,
        rentAmount,
        amountPaid: 0,
        status: 'PENDING',
      });
    }

    const populatedOccupancy = await Occupancy.findById(occupancy._id)
      .populate('tenantId')
      .populate('roomId');

    res.status(201).json({ success: true, data: populatedOccupancy });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update occupancy
exports.updateOccupancy = async (req, res) => {
  try {
    const { userId, rentAmount, advanceAmount, joinDate, leaveDate, status, notes } = req.body;
    const occupancyId = req.params.id;

    if (!userId || userId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(occupancyId)) {
      return res.status(400).json({ success: false, message: 'Invalid occupancy ID format' });
    }

    const occupancy = await Occupancy.findById(occupancyId);
    if (!occupancy) {
      return res.status(404).json({ success: false, message: 'Occupancy not found' });
    }

    if (!req.isAdmin && occupancy.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this occupancy' });
    }

    if (rentAmount !== undefined && (isNaN(rentAmount) || rentAmount <= 0)) {
      return res.status(400).json({ success: false, message: 'Please provide valid rent amount' });
    }

    if (advanceAmount !== undefined && advanceAmount !== null && (isNaN(advanceAmount) || advanceAmount < 0)) {
      return res.status(400).json({ success: false, message: 'Please provide valid advance amount' });
    }

    if (joinDate !== undefined && !joinDate) {
      return res.status(400).json({ success: false, message: 'Please provide valid join date' });
    }

    if (status !== undefined && !['ACTIVE', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or COMPLETED' });
    }

    if (rentAmount !== undefined) occupancy.rentAmount = rentAmount;
    if (advanceAmount !== undefined) occupancy.advanceAmount = advanceAmount;
    if (joinDate !== undefined) occupancy.joinDate = joinDate;
    if (leaveDate !== undefined) occupancy.leaveDate = leaveDate;
    if (status !== undefined) occupancy.status = status;
    if (notes !== undefined) occupancy.notes = notes;
    await occupancy.save();

    if (status === 'COMPLETED') {
      const room = await Room.findById(occupancy.roomId);
      if (room) {
        if (occupancy.bedNumber) {
          const bed = room.beds.find(b => b.bedNumber === occupancy.bedNumber);
          if (bed) {
            bed.status = 'AVAILABLE';
          }
        } else {
          room.status = 'AVAILABLE';
        }
        await room.save();
      }
    }

    const updatedOccupancy = await Occupancy.findById(occupancy._id)
      .populate('tenantId')
      .populate('roomId');

    res.status(200).json({ success: true, data: updatedOccupancy });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete occupancy
exports.deleteOccupancy = async (req, res) => {
  try {
    const { userId } = req.body;
    const occupancyId = req.params.id;

    if (!userId || userId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(occupancyId)) {
      return res.status(400).json({ success: false, message: 'Invalid occupancy ID format' });
    }

    const occupancy = await Occupancy.findById(occupancyId);
    if (!occupancy) {
      return res.status(404).json({ success: false, message: 'Occupancy not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && occupancy.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this occupancy' });
    }

    await Occupancy.findByIdAndDelete(occupancyId);
    res.status(200).json({ success: true, message: 'Occupancy deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
