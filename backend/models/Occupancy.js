const mongoose = require('mongoose');

const occupancySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    bedNumber: {
      type: String,
      default: null,
    },
    rentAmount: {
      type: Number,
      required: true,
    },
    advanceAmount: {
      type: Number,
      default: 0,
    },
    advanceLeft: {
      type: Number,
      default: 0,
    },
    joinDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    leaveDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Occupancy = mongoose.model('Occupancy', occupancySchema);

module.exports = Occupancy;
