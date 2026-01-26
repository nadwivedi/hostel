# Cron Jobs Documentation

This folder contains all scheduled background jobs for the hostel management system.

## Overview

The cron job system automatically creates payment records and sends reminders to ensure continuous payment tracking for all active occupancies.

## Jobs

### Payment Jobs (`paymentJobs.js`)

#### 1. Auto-Create Payments
- **Schedule**: Daily at 2:00 AM
- **Cron Expression**: `0 2 * * *`
- **Purpose**: Automatically creates missing payment records for all active occupancies

**How it works:**
1. Finds all active occupancies
2. For each occupancy, checks the latest payment
3. Creates payments for current month and next month if they don't exist
4. Uses the tenant's join date to determine the due date (same day each month)

**Example:**
- Tenant joined on Jan 15th
- When occupancy created: Month 1 (PAID) and Month 2 (PENDING) are created
- When Month 2 is marked as paid: Month 3 (PENDING) is created automatically
- Cron job ensures no gaps: If Month 3 doesn't exist, it will be created at 2:00 AM

#### 2. Payment Reminders
- **Schedule**: Daily at 9:00 AM
- **Cron Expression**: `0 9 * * *`
- **Purpose**: Sends reminders for upcoming payments (due in next 3 days)

**Future Enhancement:**
- Currently logs to console
- Can be extended to send Email/SMS notifications

## File Structure

```
jobs/
├── index.js           # Main entry point, starts all cron jobs
├── paymentJobs.js     # Payment-related cron jobs
└── README.md          # This file
```

## How to Add New Jobs

1. Create a new job file (e.g., `tenantJobs.js`)
2. Define your cron schedules using `node-cron`
3. Export a start function (e.g., `startTenantJobs`)
4. Import and call it in `jobs/index.js`

Example:
```javascript
// jobs/tenantJobs.js
const cron = require('node-cron');

const cleanupInactiveTenants = cron.schedule('0 3 * * *', async () => {
  // Your job logic here
});

const startTenantJobs = () => {
  cleanupInactiveTenants.start();
  console.log('✓ Tenant jobs started');
};

module.exports = { startTenantJobs };
```

Then in `jobs/index.js`:
```javascript
const { startPaymentJobs } = require('./paymentJobs');
const { startTenantJobs } = require('./tenantJobs');

const startAllJobs = () => {
  startPaymentJobs();
  startTenantJobs();
};
```

## Cron Expression Format

```
 ┌────────────── second (optional, 0-59)
 │ ┌──────────── minute (0-59)
 │ │ ┌────────── hour (0-23)
 │ │ │ ┌──────── day of month (1-31)
 │ │ │ │ ┌────── month (1-12)
 │ │ │ │ │ ┌──── day of week (0-6, Sunday=0)
 │ │ │ │ │ │
 * * * * * *
```

**Common Examples:**
- `0 2 * * *` - Every day at 2:00 AM
- `0 9 * * *` - Every day at 9:00 AM
- `0 0 * * 0` - Every Sunday at midnight
- `*/15 * * * *` - Every 15 minutes
- `0 0 1 * *` - First day of every month at midnight

## Testing

To test cron jobs without waiting for the scheduled time:

1. Temporarily change the cron expression to run more frequently:
   ```javascript
   // Run every minute for testing
   const autoCreatePayments = cron.schedule('* * * * *', async () => {
   ```

2. Or manually trigger in development by exporting and calling the job function directly

## Monitoring

All cron jobs log their execution to the console with emoji indicators:
- 🔄 Job started
- ✓ Success
- ⚠️ Warning
- ❌ Error

Check your server logs to monitor job execution.
