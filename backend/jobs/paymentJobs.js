const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

/**
 * Auto-create payment records 4 days before they are due
 * Runs daily at 2:00 AM
 *
 * Logic: For each active tenant, check if their next payment due date is within 4 days.
 * If yes and payment doesn't exist, create it.
 */
const autoCreatePayments = cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running auto-create payments cron job...');

    // Get all active tenants with room assignments
    const activeTenants = await Tenant.find({ status: 'ACTIVE', roomId: { $ne: null } })
      .populate('roomId');

    console.log(`Found ${activeTenants.length} active tenants with rooms`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 4 days from now
    const fourDaysFromNow = new Date(today);
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    fourDaysFromNow.setHours(23, 59, 59, 999);

    let createdCount = 0;

    for (const tenant of activeTenants) {
      try {
        // Get the join date to determine payment cycle (due day of each month)
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

        // Calculate what the next month should be after the latest payment
        let nextMonth = latestPayment.month + 1;
        let nextYear = latestPayment.year;

        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }

        // Calculate the due date for the next payment
        const nextDueDate = new Date(nextYear, nextMonth - 1, dueDay);

        // Check if the next due date is within 4 days from today
        if (nextDueDate >= today && nextDueDate <= fourDaysFromNow) {
          // Check if payment already exists for this month
          const existingPayment = await Payment.findOne({
            tenantId: tenant._id,
            month: nextMonth,
            year: nextYear,
          });

          if (!existingPayment) {
            await Payment.create({
              userId: tenant.userId,
              tenantId: tenant._id,
              month: nextMonth,
              year: nextYear,
              rentAmount: tenant.rentAmount,
              amountPaid: 0,
              dueDate: nextDueDate,
              status: 'PENDING',
            });

            createdCount++;
            console.log(`Created payment for ${tenant.name} - ${nextMonth}/${nextYear} (due: ${nextDueDate.toLocaleDateString()})`);
          }
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
 * Send payment reminders
 * Runs daily at 9:00 AM
 * Alerts for payments due within 4 days or overdue
 */
const sendPaymentReminders = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running payment reminders cron job...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get payments due in next 4 days or overdue
    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    fourDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingPayments = await Payment.find({
      status: { $in: ['PENDING', 'PARTIAL'] },
      dueDate: { $lte: fourDaysFromNow },
    }).populate('tenantId');

    console.log(`Found ${upcomingPayments.length} pending/upcoming payment(s)`);

    upcomingPayments.forEach(payment => {
      const daysUntilDue = Math.ceil((payment.dueDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0) {
        console.log(`OVERDUE: ${payment.tenantId?.name || 'Unknown'} - Payment overdue by ${Math.abs(daysUntilDue)} day(s)`);
      } else {
        console.log(`Reminder: ${payment.tenantId?.name || 'Unknown'} - Payment due in ${daysUntilDue} day(s)`);
      }
    });

  } catch (error) {
    console.error('Error in payment reminders cron job:', error);
  }
});

/**
 * Run payment creation check immediately (called on server start)
 */
const runPaymentCheckNow = async () => {
  try {
    console.log('Running payment check on server startup...');

    const activeTenants = await Tenant.find({ status: 'ACTIVE', roomId: { $ne: null } })
      .populate('roomId');

    console.log(`Found ${activeTenants.length} active tenants with rooms`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fourDaysFromNow = new Date(today);
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    fourDaysFromNow.setHours(23, 59, 59, 999);

    let createdCount = 0;

    for (const tenant of activeTenants) {
      try {
        const joinDate = new Date(tenant.joiningDate);
        const dueDay = joinDate.getDate();

        const latestPayment = await Payment.findOne({
          tenantId: tenant._id,
        }).sort({ year: -1, month: -1 });

        if (!latestPayment) {
          console.log(`No payments found for tenant ${tenant._id}. Skipping.`);
          continue;
        }

        let nextMonth = latestPayment.month + 1;
        let nextYear = latestPayment.year;

        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }

        const nextDueDate = new Date(nextYear, nextMonth - 1, dueDay);

        if (nextDueDate >= today && nextDueDate <= fourDaysFromNow) {
          const existingPayment = await Payment.findOne({
            tenantId: tenant._id,
            month: nextMonth,
            year: nextYear,
          });

          if (!existingPayment) {
            await Payment.create({
              userId: tenant.userId,
              tenantId: tenant._id,
              month: nextMonth,
              year: nextYear,
              rentAmount: tenant.rentAmount,
              amountPaid: 0,
              dueDate: nextDueDate,
              status: 'PENDING',
            });

            createdCount++;
            console.log(`Created payment for ${tenant.name} - ${nextMonth}/${nextYear} (due: ${nextDueDate.toLocaleDateString()})`);
          }
        }

      } catch (error) {
        console.error(`Error processing tenant ${tenant._id}:`, error.message);
      }
    }

    console.log(`Startup payment check complete. Created ${createdCount} new payment(s).`);

  } catch (error) {
    console.error('Error in startup payment check:', error);
  }
};

/**
 * Start all payment-related cron jobs
 */
const startPaymentJobs = () => {
  console.log('Starting payment cron jobs...');

  // Run payment check immediately on server start
  runPaymentCheckNow();

  autoCreatePayments.start();
  console.log('Auto-create payments cron job scheduled (daily at 2:00 AM)');

  sendPaymentReminders.start();
  console.log('Payment reminders cron job scheduled (daily at 9:00 AM)');
};

module.exports = {
  startPaymentJobs,
  runPaymentCheckNow,
};
