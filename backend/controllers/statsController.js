const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTenants = await Tenant.countDocuments();
    const totalRooms = await Room.countDocuments();
    const totalPayments = await Payment.countDocuments();
    const payments = await Payment.find({ status: 'paid' });
    const totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    res.status(200).json({
      totalUsers,
      totalTenants,
      totalRooms,
      totalPayments,
      totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};