const cron = require('node-cron');
const Occupancy = require('../models/Occupancy');
const Payment = require('../models/Payment');

/**
 * Auto-create missing payment records for all active occupancies
 * Runs daily at 2:00 AM
 */
const autoCreatePayments = cron.schedule('0 2 * * *', async () => {
  try {
    console.log('🔄 Running auto-create payments cron job...');

    // Get all active occupancies
    const activeOccupancies = await Occupancy.find({ status: 'ACTIVE' })
      .populate('tenantId')
      .populate('roomId');

    console.log(`📋 Found ${activeOccupancies.length} active occupancies`);

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();

    let createdCount = 0;

    for (const occupancy of activeOccupancies) {
      try {
        // Get the join date to determine payment cycle
        const joinDate = new Date(occupancy.joinDate);
        const dueDay = joinDate.getDate();

        // Find the latest payment for this occupancy
        const latestPayment = await Payment.findOne({
          occupancyId: occupancy._id,
        }).sort({ year: -1, month: -1 });

        if (!latestPayment) {
          console.log(`⚠️ No payments found for occupancy ${occupancy._id}. Skipping.`);
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
        // We'll create up to 2 months ahead to ensure we don't miss any
        const monthsToCreate = [];

        // Start from the month after the latest payment
        let checkMonth = nextMonth;
        let checkYear = nextYear;

        // Check up to 3 months ahead
        for (let i = 0; i < 3; i++) {
          // Only create if this month is <= current month + 1 (current month or next month)
          const monthDate = new Date(checkYear, checkMonth - 1, 1);
          const currentDate = new Date(currentYear, currentMonth - 1, 1);
          const oneMonthAhead = new Date(currentYear, currentMonth, 1);

          if (monthDate <= oneMonthAhead) {
            // Check if payment already exists
            const existingPayment = await Payment.findOne({
              occupancyId: occupancy._id,
              month: checkMonth,
              year: checkYear,
            });

            if (!existingPayment) {
              monthsToCreate.push({ month: checkMonth, year: checkYear });
            }
          }

          // Move to next month
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
            userId: occupancy.userId,
            occupancyId: occupancy._id,
            tenantId: occupancy.tenantId._id,
            month: month,
            year: year,
            rentAmount: occupancy.rentAmount,
            amountPaid: 0,
            dueDate: dueDate,
            status: 'PENDING',
          });

          createdCount++;
          console.log(`✓ Created payment for ${occupancy.tenantId?.name || 'Unknown'} - ${month}/${year} (Due: ${dueDate.toLocaleDateString()})`);
        }

      } catch (error) {
        console.error(`❌ Error processing occupancy ${occupancy._id}:`, error.message);
      }
    }

    console.log(`✅ Auto-create payments complete. Created ${createdCount} new payment(s).`);

  } catch (error) {
    console.error('❌ Error in auto-create payments cron job:', error);
  }
});

/**
 * Send payment reminders (optional)
 * Runs daily at 9:00 AM
 */
const sendPaymentReminders = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('📧 Running payment reminders cron job...');

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
    })
      .populate('tenantId')
      .populate('occupancyId');

    console.log(`📋 Found ${upcomingPayments.length} upcoming payment(s) in next 3 days`);

    // Here you can integrate with email/SMS service to send reminders
    upcomingPayments.forEach(payment => {
      const daysUntilDue = Math.ceil((payment.dueDate - today) / (1000 * 60 * 60 * 24));
      console.log(`⏰ Reminder: ${payment.tenantId?.name || 'Unknown'} - Payment due in ${daysUntilDue} day(s)`);
    });

  } catch (error) {
    console.error('❌ Error in payment reminders cron job:', error);
  }
});

/**
 * Start all payment-related cron jobs
 */
const startPaymentJobs = () => {
  console.log('🚀 Starting payment cron jobs...');

  // Start the auto-create payments job
  autoCreatePayments.start();
  console.log('✓ Auto-create payments cron job scheduled (daily at 2:00 AM)');

  // Start the payment reminders job
  sendPaymentReminders.start();
  console.log('✓ Payment reminders cron job scheduled (daily at 9:00 AM)');
};

module.exports = {
  startPaymentJobs,
};
