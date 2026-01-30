const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema(
  {
    bedNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED'],
      default: 'AVAILABLE',
    },
  },
  {
    _id: false,
  }
);

const roomSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    roomNumber: {
      type: String,
      required: true,
    },
    floor: {
      type: Number,
    },
    rentType: {
      type: String,
      enum: ['PER_ROOM', 'PER_BED'],
      required: true,
    },
    rentAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED',],
      default: 'AVAILABLE',
    },
    beds: [bedSchema],

  },
  {
    timestamps: true,
  }
);

// Compound index to ensure roomNumber is unique per property per user
roomSchema.index({ userId: 1, propertyId: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
