const Occupancy = require('../models/Occupancy');
const Payment = require('../models/Payment');

/**
 * Creates next month's payment based on a given payment
 * Used when marking payment as paid to auto-create next month
 */
exports.createNextMonthPayment = async (currentPayment) => {
  try {
    const occupancy = await Occupancy.findById(currentPayment.occupancyId);
    if (!occupancy) {
      throw new Error('Occupancy not found');
    }

    // Only create next payment if occupancy is still active
    if (occupancy.status !== 'ACTIVE') {
      console.log(`Occupancy ${occupancy._id} is not active. Skipping next payment creation.`);
      return null;
    }

    // Calculate next month
    let nextMonth = currentPayment.month + 1;
    let nextYear = currentPayment.year;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    // Check if payment already exists for next month
    const existingPayment = await Payment.findOne({
      occupancyId: occupancy._id,
      month: nextMonth,
      year: nextYear,
    });

    if (existingPayment) {
      console.log(`Payment for ${nextMonth}/${nextYear} already exists`);
      return existingPayment;
    }

    // Get joining date to determine due day
    const joinDate = new Date(occupancy.joinDate);
    const dueDay = joinDate.getDate();

    // Calculate due date for next month
    const dueDate = new Date(nextYear, nextMonth - 1, dueDay);

    const paymentData = {
      userId: occupancy.userId,
      occupancyId: occupancy._id,
      tenantId: occupancy.tenantId,
      month: nextMonth,
      year: nextYear,
      rentAmount: occupancy.rentAmount,
      amountPaid: 0,
      dueDate: dueDate,
      status: 'PENDING',
    };

    const payment = await Payment.create(paymentData);
    console.log(`✓ Next payment created for occupancy ${occupancy._id}, Due: ${dueDate.toLocaleDateString()}`);
    return payment;
  } catch (error) {
    console.error('Error creating next month payment:', error);
    throw error;
  }
};

/**
 * Mark payment as paid and auto-create next month's payment
 */
exports.markAsPaid = async (paymentId, paymentDate = new Date()) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  // Mark current payment as paid
  payment.amountPaid = payment.rentAmount;
  payment.status = 'PAID';
  payment.paymentDate = paymentDate;
  await payment.save();

  console.log(`✓ Payment ${paymentId} marked as PAID`);

  // Auto-create next month's payment
  try {
    await this.createNextMonthPayment(payment);
  } catch (error) {
    console.error('Failed to create next month payment:', error.message);
    // Don't throw error - current payment is already marked as paid
  }

  return payment;
};

/**
 * Get upcoming payments (due in next N days)
 */
exports.getUpcomingPayments = async (daysAhead = 7) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  futureDate.setHours(23, 59, 59, 999);

  const upcomingPayments = await Payment.find({
    status: 'PENDING',
    dueDate: {
      $gte: today,
      $lte: futureDate,
    },
  })
    .populate('tenantId')
    .populate('occupancyId')
    .sort({ dueDate: 1 });

  return upcomingPayments;
};

/**
 * Get overdue payments
 */
exports.getOverduePayments = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overduePayments = await Payment.find({
    status: { $in: ['PENDING', 'PARTIAL'] },
    dueDate: { $lt: today },
  })
    .populate('tenantId')
    .populate('occupancyId')
    .sort({ dueDate: 1 });

  return overduePayments;
};
