const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

/**
 * Auto-create missing payment records for all active tenants
 * Runs daily at 2:00 AM
 */
const autoCreatePayments = cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running auto-create payments cron job...');

    // Get all active tenants with room assignments
    const activeTenants = await Tenant.find({ status: 'ACTIVE', roomId: { $ne: null } })
      .populate('roomId');

    console.log(`Found ${activeTenants.length} active tenants with rooms`);

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();

    let createdCount = 0;

    for (const tenant of activeTenants) {
      try {
        // Get the join date to determine payment cycle
        const joinDate = new Date(tenant.joiningDate);
        const dueDay = joinDate.getDate();

        // Find the latest payment for this tenant
        const latestPayment = await Payment.findOne({
          tenantId: tenant._id,
        }).sort({ year: -1, month: -1 });

        if (!latestPayment) {
          console.log(`No payments found for tenant ${tenant._id}. Skipping.`);
          continue;
        }

        // Calculate what the next month should be
        let nextMonth = latestPayment.month + 1;
        let nextYear = latestPayment.year;

        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }

        // Check if we need to create payments for current month and beyond
        const monthsToCreate = [];

        let checkMonth = nextMonth;
        let checkYear = nextYear;

        // Check up to 3 months ahead
        for (let i = 0; i < 3; i++) {
          const monthDate = new Date(checkYear, checkMonth - 1, 1);
          const oneMonthAhead = new Date(currentYear, currentMonth, 1);

          if (monthDate <= oneMonthAhead) {
            // Check if payment already exists
            const existingPayment = await Payment.findOne({
              tenantId: tenant._id,
              month: checkMonth,
              year: checkYear,
            });

            if (!existingPayment) {
              monthsToCreate.push({ month: checkMonth, year: checkYear });
            }
          }

          checkMonth += 1;
          if (checkMonth > 12) {
            checkMonth = 1;
            checkYear += 1;
          }
        }

        // Create missing payments
        for (const { month, year } of monthsToCreate) {
          const dueDate = new Date(year, month - 1, dueDay);

          await Payment.create({
            userId: tenant.userId,
            tenantId: tenant._id,
            month: month,
            year: year,
            rentAmount: tenant.rentAmount,
            amountPaid: 0,
            dueDate: dueDate,
            status: 'PENDING',
          });

          createdCount++;
          console.log(`Created payment for ${tenant.name} - ${month}/${year}`);
        }

      } catch (error) {
        console.error(`Error processing tenant ${tenant._id}:`, error.message);
      }
    }

    console.log(`Auto-create payments complete. Created ${createdCount} new payment(s).`);

  } catch (error) {
    console.error('Error in auto-create payments cron job:', error);
  }
});

/**
 * Send payment reminders (optional)
 * Runs daily at 9:00 AM
 */
const sendPaymentReminders = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running payment reminders cron job...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get payments due in next 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingPayments = await Payment.find({
      status: 'PENDING',
      dueDate: {
        $gte: today,
        $lte: threeDaysFromNow,
      },
    }).populate('tenantId');

    console.log(`Found ${upcomingPayments.length} upcoming payment(s) in next 3 days`);

    upcomingPayments.forEach(payment => {
      const daysUntilDue = Math.ceil((payment.dueDate - today) / (1000 * 60 * 60 * 24));
      console.log(`Reminder: ${payment.tenantId?.name || 'Unknown'} - Payment due in ${daysUntilDue} day(s)`);
    });

  } catch (error) {
    console.error('Error in payment reminders cron job:', error);
  }
});

/**
 * Start all payment-related cron jobs
 */
const startPaymentJobs = () => {
  console.log('Starting payment cron jobs...');

  autoCreatePayments.start();
  console.log('Auto-create payments cron job scheduled (daily at 2:00 AM)');

  sendPaymentReminders.start();
  console.log('Payment reminders cron job scheduled (daily at 9:00 AM)');
};

module.exports = {
  startPaymentJobs,
};
