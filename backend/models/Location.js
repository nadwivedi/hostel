const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    propertyName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure location is unique per user
locationSchema.index({ userId: 1, location: 1 }, { unique: true });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
