const mongoose = require('mongoose');
const Payment = require('../models/Payment');

// Get all payments (filtered by user, all for admin)
exports.getAllPayments = async (req, res) => {
  try {
    const { status, month, year } = req.query;
    const filter = req.isAdmin ? {} : { userId: req.user._id };
    if (status) filter.status = status;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const payments = await Payment.find(filter)
      .populate('tenantId')
      .populate('occupancyId')
      .sort({ year: -1, month: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single payment
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('tenantId')
      .populate('occupancyId');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this payment' });
    }

    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get payments by tenant
exports.getPaymentsByTenant = async (req, res) => {
  try {
    const filter = { tenantId: req.params.tenantId };

    // For non-admin users, also filter by userId
    if (!req.isAdmin) {
      filter.userId = req.user._id;
    }

    const payments = await Payment.find(filter)
      .populate('tenantId')
      .populate('occupancyId')
      .sort({ year: -1, month: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get payments by occupancy
exports.getPaymentsByOccupancy = async (req, res) => {
  try {
    const filter = { occupancyId: req.params.occupancyId };

    // For non-admin users, also filter by userId
    if (!req.isAdmin) {
      filter.userId = req.user._id;
    }

    const payments = await Payment.find(filter)
      .populate('tenantId')
      .populate('occupancyId')
      .sort({ year: -1, month: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create payment
exports.createPayment = async (req, res) => {
  try {
    const { occupancyId, tenantId, month, year, rentAmount, amountPaid, paymentDate, status } = req.body;

    if (!occupancyId || occupancyId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide occupancy ID' });
    }

    if (!tenantId || tenantId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide tenant ID' });
    }

    if (!month || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Please provide valid month (1-12)' });
    }

    if (!year || isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Please provide valid year' });
    }

    if (!rentAmount || isNaN(rentAmount) || rentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid rent amount' });
    }

    if (amountPaid !== undefined && amountPaid !== null && (isNaN(amountPaid) || amountPaid < 0)) {
      return res.status(400).json({ success: false, message: 'Please provide valid amount paid' });
    }

    if (status && !['PENDING', 'PAID', 'PARTIAL'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be PENDING, PAID, or PARTIAL' });
    }

    if (amountPaid > rentAmount) {
      return res.status(400).json({ success: false, message: 'Amount paid cannot exceed rent amount' });
    }

    // Calculate dueDate if not provided (5th of the specified month/year as default)
    const dueDate = req.body.dueDate || new Date(year, month - 1, 5);

    const paymentData = {
      occupancyId,
      tenantId,
      month,
      year,
      rentAmount,
      amountPaid: amountPaid || 0,
      dueDate: dueDate,
      paymentDate: amountPaid > 0 ? paymentDate : null,
      status: status || 'PENDING',
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ success: false, message: 'userId is required when admin creates a payment' });
    }

    const payment = await Payment.create(paymentData);
    const populatedPayment = await Payment.findById(payment._id)
      .populate('tenantId')
      .populate('occupancyId');
    res.status(201).json({ success: true, data: populatedPayment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update payment
exports.updatePayment = async (req, res) => {
  try {
    const { month, year, rentAmount, amountPaid, paymentDate, status } = req.body;
    const paymentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this payment' });
    }

    if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
      return res.status(400).json({ success: false, message: 'Please provide valid month (1-12)' });
    }

    if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
      return res.status(400).json({ success: false, message: 'Please provide valid year' });
    }

    if (rentAmount !== undefined && (isNaN(rentAmount) || rentAmount <= 0)) {
      return res.status(400).json({ success: false, message: 'Please provide valid rent amount' });
    }

    if (amountPaid !== undefined && amountPaid !== null && (isNaN(amountPaid) || amountPaid < 0)) {
      return res.status(400).json({ success: false, message: 'Please provide valid amount paid' });
    }

    if (status !== undefined && !['PENDING', 'PAID', 'PARTIAL'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be PENDING, PAID, or PARTIAL' });
    }

    const currentRentAmount = rentAmount !== undefined ? rentAmount : payment.rentAmount;
    if (amountPaid !== undefined && amountPaid > currentRentAmount) {
      return res.status(400).json({ success: false, message: 'Amount paid cannot exceed rent amount' });
    }

    const updateData = {
      ...(month !== undefined && { month }),
      ...(year !== undefined && { year }),
      ...(rentAmount !== undefined && { rentAmount }),
      ...(amountPaid !== undefined && { amountPaid }),
      ...(paymentDate !== undefined && { paymentDate: amountPaid > 0 ? paymentDate : null }),
      ...(status !== undefined && { status }),
    };

    const updatedPayment = await Payment.findByIdAndUpdate(paymentId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('tenantId')
      .populate('occupancyId');

    res.status(200).json({ success: true, data: updatedPayment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete payment
exports.deletePayment = async (req, res) => {
  try {
    const paymentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this payment' });
    }

    await Payment.findByIdAndDelete(paymentId);
    res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark payment as paid (and auto-create next month's payment)
exports.markAsPaid = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const { paymentDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this payment' });
    }

    const paymentService = require('../services/paymentService');
    const updatedPayment = await paymentService.markAsPaid(paymentId, paymentDate || new Date());

    const populatedPayment = await Payment.findById(updatedPayment._id)
      .populate('tenantId')
      .populate('occupancyId');

    res.status(200).json({
      success: true,
      message: 'Payment marked as paid and next month payment created',
      data: populatedPayment,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get upcoming payments (for alerts)
exports.getUpcomingPayments = async (req, res) => {
  try {
    const { days } = req.query;
    const daysAhead = days ? parseInt(days) : 7;

    const paymentService = require('../services/paymentService');
    let upcomingPayments = await paymentService.getUpcomingPayments(daysAhead);

    // Filter by user if not admin
    if (!req.isAdmin) {
      upcomingPayments = upcomingPayments.filter(
        (p) => p.userId.toString() === req.user._id.toString()
      );
    }

    res.status(200).json({
      success: true,
      count: upcomingPayments.length,
      data: upcomingPayments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get overdue payments
exports.getOverduePayments = async (req, res) => {
  try {
    const paymentService = require('../services/paymentService');
    let overduePayments = await paymentService.getOverduePayments();

    // Filter by user if not admin
    if (!req.isAdmin) {
      overduePayments = overduePayments.filter(
        (p) => p.userId.toString() === req.user._id.toString()
      );
    }

    res.status(200).json({
      success: true,
      count: overduePayments.length,
      data: overduePayments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
