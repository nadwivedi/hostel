const mongoose = require('mongoose');
const Location = require('../models/Location');

// Get all locations (filtered by user, all for admin)
exports.getAllLocations = async (req, res) => {
  try {
    const filter = req.isAdmin ? {} : { userId: req.user._id };

    const locations = await Location.find(filter).sort({ location: 1 });
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single location
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && location.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this location' });
    }

    res.status(200).json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create location
exports.createLocation = async (req, res) => {
  try {
    const { location, propertyName } = req.body;

    if (!location || location.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide location' });
    }

    const locationData = {
      location: location.trim(),
      propertyName: propertyName?.trim() || '',
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ success: false, message: 'userId is required when admin creates a location' });
    }

    const newLocation = await Location.create(locationData);
    res.status(201).json({ success: true, data: newLocation });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Location already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update location
exports.updateLocation = async (req, res) => {
  try {
    const { location, propertyName } = req.body;
    const locationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ success: false, message: 'Invalid location ID format' });
    }

    const existingLocation = await Location.findById(locationId);
    if (!existingLocation) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && existingLocation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this location' });
    }

    if (location !== undefined && (typeof location !== 'string' || location.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Please provide valid location' });
    }

    const updateData = {
      ...(location !== undefined && { location: location.trim() }),
      ...(propertyName !== undefined && { propertyName: propertyName.trim() }),
    };

    const updatedLocation = await Location.findByIdAndUpdate(locationId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updatedLocation });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Location already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get location stats (room count per location)
exports.getLocationStats = async (req, res) => {
  try {
    const Room = require('../models/Room');
    const filter = req.isAdmin ? {} : { userId: req.user._id };

    const locations = await Location.find(filter);

    const stats = await Promise.all(
      locations.map(async (loc) => {
        const rooms = await Room.find({ locationId: loc._id });
        const totalRooms = rooms.length;
        const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
        const totalBeds = rooms.reduce((acc, r) => acc + (r.beds?.length || 0), 0);
        const availableBeds = rooms.reduce(
          (acc, r) => acc + (r.beds?.filter(b => b.status === 'AVAILABLE').length || 0),
          0
        );

        return {
          _id: loc._id,
          location: loc.location,
          propertyName: loc.propertyName,
          totalRooms,
          availableRooms,
          occupiedRooms: totalRooms - availableRooms,
          totalBeds,
          availableBeds,
        };
      })
    );

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
