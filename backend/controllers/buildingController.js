const mongoose = require('mongoose');
const Building = require('../models/Building');
const Room = require('../models/Room');

// Get all buildings for a property
exports.getBuildingsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const filter = req.isAdmin ? { propertyId } : { propertyId, userId: req.user._id };

    const buildings = await Building.find(filter)
      .populate('propertyId', 'name')
      .sort({ name: 1 });

    res.status(200).json(buildings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single building
exports.getBuildingById = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id)
      .populate('propertyId', 'name');

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    if (!req.isAdmin && building.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this building' });
    }

    res.status(200).json(building);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create building
exports.createBuilding = async (req, res) => {
  try {
    const { propertyId, name, description, totalFloors } = req.body;

    if (!propertyId || !name) {
      return res.status(400).json({ message: 'Property ID and building name are required' });
    }

    const buildingData = {
      propertyId,
      name: name.trim(),
      description: description?.trim() || '',
      totalFloors: totalFloors || 1,
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    const building = await Building.create(buildingData);
    const populatedBuilding = await Building.findById(building._id).populate('propertyId', 'name');

    res.status(201).json({ success: true, data: populatedBuilding });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Building with this name already exists in this property' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update building
exports.updateBuilding = async (req, res) => {
  try {
    const { name, description, totalFloors } = req.body;
    const buildingId = req.params.id;

    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    if (!req.isAdmin && building.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this building' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (totalFloors) updateData.totalFloors = totalFloors;

    const updatedBuilding = await Building.findByIdAndUpdate(buildingId, updateData, {
      new: true,
      runValidators: true,
    }).populate('propertyId', 'name');

    res.status(200).json({ success: true, data: updatedBuilding });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete building
exports.deleteBuilding = async (req, res) => {
  try {
    const buildingId = req.params.id;

    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    if (!req.isAdmin && building.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this building' });
    }

    // Check if building has rooms
    const roomCount = await Room.countDocuments({ buildingId });
    if (roomCount > 0) {
      return res.status(400).json({
        message: `Cannot delete building. It has ${roomCount} room(s). Please remove or reassign rooms first.`
      });
    }

    await Building.findByIdAndDelete(buildingId);
    res.status(200).json({ success: true, message: 'Building deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk create buildings for a property
exports.bulkCreateBuildings = async (req, res) => {
  try {
    const { propertyId, buildings } = req.body;

    if (!propertyId || !buildings || !Array.isArray(buildings)) {
      return res.status(400).json({ message: 'Property ID and buildings array are required' });
    }

    const userId = req.isAdmin ? req.body.userId : req.user._id;

    const buildingDocs = buildings.map(b => ({
      propertyId,
      name: b.name.trim(),
      description: b.description?.trim() || '',
      totalFloors: b.totalFloors || 1,
      userId,
    }));

    const createdBuildings = await Building.insertMany(buildingDocs, { ordered: false });

    res.status(201).json({ success: true, data: createdBuildings });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Some buildings already exist' });
    }
    res.status(400).json({ message: error.message });
  }
};
