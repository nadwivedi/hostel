const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    propertyType: {
      type: String,
      enum: ['hostel', 'resident', 'shop'],
      required: true,
      default: 'hostel',
    },
    image: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure property name is unique per user
propertySchema.index({ userId: 1, name: 1 }, { unique: true });

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
