/**
 * Migration script to handle existing data after adding userId field
 *
 * Run this script after updating the models if you have existing data:
 * node scripts/migrateData.js <userId>
 *
 * This will:
 * 1. Drop the old unique index on roomNumber
 * 2. Assign all existing tenants, rooms, occupancies, and payments to the specified userId
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Occupancy = require('../models/Occupancy');
const Payment = require('../models/Payment');

const migrateData = async () => {
  const userId = process.argv[2];

  if (!userId) {
    console.log('Usage: node scripts/migrateData.js <userId>');
    console.log('Example: node scripts/migrateData.js 507f1f77bcf86cd799439011');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop old unique index on roomNumber if it exists
    try {
      await Room.collection.dropIndex('roomNumber_1');
      console.log('Dropped old roomNumber_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('Index roomNumber_1 does not exist, skipping...');
      } else {
        console.log('Error dropping index:', err.message);
      }
    }

    // Update all tenants without userId
    const tenantResult = await Tenant.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: new mongoose.Types.ObjectId(userId) } }
    );
    console.log(`Updated ${tenantResult.modifiedCount} tenants`);

    // Update all rooms without userId
    const roomResult = await Room.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: new mongoose.Types.ObjectId(userId) } }
    );
    console.log(`Updated ${roomResult.modifiedCount} rooms`);

    // Update all occupancies without userId
    const occupancyResult = await Occupancy.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: new mongoose.Types.ObjectId(userId) } }
    );
    console.log(`Updated ${occupancyResult.modifiedCount} occupancies`);

    // Update all payments without userId
    const paymentResult = await Payment.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: new mongoose.Types.ObjectId(userId) } }
    );
    console.log(`Updated ${paymentResult.modifiedCount} payments`);

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

migrateData();
