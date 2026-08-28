# Softmato Technology Pvt Ltd — Chart of Accounts & Posting Rules

**Entity:** single legal entity, PAN-registered (not VAT).
**Fiscal year:** Shrawan 1 – Ashad end (Bikram Sambat).
**Currency:** NPR. All amounts stored as `BIGINT` in **paisa**.
**Product attribution:** a dimension on every ledger line, not a separate account.

> This is a working draft based on standard practice for a Nepali service
> company. It must be reviewed and signed off by a licensed accountant before
> the first period close. Treatment of deferred revenue, TDS, and depreciation
> in particular is a policy decision, not a software decision.

---

## 1. Account numbering

| Range     | Class              | Normal balance |
| --------- | ------------------ | -------------- |
| 1000–1999 | Assets             | Debit          |
| 2000–2999 | Liabilities        | Credit         |
| 3000–3999 | Equity             | Credit         |
| 4000–4999 | Revenue            | Credit         |
| 5000–5999 | Direct costs       | Debit          |
| 6000–6999 | Operating expenses | Debit          |

Leaf accounts only are postable. Header accounts (marked ▸) exist for grouping
in reports and must reject direct postings.

---

## 2. Assets

```
▸ 1000  CURRENT ASSETS
  1010  Cash in Hand
  1020  Bank — Current Account                     [per bank account]
  1021  Bank — Savings Account

▸ 1030  PAYMENT PROVIDER BALANCES
  1031  eSewa Merchant Wallet
  1032  Khalti Merchant Wallet
  1033  Fonepay Settlement Account
  1039  Provider Funds in Transit

▸ 1100  RECEIVABLES
  1110  Accounts Receivable — SaaS Subscriptions
  1120  Accounts Receivable — Projects & Agency
  1130  Accounts Receivable — Maintenance & Support
  1190  Allowance for Doubtful Accounts            (contra)

▸ 1200  OTHER CURRENT ASSETS
  1210  Advance Tax — TDS Deducted by Customers
  1220  Prepaid Expenses
  1230  Security Deposits
  1240  Staff Advances

▸ 1500  FIXED ASSETS
  1510  Computers & Equipment
  1520  Furniture & Fixtures
  1530  Software Licenses (capitalised)
  1590  Accumulated Depreciation                   (contra)
```

**Why provider wallets are separate accounts.** Money sitting in your eSewa
merchant wallet is yours but not yet in your bank. Keeping it distinct is what
makes reconciliation possible: the balance of account 1031 must equal what eSewa
says you hold. Any difference is an exception to investigate.

**1210 matters more than it looks.** Nepali business customers withhold TDS
(commonly 1.5% on service payments) and pay you the net. That withheld amount is
tax already paid on your behalf and is credited against your annual liability.
If you don't track it per invoice, you lose the deduction.

---

## 3. Liabilities

```
▸ 2000  CURRENT LIABILITIES
  2010  Accounts Payable — Trade
  2020  Accrued Expenses
  2030  Salaries Payable

▸ 2040  STATUTORY PAYABLES
  2041  TDS Payable — Salary
  2042  TDS Payable — Contractor / Professional
  2043  TDS Payable — Rent
  2044  SSF / Provident Fund Payable
  2050  Income Tax Payable

▸ 2100  CUSTOMER OBLIGATIONS
  2110  Deferred Revenue — Subscriptions
  2120  Customer Advances / Unapplied Receipts
  2130  Refunds Payable
  2140  Chargeback / Dispute Reserve

▸ 2200  OTHER
  2210  Loans Payable — Short Term
  2220  Director's Loan
```

**2110 is the account that makes SaaS accounting correct.** When a hostel pays
NPR 12,000 for a year upfront, you have not earned NPR 12,000 — you have earned
nothing yet and owe twelve months of service. Revenue is recognised NPR 1,000
per month. Skipping this overstates revenue and distorts every month's P&L.

**2130 vs. contra-revenue.** Use 2130 when a refund is approved but not yet
paid out. Once paid, it clears. The revenue reversal itself goes to 4900.

---

## 4. Equity

```
  3010  Share Capital
  3020  Additional Paid-in Capital
  3100  Retained Earnings
  3900  Current Year Earnings                      [system-maintained]
```

3900 is computed by the system at close, never posted to directly.

---

## 5. Revenue

```
  4010  SaaS Subscription Revenue
  4020  Software Development Revenue
  4030  Website & Design Services Revenue
  4040  Maintenance & Support Revenue
  4050  Setup / Onboarding Fees
  4090  Other Income

  4900  Refunds & Sales Returns                    (contra-revenue)
  4910  Discounts Allowed                          (contra-revenue)
```

Revenue is **not** split per product here. HostelHub and QuestionCall revenue
both post to 4010, tagged with `product_id`. This keeps the COA stable as you
add products and still gives you per-product P&L through the dimension.

---

## 6. Direct costs

```
  5010  Payment Provider Fees                      [eSewa / Khalti / Fonepay]
  5020  Hosting & Infrastructure                   [Vercel, Neon, Upstash]
  5030  Third-party Software & API Costs
  5040  Subcontractor & Freelancer Costs
  5050  Domains, SSL & Registrations
  5060  Bank Charges — Merchant
```

5010 is tagged by product too, so you can see which SaaS is expensive to
collect for. Khalti's lookup response returns the fee directly — capture it
rather than computing a percentage.

---

## 7. Operating expenses

```
  6010  Salaries & Wages
  6020  Staff Benefits & Welfare
  6030  Office Rent
  6040  Electricity & Utilities
  6050  Internet & Communication
  6060  Marketing & Advertising
  6070  Professional Fees                          [audit, legal, accounting]
  6080  Bank Charges — General
  6090  Travel & Transport
  6100  Office Supplies & Consumables
  6110  Depreciation
  6120  Repairs & Maintenance
  6130  Training & Development
  6140  Insurance
  6200  Foreign Exchange Gain / Loss
  6900  Miscellaneous Expenses
```

---

## 8. Product dimension

Every ledger line carries an optional `product_id`. Not accounts — a dimension.

```
  hostelhub       SaaS
  questioncall    SaaS
  agency          Project & design work
  corporate       Shared / unattributable overhead
```

Adding a product is a row insert. It never touches the chart of accounts.

---

## 9. Posting rules

Each rule below is a journal entry the system generates automatically. Debits
first, then credits. All amounts illustrative, in NPR.

### 9.1 Subscription invoice issued — NPR 12,000 for 12 months

```
Dr  1110  AR — SaaS Subscriptions              12,000
    Cr  2110  Deferred Revenue — Subscriptions          12,000
```

No revenue yet. You've created a receivable and an obligation.

### 9.2 Payment received via Khalti — fee NPR 240, settled net

```
Dr  1032  Khalti Merchant Wallet               11,760
Dr  5010  Payment Provider Fees                   240
    Cr  1110  AR — SaaS Subscriptions                   12,000
```

Triggered only on a verified `Completed` lookup result — never on the redirect.

### 9.3 Payment received via manual QR — **withdrawn 2026-08-16**

```
Dr  1020  Bank — Current Account               12,000
    Cr  1110  AR — SaaS Subscriptions                   12,000
```

**Nothing posts this any more.** The manual QR flow was removed; every payment
is confirmed by a gateway and posts §9.2 instead. The entry is left here rather
than deleted because posted history is not rewritten — if any journal was ever
made under this rule it is still on the books and still has to be readable.

The section number is kept so references to §9.4 onwards stay correct.

### 9.4 Monthly revenue recognition — run at each month end

```
Dr  2110  Deferred Revenue — Subscriptions      1,000
    Cr  4010  SaaS Subscription Revenue                  1,000
```

One entry per active subscription, per period. Automated by scheduled job.

### 9.5 Provider settles to bank

```
Dr  1020  Bank — Current Account               11,760
    Cr  1032  Khalti Merchant Wallet                    11,760
```

Posted from the settlement advice, not assumed. Until this fires, 1032 holds
a real balance you can reconcile against the provider's dashboard.

### 9.6 Refund issued — NPR 3,000, 9 months unearned

```
Dr  2110  Deferred Revenue — Subscriptions      3,000
    Cr  1032  Khalti Merchant Wallet                     3,000
```

If the period were already earned, debit 4900 instead of 2110. The system
decides based on how much of the subscription has been recognised.

### 9.7 Agency invoice — NPR 100,000, client withholds 1.5% TDS

Invoice:

```
Dr  1120  AR — Projects & Agency              100,000
    Cr  4020  Software Development Revenue             100,000
```

Payment of NPR 98,500:

```
Dr  1020  Bank — Current Account               98,500
Dr  1210  Advance Tax — TDS Deducted            1,500
    Cr  1120  AR — Projects & Agency                   100,000
```

Store the TDS certificate reference against the payment. You need it at filing.

### 9.8 Salary paid — gross NPR 50,000, TDS NPR 3,000

```
Dr  6010  Salaries & Wages                     50,000
    Cr  2041  TDS Payable — Salary                       3,000
    Cr  1020  Bank — Current Account                    47,000
```

TDS deposit later clears 2041.

### 9.9 Infrastructure expense — Vercel USD 20 at NPR 138

```
Dr  5020  Hosting & Infrastructure              2,760
    Cr  1020  Bank — Current Account                     2,760
```

Store `amount_minor`, `currency`, and `fx_rate` on the source document. FX
differences on settlement go to 6200.

### 9.10 Correction

Never edit a posted entry. Post a reversal with `reverses_journal_id` set, then
post the correct entry. Both remain visible in the audit trail.

---

## 10. Reconciliation targets

Each provider balance account must tie to an external source:

| Account                     | Reconciles against                |
| --------------------------- | --------------------------------- |
| 1031 eSewa Merchant Wallet  | eSewa merchant dashboard balance  |
| 1032 Khalti Merchant Wallet | Khalti merchant dashboard balance |
| 1033 Fonepay Settlement     | Bank settlement advice            |
| 1020 Bank — Current         | Bank statement                    |

A mismatch sets the period to `RECONCILIATION_REQUIRED` and blocks close.

---

## 11. Open items for the accountant

1. **Revenue recognition policy.** Monthly straight-line on deferred revenue is
   assumed here. Confirm this matches how you want to report.
2. **Depreciation method and rates** for 1510–1530 under Nepali income tax rules.
3. **TDS rates** applicable to your customer and vendor categories.
4. **Whether setup fees (4050) are recognised immediately** or deferred across
   the subscription term.
5. **Opening balances** as at the go-live date. Recommended approach: start the
   ledger fresh with opening balances rather than importing historical manual
   transactions.
6. **VAT threshold monitoring.** PAN-only today, but registration becomes
   mandatory above the turnover threshold. The system should track annual
   turnover and warn well before you cross it.
