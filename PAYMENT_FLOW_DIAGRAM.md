# Payment System Flow Diagrams

## 🔄 Current Payment Flow (As-Is)

```
┌─────────────────────────────────────────────────────────────────┐
│                     OCCUPANCY CREATED                           │
│  Tenant: Raj Kumar                                              │
│  Rent: ₹3000/month                                              │
│  Advance: ₹6000                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              AUTO-CREATE FIRST 2 PAYMENTS                       │
│                                                                 │
│  Month 1 (Jan 2026):                                            │
│    Status: PAID                                                 │
│    Amount: ₹3000                                                │
│    Paid From: Advance                                           │
│    Advance Left: ₹3000                                          │
│                                                                 │
│  Month 2 (Feb 2026):                                            │
│    Status: PENDING                                              │
│    Amount: ₹3000                                                │
│    Due Date: Feb 15, 2026                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SCENARIO 1: ON TIME                        │
│                                                                 │
│  Feb 15: Tenant pays ₹3000                                      │
│    ✅ Payment Status: PAID                                      │
│    ✅ Create Month 3 payment                                    │
│    ℹ️  Advance Left: ₹3000 (unchanged)                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  SCENARIO 2: PARTIAL PAYMENT                    │
│                                                                 │
│  Feb 15: Tenant pays ₹1500                                      │
│    ⚠️  Payment Status: PARTIAL                                  │
│    ⚠️  Remaining: ₹1500                                         │
│    ❌ Month 3 NOT created (waiting for full payment)            │
│    ❌ Advance NOT deducted                                      │
│    ⚠️  Manual intervention needed!                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   SCENARIO 3: NO PAYMENT                        │
│                                                                 │
│  Feb 15: Due date passes                                        │
│  Feb 20: 5 days overdue                                         │
│  Feb 25: 10 days overdue                                        │
│    ❌ Payment Status: PENDING (stuck)                           │
│    ❌ Advance NOT auto-deducted                                 │
│    ❌ Month 3 NOT created                                       │
│    ⚠️  Owner must manually handle!                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Improved Payment Flow (To-Be)

```
┌─────────────────────────────────────────────────────────────────┐
│                     OCCUPANCY CREATED                           │
│  Tenant: Raj Kumar                                              │
│  Rent: ₹3000/month                                              │
│  Advance: ₹6000                                                 │
│  Settings:                                                      │
│    - Grace Period: 5 days                                       │
│    - Auto-deduct: Enabled                                       │
│    - Late Fee: ₹50/day                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│       AUTO-CREATE FIRST 2 PAYMENTS + LOG TRANSACTION            │
│                                                                 │
│  Month 1 (Jan 2026):                                            │
│    Status: PAID                                                 │
│    Amount: ₹3000                                                │
│    Paid From Advance: ₹3000                                     │
│                                                                 │
│  💰 TRANSACTION CREATED:                                        │
│    Type: ADVANCE_DEDUCTION                                      │
│    Amount: -₹3000                                               │
│    Balance Before: ₹6000                                        │
│    Balance After: ₹3000                                         │
│    Description: "First month rent (Jan 2026)"                   │
│                                                                 │
│  Month 2 (Feb 2026):                                            │
│    Status: PENDING                                              │
│    Due Date: Feb 15, 2026                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              SCENARIO 1: ON TIME PAYMENT                        │
│                                                                 │
│  Feb 15: Tenant pays ₹3000 cash                                 │
│    ✅ Payment Status: PAID                                      │
│    ✅ Create Month 3 payment                                    │
│                                                                 │
│  💰 TRANSACTION CREATED:                                        │
│    Type: RENT_PAYMENT                                           │
│    Amount: ₹3000                                                │
│    Advance Balance: ₹3000 (unchanged)                           │
│    Description: "Cash payment for Feb 2026"                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│            SCENARIO 2: PARTIAL PAYMENT (IMPROVED)               │
│                                                                 │
│  Feb 15: Tenant pays ₹1500                                      │
│    ⚠️  Payment Status: PARTIAL                                  │
│    ⚠️  Remaining: ₹1500                                         │
│                                                                 │
│  💰 TRANSACTION CREATED:                                        │
│    Type: PARTIAL_PAYMENT                                        │
│    Amount: ₹1500                                                │
│    Remaining: ₹1500                                             │
│                                                                 │
│  📧 NOTIFICATION SENT:                                          │
│    "Partial payment received. ₹1500 pending."                   │
│    "Pay within 5 days to avoid advance deduction"               │
│                                                                 │
│  ⏰ Feb 20 (5 days later) - GRACE PERIOD OVER:                  │
│    🤖 AUTO-DEDUCT ₹1500 from advance                            │
│    ✅ Payment Status: PAID                                      │
│    ✅ Create Month 3 payment                                    │
│                                                                 │
│  💰 TRANSACTION CREATED:                                        │
│    Type: ADVANCE_DEDUCTION                                      │
│    Amount: -₹1500                                               │
│    Balance Before: ₹3000                                        │
│    Balance After: ₹1500                                         │
│    Description: "Auto-deducted remaining for Feb 2026"          │
│                                                                 │
│  📧 NOTIFICATION SENT:                                          │
│    "₹1500 deducted from advance for Feb rent"                   │
│    "Advance balance: ₹1500"                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│         SCENARIO 3: NO PAYMENT (IMPROVED - AUTO-DEDUCT)         │
│                                                                 │
│  Feb 15: Due date (no payment)                                  │
│    📧 Reminder sent: "Rent due today"                           │
│                                                                 │
│  Feb 17: 2 days overdue                                         │
│    📧 Warning sent: "2 days overdue. Pay within 3 days"         │
│                                                                 │
│  Feb 20: 5 days overdue - GRACE PERIOD OVER                     │
│    🤖 CRON JOB RUNS (3:00 AM):                                  │
│       - Calculate overdue: 5 days                               │
│       - Calculate late fee: 5 × ₹50 = ₹250                      │
│       - Total due: ₹3000 + ₹250 = ₹3250                         │
│       - Check advance: ₹3000 available ❌ (insufficient!)       │
│                                                                 │
│    ⚠️  INSUFFICIENT ADVANCE - NO AUTO-DEDUCT                    │
│                                                                 │
│  📧 CRITICAL NOTIFICATION SENT:                                 │
│    To Tenant: "Payment overdue! Advance insufficient"           │
│    To Owner: "Tenant Raj - Payment overdue, needs attention"    │
│                                                                 │
│  💰 TRANSACTION CREATED (Attempted):                            │
│    Type: AUTO_DEDUCT_FAILED                                     │
│    Required: ₹3250                                              │
│    Available: ₹3000                                             │
│    Status: FAILED                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│      SCENARIO 4: NO PAYMENT (SUFFICIENT ADVANCE)                │
│                                                                 │
│  Feb 15: Due date (no payment)                                  │
│  Feb 20: 5 days overdue - GRACE PERIOD OVER                     │
│                                                                 │
│  🤖 CRON JOB RUNS (3:00 AM):                                    │
│    - Calculate overdue: 5 days                                  │
│    - Calculate late fee: 5 × ₹50 = ₹250                         │
│    - Total due: ₹3000 + ₹250 = ₹3250                            │
│    - Check advance: ₹6000 available ✅                          │
│                                                                 │
│  🤖 AUTO-DEDUCT FROM ADVANCE:                                   │
│    ✅ Deduct ₹3250 from advance                                 │
│    ✅ Payment Status: PAID                                      │
│    ✅ Create Month 3 payment                                    │
│                                                                 │
│  💰 TRANSACTION CREATED:                                        │
│    Type: ADVANCE_DEDUCTION                                      │
│    Amount: -₹3250                                               │
│    Balance Before: ₹6000                                        │
│    Balance After: ₹2750                                         │
│    Breakdown:                                                   │
│      - Rent: ₹3000                                              │
│      - Late Fee: ₹250 (5 days × ₹50)                            │
│    Description: "Auto-deducted for Feb 2026 (5 days overdue)"   │
│                                                                 │
│  📧 NOTIFICATION SENT:                                          │
│    To Tenant:                                                   │
│      "₹3250 deducted from advance (incl. ₹250 late fee)"        │
│      "Advance balance: ₹2750"                                   │
│      "Please pay on time to avoid late fees"                    │
│                                                                 │
│    To Owner:                                                    │
│      "Auto-deducted ₹3250 for Raj Kumar (Feb 2026)"             │
│      "5 days overdue, ₹250 late fee charged"                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Advance Balance Timeline

### Current System (No Auto-Deduct)
```
Month    | Due Date  | Payment  | Advance Balance | Status
---------|-----------|----------|-----------------|--------
Jan 2026 | Jan 15    | Auto     | ₹6000 → ₹3000  | ✅ PAID
Feb 2026 | Feb 15    | ₹3000    | ₹3000          | ✅ PAID
Mar 2026 | Mar 15    | ❌ NONE  | ₹3000          | ❌ PENDING (stuck!)
Apr 2026 | Apr 15    | ❌ NONE  | ₹3000          | ⏸️  Not created
May 2026 | May 15    | ❌ NONE  | ₹3000          | ⏸️  Not created

⚠️  Problem: Advance not utilized, payments stuck, manual work needed
```

### Improved System (With Auto-Deduct)
```
Month    | Due Date  | Payment  | Auto-Deduct | Advance Balance | Status
---------|-----------|----------|-------------|-----------------|--------
Jan 2026 | Jan 15    | Auto     | ₹3000       | ₹6000 → ₹3000  | ✅ PAID
Feb 2026 | Feb 15    | ❌ NONE  | ₹3000 (day 5)| ₹3000 → ₹0     | ✅ PAID
Mar 2026 | Mar 15    | ❌ NONE  | ❌ Failed    | ₹0             | ❌ OVERDUE
Apr 2026 | Apr 15    | -        | -           | ₹0             | ⏸️  Not created

📧 Notification sent to owner: "Advance exhausted for Raj Kumar"
```

---

## 🔍 Transaction History Example

```
┌─────────────────────────────────────────────────────────────────┐
│         ADVANCE TRANSACTION HISTORY - RAJ KUMAR                 │
│         Occupancy: Room 101, Bed 2                              │
└─────────────────────────────────────────────────────────────────┘

Date         | Type               | Amount   | Balance | Description
-------------|--------------------|---------:|--------:|---------------------------
Jan 10, 2026 | ADVANCE_COLLECTED  | +₹6,000  | ₹6,000 | Initial advance payment
Jan 15, 2026 | ADVANCE_DEDUCTION  | -₹3,000  | ₹3,000 | First month rent (Jan 2026)
Feb 20, 2026 | ADVANCE_DEDUCTION  | -₹3,250  | -₹250  | Feb rent + late fee (5 days)
             | (Auto-deducted)    |          |        | ₹3000 rent + ₹250 late fee
Feb 20, 2026 | LATE_FEE          | -₹250    | -₹500  | Late payment fee (5 days)
Mar 01, 2026 | RENT_PAYMENT       | +₹3,500  | ₹3,000 | Cash payment for Mar 2026
May 10, 2026 | RENT_PAYMENT       | +₹2,000  | ₹5,000 | Partial payment for May
May 17, 2026 | ADVANCE_DEDUCTION  | -₹1,000  | ₹4,000 | Auto-deduct remaining May
Jun 30, 2026 | REFUND             | -₹4,000  | ₹0     | Checkout - advance refund

                                   Total Advance Used: ₹7,500
                                   Total Refunded: ₹4,000
```

---

## 🎯 Decision Tree: When to Auto-Deduct

```
                    Payment Due Date Reached
                            ↓
                    Did tenant pay?
                    ↙             ↘
                YES                NO
                 ↓                  ↓
         Mark as PAID          Start grace period
         Create next           (default: 5 days)
         month payment              ↓
                               Grace period over?
                                ↙         ↘
                              NO           YES
                               ↓            ↓
                        Keep waiting   Calculate total due:
                                      (rent + late fee)
                                            ↓
                                    Sufficient advance?
                                      ↙           ↘
                                    YES            NO
                                     ↓              ↓
                            Auto-deduct from    Send critical
                            advance             notification
                            ↓                   to owner
                            Mark as PAID        ↓
                            Create next         Manual
                            month payment       intervention
                            Log transaction     needed
                            Send notification
```

---

## 💡 Best Practices

### ✅ DO:
- Keep grace period (5-7 days)
- Send notifications before auto-deduct
- Log all transactions
- Create next month only when current is PAID
- Allow owners to configure settings per occupancy

### ❌ DON'T:
- Auto-deduct immediately on due date
- Deduct without notification
- Skip transaction logging
- Create future payments when current is pending
- Use same settings for all tenants

---

## 📈 Reporting Capabilities (After Improvement)

With transaction history, you can generate:

1. **Advance Usage Report**: How much advance used each month
2. **Late Payment Report**: Which tenants paid late, how often
3. **Late Fee Revenue**: Total late fees collected
4. **Auto-Deduct Report**: How many payments auto-deducted
5. **Cash vs Advance**: Percentage of payments from advance vs cash
6. **Tenant Payment Score**: On-time payment percentage per tenant

---

This improved system is **fully automated**, **transparent**, and **fair** to both owners and tenants!
