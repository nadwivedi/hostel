const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Room = require('../models/Room');

/**
 * Helper to process payments for a single tenant
 * Checks for missing payments up to fourDaysFromNow and creates them
 */
const processTenantPayments = async (tenant, today, fourDaysFromNow) => {
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

    // Iterate and create payments for missing months up to fourDaysFromNow
    // This handles "catch-up" if the server was down or a month was missed
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

      // Check if this payment is due within our window (today to fourDaysFromNow)
      if (nextDueDate > fourDaysFromNow) {
        break; // Beyond our creation window
      }

      // ✅ SKIP if tenant has a leave date set and their leave date is BEFORE or ON the next due date
      // This prevents creating payments for months after they leave
      if (tenant.leaveDate) {
        const tenantLeaveDate = new Date(tenant.leaveDate);
        tenantLeaveDate.setHours(0, 0, 0, 0);
        
        // If they leave before or on the due date, don't create this payment
        if (nextDueDate >= tenantLeaveDate) {
          console.log(`[Payments] Skipping month ${nextMonth}/${nextYear} for ${tenant.name} - leave date ${tenantLeaveDate.toLocaleDateString()} reached.`);
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
 * Auto-create payment records 4 days before they are due
 * Runs daily at 2:00 AM
 */
const autoCreatePayments = cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running auto-create payments cron job...');

    // Get all active tenants with room assignments
    const activeTenants = await Tenant.find({ status: 'ACTIVE', roomId: { $ne: null } })
      .populate('roomId');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fourDaysFromNow = new Date(today);
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    fourDaysFromNow.setHours(23, 59, 59, 999);

    let totalCreated = 0;
    for (const tenant of activeTenants) {
      totalCreated += await processTenantPayments(tenant, today, fourDaysFromNow);
    }

    console.log(`Auto-create payments complete. Created ${totalCreated} new payment(s).`);
  } catch (error) {
    console.error('Error in auto-create payments cron job:', error);
  }
});

/**
 * Automated cleanup of departed tenants
 * Runs daily at 1:00 AM
 * Marks tenants as COMPLETED if their leaveDate has passed
 */
const cleanupDepartedTenants = cron.schedule('0 1 * * *', async () => {
  try {
    console.log('Running departed tenants cleanup job...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active tenants whose leaveDate is in the past
    const departedTenants = await Tenant.find({
      status: 'ACTIVE',
      leaveDate: { $ne: null, $lt: today }
    });

    console.log(`Found ${departedTenants.length} tenants who have passed their leave date.`);

    for (const tenant of departedTenants) {
      try {
        console.log(`Marking tenant ${tenant.name} as COMPLETED...`);
        
        // 1. Free up the room/bed
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

        // 2. Update tenant status
        tenant.status = 'COMPLETED';
        await tenant.save();
        
        console.log(`Tenant ${tenant.name} successfully marked as COMPLETED.`);
      } catch (err) {
        console.error(`Error cleaning up tenant ${tenant._id}:`, err.message);
      }
    }

    console.log('Departed tenants cleanup complete.');
  } catch (error) {
    console.error('Error in departed tenants cleanup job:', error);
  }
});

/**
 * Send payment reminders
 * Runs daily at 9:00 AM
 */
const sendPaymentReminders = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running payment reminders cron job...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    fourDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingPayments = await Payment.find({
      status: { $in: ['PENDING', 'PARTIAL'] },
      dueDate: { $lte: fourDaysFromNow },
    }).populate('tenantId');

    console.log(`Found ${upcomingPayments.length} pending/upcoming payment(s)`);

    upcomingPayments.forEach(payment => {
      // Only remind if tenant is still active
      if (payment.tenantId && payment.tenantId.status === 'ACTIVE') {
        const daysUntilDue = Math.ceil((payment.dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0) {
          console.log(`OVERDUE: ${payment.tenantId.name} - Payment overdue by ${Math.abs(daysUntilDue)} day(s)`);
        } else {
          console.log(`Reminder: ${payment.tenantId.name} - Payment due in ${daysUntilDue} day(s)`);
        }
      }
    });

  } catch (error) {
    console.error('Error in payment reminders cron job:', error);
  }
});

/**
 * Run all checks immediately (called on server start)
 */
const runAllChecksNow = async () => {
  try {
    console.log('Running all checks on server startup...');
    
    // 1. Run cleanup first
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

    // 2. Run payment creation
    const activeTenants = await Tenant.find({ status: 'ACTIVE', roomId: { $ne: null } });
    
    const fourDaysFromNow = new Date(today);
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    fourDaysFromNow.setHours(23, 59, 59, 999);

    for (const tenant of activeTenants) {
      await processTenantPayments(tenant, today, fourDaysFromNow);
    }

    console.log('Startup checks complete.');
  } catch (error) {
    console.error('Error in startup checks:', error);
  }
};

/**
 * Start all payment-related cron jobs
 */
const startPaymentJobs = () => {
  console.log('Starting payment cron jobs...');

  // Run checks immediately on server start
  runAllChecksNow();

  cleanupDepartedTenants.start();
  console.log('Departed tenants cleanup scheduled (daily at 1:00 AM)');

  autoCreatePayments.start();
  console.log('Auto-create payments scheduled (daily at 2:00 AM)');

  sendPaymentReminders.start();
  console.log('Payment reminders scheduled (daily at 9:00 AM)');
};

module.exports = {
  startPaymentJobs,
  runAllChecksNow,
};
