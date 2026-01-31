const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    rentAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'PARTIAL'],
      default: 'PENDING',
    },
    reminderCount: {
      type: Number,
      default: 0,
    },
    lastReminderDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate payments for same tenant/month/year
paymentSchema.index({ tenantId: 1, year: 1, month: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
