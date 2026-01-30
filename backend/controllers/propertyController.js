const mongoose = require('mongoose');
const Property = require('../models/Property');

// Get all properties (filtered by user, all for admin)
exports.getAllProperties = async (req, res) => {
  try {
    const filter = req.isAdmin ? {} : { userId: req.user._id };

    // Filter by propertyType if provided
    if (req.query.propertyType) {
      filter.propertyType = req.query.propertyType;
    }

    const properties = await Property.find(filter).sort({ name: 1 });
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single property
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && property.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this property' });
    }

    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create property
exports.createProperty = async (req, res) => {
  try {
    const { name, location, propertyType, image } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide property name' });
    }

    if (!location || location.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide location' });
    }

    if (!propertyType || !['hostel', 'resident', 'shop'].includes(propertyType)) {
      return res.status(400).json({ success: false, message: 'Please provide valid property type (hostel, resident, or shop)' });
    }

    const propertyData = {
      name: name.trim(),
      location: location.trim(),
      propertyType,
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    // Handle image path from separate upload
    if (image) {
      propertyData.image = image;
    }

    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ success: false, message: 'userId is required when admin creates a property' });
    }

    const newProperty = await Property.create(propertyData);
    res.status(201).json({ success: true, data: newProperty });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Property with this name already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update property
exports.updateProperty = async (req, res) => {
  try {
    const { name, location, propertyType, image } = req.body;
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID format' });
    }

    const existingProperty = await Property.findById(propertyId);
    if (!existingProperty) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && existingProperty.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Please provide valid property name' });
    }

    if (location !== undefined && (typeof location !== 'string' || location.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Please provide valid location' });
    }

    if (propertyType !== undefined && !['hostel', 'resident', 'shop'].includes(propertyType)) {
      return res.status(400).json({ success: false, message: 'Property type must be hostel, resident, or shop' });
    }

    const updateData = {
      ...(name !== undefined && { name: name.trim() }),
      ...(location !== undefined && { location: location.trim() }),
      ...(propertyType !== undefined && { propertyType }),
    };

    // Handle image path from separate upload
    if (image !== undefined) {
      updateData.image = image;
    }

    const updatedProperty = await Property.findByIdAndUpdate(propertyId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updatedProperty });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Property with this name already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID format' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && property.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }

    // Check if property has rooms
    const Room = require('../models/Room');
    const roomCount = await Room.countDocuments({ propertyId: propertyId });
    if (roomCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete property with existing rooms. Please delete all rooms first.' });
    }

    await Property.findByIdAndDelete(propertyId);
    res.status(200).json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get property stats (room count per property)
exports.getPropertyStats = async (req, res) => {
  try {
    const Room = require('../models/Room');
    const filter = req.isAdmin ? {} : { userId: req.user._id };

    const properties = await Property.find(filter);

    const stats = await Promise.all(
      properties.map(async (prop) => {
        const rooms = await Room.find({ propertyId: prop._id });
        const totalRooms = rooms.length;
        const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
        const totalBeds = rooms.reduce((acc, r) => acc + (r.beds?.length || 0), 0);
        const availableBeds = rooms.reduce(
          (acc, r) => acc + (r.beds?.filter(b => b.status === 'AVAILABLE').length || 0),
          0
        );

        return {
          _id: prop._id,
          name: prop.name,
          location: prop.location,
          propertyType: prop.propertyType,
          image: prop.image,
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
