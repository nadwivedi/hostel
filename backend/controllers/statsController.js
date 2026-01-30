const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

exports.getDashboardStats = async (req, res) => {
  try {
    // For admin: show all stats
    // For user: show only their own stats
    const filter = req.isAdmin ? {} : { userId: req.user._id };

    const totalTenants = await Tenant.countDocuments(filter);
    const activeTenants = await Tenant.countDocuments({ ...filter, status: 'ACTIVE' });
    const totalRooms = await Room.countDocuments(filter);

    // Get payments for revenue calculation
    const payments = await Payment.find({ ...filter, status: 'PAID' });
    const totalRevenue = payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);

    // Get pending payments
    const pendingPayments = await Payment.countDocuments({ ...filter, status: 'PENDING' });

    // Get available rooms count
    const availableRooms = await Room.countDocuments({ ...filter, status: 'AVAILABLE' });

    const stats = {
      totalTenants,
      activeTenants,
      totalRooms,
      totalRevenue,
      pendingPayments,
      availableRooms,
    };

    // Admin-only stats
    if (req.isAdmin) {
      stats.totalUsers = await User.countDocuments();
    }

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
