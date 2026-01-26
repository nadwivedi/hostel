# Manual Payment Management System Design

## 🎯 Your Requirements

1. ✅ **Manual Advance Management** - Owner decides when to use advance
2. ✅ **Partial Payment Support** - Allow tenants to pay in parts
3. ✅ **Better Features** - Additional useful features

---

## 📊 Current System Analysis

### What You Have Now:
```javascript
Occupancy Model:
- advanceAmount: ₹6000 (total advance collected)
- advanceLeft: ₹3000 (remaining advance)
- rentAmount: ₹3000 (monthly rent)

Payment Model:
- month, year, rentAmount
- amountPaid: ₹0 (what tenant paid)
- status: PENDING/PAID/PARTIAL
```

### Current Problems:
1. ❌ **Partial payment** - Status shows 'PARTIAL' but:
   - Can't track multiple partial payments
   - Can't see payment history for one month
   - Can't easily complete remaining amount

2. ❌ **Manual advance** - No UI to:
   - Deduct from advance manually
   - See advance usage history
   - Apply advance to specific months

3. ❌ **Payment tracking** - Can't see:
   - Who paid what and when
   - Multiple payments for same month
   - Payment method (cash/UPI/advance)

---

## 🚀 Recommended Solution

### Solution 1: Payment Transactions (Child Records)

Instead of storing just `amountPaid` in Payment model, create separate transaction records:

```
Payment (Feb 2026)          PaymentTransactions
├── Rent: ₹3000            ├── Feb 15: ₹1000 (cash)
├── Total Paid: ₹3000  →   ├── Feb 20: ₹1500 (UPI)
├── Status: PAID           └── Feb 25: ₹500 (advance)
└── Remaining: ₹0
```

**Benefits:**
- ✅ Track each payment separately
- ✅ Know who paid what, when, and how
- ✅ Complete audit trail
- ✅ Can void/refund individual transactions

---

## 🏗️ Proposed Model Changes

### 1. Enhanced Payment Model

```javascript
// models/Payment.js
const paymentSchema = new mongoose.Schema({
  // Existing fields...
  userId: { type: ObjectId, ref: 'User', required: true },
  occupancyId: { type: ObjectId, ref: 'Occupancy', required: true },
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },

  // Rental details
  rentAmount: { type: Number, required: true },

  // Payment summary (calculated from transactions)
  totalPaid: {
    type: Number,
    default: 0
  },

  paidInCash: { type: Number, default: 0 },
  paidInUPI: { type: Number, default: 0 },
  paidFromAdvance: { type: Number, default: 0 },

  remainingAmount: {
    type: Number,
    default: function() {
      return this.rentAmount - this.totalPaid;
    }
  },

  // Status
  status: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
    default: 'PENDING'
  },

  // Dates
  dueDate: { type: Date, required: true },
  firstPaymentDate: { type: Date }, // Date of first payment
  fullyPaidDate: { type: Date },    // Date when fully paid

  // Reference to all transactions
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentTransaction'
  }],

  // Notes
  notes: { type: String, default: '' }

}, { timestamps: true });

// Auto-calculate status before save
paymentSchema.pre('save', function(next) {
  this.totalPaid = this.paidInCash + this.paidInUPI + this.paidFromAdvance;
  this.remainingAmount = this.rentAmount - this.totalPaid;

  if (this.totalPaid === 0) {
    this.status = 'PENDING';
  } else if (this.totalPaid >= this.rentAmount) {
    this.status = 'PAID';
    if (!this.fullyPaidDate) {
      this.fullyPaidDate = new Date();
    }
  } else {
    this.status = 'PARTIAL';
  }

  // Check if overdue
  if (this.status !== 'PAID' && new Date() > this.dueDate) {
    this.status = 'OVERDUE';
  }

  next();
});
```

### 2. NEW: PaymentTransaction Model

```javascript
// models/PaymentTransaction.js
const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  occupancyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Occupancy',
    required: true
  },

  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },

  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },

  // Transaction details
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  paymentMethod: {
    type: String,
    enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'ADVANCE'],
    required: true
  },

  // For advance payments
  advanceUsed: {
    type: Number,
    default: 0
  },

  advanceBalanceBefore: { type: Number },
  advanceBalanceAfter: { type: Number },

  // Transaction metadata
  transactionDate: {
    type: Date,
    default: Date.now
  },

  transactionId: {
    type: String, // For UPI transaction ID
    default: ''
  },

  receiptNumber: {
    type: String,
    default: function() {
      return `RCP-${Date.now()}`;
    }
  },

  // Description
  description: {
    type: String,
    default: ''
  },

  notes: {
    type: String,
    default: ''
  },

  // Who recorded this transaction
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Status
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'CANCELLED'],
    default: 'SUCCESS'
  }

}, { timestamps: true });

// Index for faster queries
paymentTransactionSchema.index({ paymentId: 1, createdAt: -1 });
paymentTransactionSchema.index({ occupancyId: 1, createdAt: -1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = PaymentTransaction;
```

### 3. Enhanced Occupancy Model

```javascript
// Add to existing Occupancy model:

const occupancySchema = new mongoose.Schema({
  // ... existing fields ...

  // Advance tracking (enhanced)
  advanceAmount: { type: Number, default: 0 },
  advanceUsed: { type: Number, default: 0 },  // NEW: Track total used
  advanceLeft: {
    type: Number,
    default: function() {
      return this.advanceAmount - this.advanceUsed;
    }
  },

  // All advance transactions
  advanceTransactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentTransaction'
  }],

  // Summary
  totalRentPaid: { type: Number, default: 0 },      // NEW
  totalRentDue: { type: Number, default: 0 },       // NEW
  totalOutstanding: { type: Number, default: 0 },   // NEW

  // ... rest of fields ...
});
```

---

## 🎨 UI/UX Design for Manual Payment Management

### Feature 1: Record Payment (with options)

```
┌─────────────────────────────────────────────────────────────────┐
│                     RECORD PAYMENT                              │
│                                                                 │
│  Payment For: February 2026                                     │
│  Tenant: Raj Kumar (Room 101, Bed 2)                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Rent Amount:        ₹3,000                              │  │
│  │  Already Paid:       ₹1,000                              │  │
│  │  Remaining:          ₹2,000                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Amount to Collect: [₹____________] (Max: ₹2,000)              │
│                                                                 │
│  Payment Method:                                                │
│  ○ Cash        ○ UPI/Online      ○ Bank Transfer               │
│  ○ Use Advance (Available: ₹3,000)                              │
│                                                                 │
│  Transaction ID (optional): [________________]                  │
│                                                                 │
│  Payment Date: [15-Feb-2026] 📅                                 │
│                                                                 │
│  Notes (optional):                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [ Cancel ]                        [ Record Payment → ]        │
└─────────────────────────────────────────────────────────────────┘
```

### Feature 2: Payment Detail View (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│                 PAYMENT DETAILS - FEB 2026                      │
│                 Raj Kumar • Room 101                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SUMMARY                                                        │
│  ┌────────────────┬────────────────┬──────────────────────┐    │
│  │ Rent Amount    │ Total Paid     │ Remaining            │    │
│  │ ₹3,000         │ ₹3,000         │ ₹0                   │    │
│  │                │ ✅ PAID         │                      │    │
│  └────────────────┴────────────────┴──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PAYMENT BREAKDOWN                                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 💵 Cash:           ₹1,500                              │    │
│  │ 📱 UPI:            ₹1,000                              │    │
│  │ 💰 From Advance:   ₹500                                │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PAYMENT HISTORY (3 transactions)               [+ Add Payment] │
│                                                                 │
│  📅 15 Feb 2026, 10:30 AM                        RCP-1234567   │
│  💵 Cash: ₹1,500                                               │
│  "First installment"                                           │
│  ────────────────────────────────────────────────────────────  │
│                                                                 │
│  📅 20 Feb 2026, 3:45 PM                         RCP-1234568   │
│  📱 UPI: ₹1,000                                                │
│  Transaction ID: UPI2026022012345                              │
│  "Paid via PhonePe"                                            │
│  ────────────────────────────────────────────────────────────  │
│                                                                 │
│  📅 25 Feb 2026, 11:00 AM                        RCP-1234569   │
│  💰 Advance Deducted: ₹500                                     │
│  Balance: ₹3,000 → ₹2,500                                      │
│  "Deducted remaining amount manually"                          │
│  ────────────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────────┘
```

### Feature 3: Advance Management Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│              ADVANCE MANAGEMENT - RAJ KUMAR                     │
│              Room 101, Bed 2                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ADVANCE SUMMARY                                                │
│  ┌──────────────┬──────────────┬──────────────┬─────────────┐  │
│  │ Total        │ Used         │ Available    │ % Used      │  │
│  │ ₹6,000       │ ₹3,500       │ ₹2,500       │ 58%         │  │
│  └──────────────┴──────────────┴──────────────┴─────────────┘  │
│                                                                 │
│  Progress: [████████████░░░░░░░░░] 58%                         │
│                                                                 │
│  [ Use Advance for Payment → ]                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ADVANCE USAGE HISTORY                        [Download Report] │
│                                                                 │
│  Date           Type            Amount    Balance   Month/Year  │
│  ─────────────────────────────────────────────────────────────  │
│  10 Jan 2026    💵 Collected    +₹6,000   ₹6,000   -           │
│  15 Jan 2026    📤 Deducted     -₹3,000   ₹3,000   Jan 2026    │
│  25 Feb 2026    📤 Deducted     -₹500     ₹2,500   Feb 2026    │
│                                                                 │
│  Total Deductions: ₹3,500 (2 times)                             │
│  Average per deduction: ₹1,750                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Feature 4: Quick Actions in Payments List

```
┌─────────────────────────────────────────────────────────────────┐
│                     PAYMENTS - RAJ KUMAR                        │
└─────────────────────────────────────────────────────────────────┘

Month        Status      Paid      Due       Actions
───────────────────────────────────────────────────────────────────
Jan 2026     ✅ PAID     ₹3,000    ₹0        [View Details]

Feb 2026     ⚠️ PARTIAL  ₹1,500    ₹1,500    [💰 Collect Payment]
                                             [💵 Use Advance]
                                             [View Details]

Mar 2026     ⏰ PENDING  ₹0        ₹3,000    [💰 Collect Payment]
(Due: 15 Mar)                                [💵 Use Advance]
                                             [View Details]
```

---

## 🔧 API Endpoints Needed

### 1. Record Payment

```javascript
POST /api/payments/:paymentId/add-transaction

Request Body:
{
  "amount": 1500,
  "paymentMethod": "CASH",  // CASH, UPI, BANK_TRANSFER, ADVANCE
  "transactionId": "",       // For UPI/Bank
  "transactionDate": "2026-02-15",
  "notes": "First installment",
  "recordedBy": "user_id"
}

Response:
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "payment": { /* updated payment */ },
    "transaction": { /* transaction record */ },
    "occupancy": { /* updated occupancy */ }
  }
}
```

### 2. Use Advance for Payment

```javascript
POST /api/payments/:paymentId/use-advance

Request Body:
{
  "amount": 500,  // Amount to deduct from advance
  "notes": "Deducted remaining amount",
  "recordedBy": "user_id"
}

Response:
{
  "success": true,
  "message": "₹500 deducted from advance",
  "data": {
    "payment": { /* updated payment */ },
    "transaction": { /* transaction record */ },
    "occupancy": {
      "advanceLeft": 2500,
      "advanceUsed": 3500
    }
  }
}
```

### 3. Get Payment Transactions

```javascript
GET /api/payments/:paymentId/transactions

Response:
{
  "success": true,
  "data": [
    {
      "_id": "trans_1",
      "amount": 1500,
      "paymentMethod": "CASH",
      "transactionDate": "2026-02-15",
      "receiptNumber": "RCP-1234567",
      "notes": "First installment"
    },
    // ... more transactions
  ]
}
```

### 4. Get Advance History

```javascript
GET /api/occupancies/:occupancyId/advance-history

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalAdvance": 6000,
      "totalUsed": 3500,
      "availableBalance": 2500,
      "usagePercentage": 58
    },
    "transactions": [
      {
        "date": "2026-01-10",
        "type": "COLLECTED",
        "amount": 6000,
        "balanceAfter": 6000,
        "description": "Initial advance"
      },
      {
        "date": "2026-01-15",
        "type": "DEDUCTED",
        "amount": 3000,
        "balanceAfter": 3000,
        "description": "Deducted for Jan 2026",
        "paymentId": "payment_id"
      }
    ]
  }
}
```

### 5. Void/Cancel Transaction

```javascript
DELETE /api/transactions/:transactionId

Request Body:
{
  "reason": "Entered wrong amount",
  "recordedBy": "user_id"
}

Response:
{
  "success": true,
  "message": "Transaction cancelled",
  "data": {
    "payment": { /* updated payment with recalculated amounts */ },
    "occupancy": { /* updated advance if it was advance deduction */ }
  }
}
```

---

## ✨ Additional Recommended Features

### Feature 1: Payment Reminders & Notifications

```javascript
// In Occupancy Detail Page - Show upcoming payments

┌─────────────────────────────────────────────────────────────────┐
│  UPCOMING PAYMENTS                                              │
│                                                                 │
│  ⚠️  Feb 2026 - Due in 3 days (Feb 15)                          │
│      ₹1,500 remaining                                           │
│      [Send Reminder to Tenant 📧]                               │
│                                                                 │
│  📅 Mar 2026 - Due on Mar 15                                    │
│      ₹3,000 (not yet paid)                                      │
│      [Send Reminder to Tenant 📧]                               │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Button to send WhatsApp/SMS reminder
- Auto-reminder 3 days before due date
- Track reminder history

### Feature 2: Bulk Payment Collection

```javascript
// Useful when collecting rent from all tenants

┌─────────────────────────────────────────────────────────────────┐
│           BULK PAYMENT COLLECTION - FEB 2026                    │
│                                                                 │
│  Select tenants to record payment:                              │
│                                                                 │
│  ☑ Raj Kumar (Room 101) - ₹3,000 due                            │
│  ☑ Amit Singh (Room 102) - ₹3,500 due                           │
│  ☐ Priya Sharma (Room 103) - ₹0 (already paid)                  │
│  ☑ Rahul Verma (Room 104) - ₹3,000 due                          │
│                                                                 │
│  Payment Method: ○ Cash  ○ UPI  ○ Bank Transfer                 │
│  Payment Date: [15-Feb-2026]                                    │
│                                                                 │
│  Total to collect: ₹9,500 from 3 tenants                        │
│                                                                 │
│  [ Cancel ]              [ Record All Payments → ]             │
└─────────────────────────────────────────────────────────────────┘
```

### Feature 3: Payment Calendar View

```javascript
┌─────────────────────────────────────────────────────────────────┐
│                    FEBRUARY 2026                                │
│                                                                 │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                              │
│                          1    2    3                            │
│   4    5    6    7    8    9   10                               │
│  11   12   13   14  [15]  16   17   ← Due dates marked         │
│  18   19   20   21   22   23   24                               │
│  25   26   27   28                                              │
│                                                                 │
│  Legend:                                                        │
│  🟢 Paid  🟡 Partial  🔴 Pending  ⚠️ Overdue                     │
│                                                                 │
│  Feb 15 - 12 due payments:                                      │
│  🟢 Paid: 5   🟡 Partial: 2   🔴 Pending: 3   ⚠️ Overdue: 2     │
└─────────────────────────────────────────────────────────────────┘
```

### Feature 4: Payment Receipt Generation

```javascript
// Auto-generate receipt for each transaction

┌─────────────────────────────────────────────────────────────────┐
│                        PAYMENT RECEIPT                          │
│                      ABC Hostel Management                      │
│                                                                 │
│  Receipt No: RCP-1234567                Date: 15-Feb-2026       │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  Received From: Raj Kumar                                       │
│  Room: 101, Bed: 2                                              │
│  Mobile: +91 9876543210                                         │
│                                                                 │
│  Payment For: February 2026 Rent                                │
│  Amount Received: ₹1,500 (One Thousand Five Hundred Only)       │
│  Payment Method: Cash                                           │
│                                                                 │
│  Rent Amount: ₹3,000                                            │
│  Previously Paid: ₹0                                            │
│  This Payment: ₹1,500                                           │
│  Balance Due: ₹1,500                                            │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│  Received By: Owner Name                  Signature: _________  │
│                                                                 │
│  [ Print Receipt 🖨️ ]  [ Download PDF 📄 ]  [ Share 📧 ]        │
└─────────────────────────────────────────────────────────────────┘
```

### Feature 5: Defaulter Report

```javascript
┌─────────────────────────────────────────────────────────────────┐
│                      DEFAULTER REPORT                           │
│                      As of: 25-Feb-2026                         │
│                                                                 │
│  Filters: [All Rooms ▾] [All Status ▾] [Export Excel]          │
└─────────────────────────────────────────────────────────────────┘

Tenant           Room    Month      Due Date    Days      Amount
                                               Overdue     Due
───────────────────────────────────────────────────────────────────
Amit Singh       102     Feb 2026   15 Feb      10 days   ₹3,500
Rahul Verma      104     Feb 2026   15 Feb      10 days   ₹3,000
Priya Sharma     103     Jan 2026   15 Jan      40 days   ₹3,000

Total Outstanding: ₹9,500 from 3 tenants

[ Send Bulk Reminder ]  [ Generate Report PDF ]
```

### Feature 6: Dashboard Summary Cards

```javascript
┌──────────────────────────────────────────────────────────────────┐
│                    PAYMENT DASHBOARD                             │
└──────────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┬──────────────────────┐
│ This Month  │ Collected   │ Pending     │ Collection Rate      │
│ Due         │             │             │                      │
│ ₹45,000     │ ₹32,000     │ ₹13,000     │ 71% (16/20 tenants)  │
│             │ (71%)       │ (29%)       │                      │
└─────────────┴─────────────┴─────────────┴──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  RECENT PAYMENTS (Today)                                        │
│                                                                 │
│  10:30 AM - Raj Kumar - ₹3,000 (Cash) - Feb 2026              │
│  11:45 AM - Amit Singh - ₹1,500 (UPI) - Feb 2026 (Partial)    │
│  02:15 PM - Priya Sharma - ₹3,000 (Bank) - Feb 2026           │
│                                                                 │
│  Total Collected Today: ₹7,500 (3 payments)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Feature 7: Payment History Export

```javascript
// Export payment data for accounting

Export Options:
- Excel/CSV format
- Date range filter
- Per tenant or all tenants
- Include/exclude advance transactions
- Group by month/tenant/payment method

Exported columns:
- Date, Tenant Name, Room, Payment Month, Amount, Method,
  Receipt No, Status, Notes
```

### Feature 8: Smart Advance Suggestions

```javascript
// When recording payment, show smart suggestions

┌─────────────────────────────────────────────────────────────────┐
│  RECORD PAYMENT - FEB 2026                                      │
│  Raj Kumar (Advance Available: ₹2,500)                          │
│                                                                 │
│  Rent: ₹3,000 | Paid: ₹1,500 | Remaining: ₹1,500              │
│                                                                 │
│  💡 Smart Suggestion:                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Use ₹1,500 from advance to complete this payment?       │  │
│  │ This will clear Feb 2026 and leave ₹1,000 in advance    │  │
│  │                                                          │  │
│  │ [ Yes, Use Advance ] [ No, Collect Cash Instead ]       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparison: Before vs After

### Before (Current System):
```
Payment Record:
- Month: Feb 2026
- Rent: ₹3000
- Amount Paid: ₹2000 (❓ How? When? Cash or advance?)
- Status: PARTIAL
- Remaining: ₹1000

Problems:
❌ Can't see payment history
❌ Don't know payment method
❌ Can't track multiple payments
❌ No advance usage tracking
```

### After (Improved System):
```
Payment Record:
- Month: Feb 2026
- Rent: ₹3000
- Total Paid: ₹3000 ✅
- Status: PAID

Payment Breakdown:
✅ Feb 15: ₹1500 (Cash)
✅ Feb 20: ₹1000 (UPI - Txn: UPI2026...)
✅ Feb 25: ₹500 (Advance deducted)

Advance Impact:
Before: ₹3000 → After: ₹2500

Benefits:
✅ Complete transparency
✅ Track each payment
✅ Know payment methods
✅ Advance usage history
```

---

## 🎯 Implementation Priority

### Phase 1: Core (Must Have)
1. ✅ PaymentTransaction model
2. ✅ Record payment API with method selection
3. ✅ Use advance API
4. ✅ Enhanced payment detail view
5. ✅ Transaction history in UI

### Phase 2: Enhancements (Should Have)
1. ✅ Receipt generation
2. ✅ Payment calendar
3. ✅ Defaulter report
4. ✅ Bulk payment collection
5. ✅ Dashboard summary

### Phase 3: Nice to Have
1. ✅ Payment reminders
2. ✅ SMS/WhatsApp integration
3. ✅ Excel export
4. ✅ Smart suggestions
5. ✅ Analytics & charts

---

## 💡 Summary

Your request for **manual advance management** and **partial payments** is actually BETTER than auto-deduction because:

✅ **More Control**: Owner decides when to use advance
✅ **More Flexible**: Can handle any payment scenario
✅ **More Transparent**: Complete payment history
✅ **Better for Tenants**: Encourages cash payment

The key is proper **transaction tracking** - each payment (cash/UPI/advance) is recorded separately, giving you complete visibility and control.

Would you like me to start implementing this system? I'll begin with:
1. PaymentTransaction model
2. Enhanced Payment model
3. APIs for recording payments
4. UI for payment management
