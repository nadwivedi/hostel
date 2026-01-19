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

// Create payment
exports.createPayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      userId: req.isAdmin ? req.body.userId : req.user._id,
    };

    // If admin is creating without specifying userId, return error
    if (req.isAdmin && !req.body.userId) {
      return res.status(400).json({ message: 'userId is required when admin creates a payment' });
    }

    const payment = await Payment.create(paymentData);
    const populatedPayment = await Payment.findById(payment._id)
      .populate('tenantId')
      .populate('occupancyId');
    res.status(201).json(populatedPayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update payment
exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this payment' });
    }

    // Don't allow changing userId
    const { userId, ...updateData } = req.body;

    const updatedPayment = await Payment.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('tenantId')
      .populate('occupancyId');

    res.status(200).json(updatedPayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete payment
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check ownership for non-admin users
    if (!req.isAdmin && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this payment' });
    }

    await Payment.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
