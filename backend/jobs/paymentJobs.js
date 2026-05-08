const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Room = require('../models/Room');

/**
 * Helper to process payments for a single tenant
 * Checks for missing payments up to threeDaysFromNow and creates them
 */
const processTenantPayments = async (tenant, today, threeDaysFromNow) => {
  let createdCount = 0;
  
  try {
    // Get the join date to determine payment cycle (due day of each month)
    const joinDate = new Date(tenant.joiningDate);
    const dueDay = joinDate.getDate();

    // Find the latest payment for this tenant
    const latestPayment = await Payment.findOne({
      tenantId: tenant._id,
    }).sort({ year: -1, month: -1 });

    if (!latestPayment) {
      // If no payments exist, we don't auto-create (expecting first month created on signup)
      return 0;
    }

    // Per user request: If a leave date is set, do not create any automated payments
    if (tenant.leaveDate) {
      console.log(`[Payments] Skipping auto-creation for ${tenant.name} - leave date is set.`);
      return 0;
    }

    let currentYear = latestPayment.year;
    let currentMonth = latestPayment.month;

    // Fast-forward to the current month if the latest payment is from the past.
    // This prevents creating a long list of "catch-up" payments for old months 
    // when a tenant is added with a past joining date.
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const latestPaymentStart = new Date(currentYear, currentMonth - 1, 1);

    if (latestPaymentStart < currentMonthStart) {
      // Start from the previous month relative to today, so the loop creates the current month's payment
      const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      currentMonth = prevMonthDate.getMonth() + 1;
      currentYear = prevMonthDate.getFullYear();
      console.log(`[Payments] Fast-forwarding payment creation for ${tenant.name} from ${latestPayment.month}/${latestPayment.year} to start at ${today.getMonth() + 1}/${today.getFullYear()}`);
    }

    // Iterate and create payments for missing months up to threeDaysFromNow
    while (true) {
      // Calculate next month
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;

      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }

      // Calculate the due date for the next payment
      const nextDueDate = new Date(nextYear, nextMonth - 1, dueDay);
      // Handle months with fewer days than dueDay (e.g. Feb 30th -> Feb 28th/29th)
      if (nextDueDate.getMonth() !== nextMonth - 1) {
        nextDueDate.setDate(0); // Set to last day of intended month
      }
      nextDueDate.setHours(0, 0, 0, 0);

      // 1. Check if this payment is due within our window (today to threeDaysFromNow)
      if (nextDueDate > threeDaysFromNow) {
        break; // Beyond our creation window
      }

      // 2. ONLY create payments for today or future dates (per user request: "do not create previous date")
      if (nextDueDate < today) {
        currentMonth = nextMonth;
        currentYear = nextYear;
        continue; // Skip past due dates
      }

      // ✅ SKIP if tenant has a leave date set and their leave date is BEFORE or ON the next due date
      if (tenant.leaveDate) {
        const tenantLeaveDate = new Date(tenant.leaveDate);
        tenantLeaveDate.setHours(0, 0, 0, 0);
        
        if (nextDueDate >= tenantLeaveDate) {
          console.log(`[Payments] Skipping month ${nextMonth}/${nextYear} for ${tenant.name} - leave date reached.`);
          break; 
        }
      }

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
        console.log(`[Payments] Created payment for ${tenant.name} - ${nextMonth}/${nextYear} (due: ${nextDueDate.toLocaleDateString()})`);
      }

      // Move to next month for the loop
      currentMonth = nextMonth;
      currentYear = nextYear;
    }
  } catch (error) {
    console.error(`Error processing payments for tenant ${tenant._id}:`, error.message);
  }
  
  return createdCount;
};

/**
 * Auto-create payment records 3 days before they are due
 * Runs daily at 2:00 AM
 */
const autoCreatePayments = cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running auto-create payments cron job...');
    const activeTenants = await Tenant.find({ status: 'ACTIVE', roomId: { $ne: null } }).populate('roomId');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    let totalCreated = 0;
    for (const tenant of activeTenants) {
      totalCreated += await processTenantPayments(tenant, today, threeDaysFromNow);
    }
    console.log(`Auto-create payments complete. Created ${totalCreated} new payment(s).`);
  } catch (error) {
    console.error('Error in auto-create payments cron job:', error);
  }
});

/**
 * Automated cleanup of departed tenants
 * Runs daily at 1:00 AM
 */
const cleanupDepartedTenants = cron.schedule('0 1 * * *', async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const departedTenants = await Tenant.find({
      status: 'ACTIVE',
      leaveDate: { $ne: null, $lt: today }
    });

    for (const tenant of departedTenants) {
      if (tenant.roomId) {
        const room = await Room.findById(tenant.roomId);
        if (room) {
          if (tenant.bedNumber) {
            const bed = room.beds.find(b => b.bedNumber === tenant.bedNumber);
            if (bed) bed.status = 'AVAILABLE';
          } else {
            room.status = 'AVAILABLE';
          }
          await room.save();
        }
      }
      tenant.status = 'COMPLETED';
      await tenant.save();
    }
  } catch (error) {
    console.error('Error in cleanup departed tenants job:', error);
  }
});

/**
 * Daily Payment Reminders
 * Runs daily at 9:00 AM
 */
const sendPaymentReminders = cron.schedule('0 9 * * *', async () => {
  // Reminder logic would go here
});

const runAllChecksNow = async () => {
  try {
    console.log('Running manual startup checks...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Cleanup departed
    const departedTenants = await Tenant.find({
      status: 'ACTIVE',
      leaveDate: { $ne: null, $lt: today }
    });
    for (const tenant of departedTenants) {
      if (tenant.roomId) {
        const room = await Room.findById(tenant.roomId);
        if (room) {
          if (tenant.bedNumber) {
            const bed = room.beds.find(b => b.bedNumber === tenant.bedNumber);
            if (bed) bed.status = 'AVAILABLE';
          } else {
            room.status = 'AVAILABLE';
          }
          await room.save();
        }
      }
      tenant.status = 'COMPLETED';
      await tenant.save();
    }

    // 2. Create payments
    const activeTenants = await Tenant.find({ status: 'ACTIVE', roomId: { $ne: null } });
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    for (const tenant of activeTenants) {
      await processTenantPayments(tenant, today, threeDaysFromNow);
    }
    console.log('Startup checks complete.');
  } catch (error) {
    console.error('Error in startup checks:', error);
  }
};

const startPaymentJobs = () => {
  console.log('Starting payment cron jobs...');
  runAllChecksNow();
  cleanupDepartedTenants.start();
  autoCreatePayments.start();
  sendPaymentReminders.start();
};

module.exports = {
  startPaymentJobs,
  runAllChecksNow,
};
