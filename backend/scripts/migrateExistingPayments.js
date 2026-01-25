/**
 * Migration Script: Add dueDate to existing payments
 *
 * Run this ONCE if you have existing payments without dueDate field
 *
 * Usage: node scripts/migrateExistingPayments.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const migratePayments = async () => {
  try {
    await connectDB();

    const Payment = mongoose.model(
      'Payment',
      new mongoose.Schema({}, { strict: false })
    );

    const Occupancy = mongoose.model(
      'Occupancy',
      new mongoose.Schema({}, { strict: false })
    );

    // Find all payments without dueDate
    const paymentsWithoutDueDate = await Payment.find({
      dueDate: { $exists: false },
    }).populate('occupancyId');

    console.log(`\nFound ${paymentsWithoutDueDate.length} payments without dueDate\n`);

    if (paymentsWithoutDueDate.length === 0) {
      console.log('✓ All payments already have dueDate. Nothing to migrate.');
      process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (const payment of paymentsWithoutDueDate) {
      try {
        let dueDay = 5; // Default to 5th

        // Try to get the joining day from occupancy
        if (payment.occupancyId && payment.occupancyId.joinDate) {
          const joinDate = new Date(payment.occupancyId.joinDate);
          dueDay = joinDate.getDate();
        }

        // Calculate dueDate based on month/year and dueDay
        const dueDate = new Date(payment.year, payment.month - 1, dueDay);

        await Payment.updateOne(
          { _id: payment._id },
          { $set: { dueDate: dueDate } }
        );

        updated++;
        console.log(`✓ Updated payment ${payment._id} - Due: ${dueDate.toLocaleDateString()} (Day: ${dueDay})`);
      } catch (error) {
        failed++;
        console.error(`✗ Failed to update payment ${payment._id}:`, error.message);
      }
    }

    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================');
    console.log(`Total payments found: ${paymentsWithoutDueDate.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migratePayments();
