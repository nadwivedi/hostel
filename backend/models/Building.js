const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    totalFloors: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Building = mongoose.model('Building', buildingSchema);

module.exports = Building;
