# Everwear Payment Gateway Setup & Integration Guide

Everwear features native multi-currency payment support split by operating territory:
- **India / INR (`in`)**: Razorpay (UPI, Credit/Debit Cards, NetBanking, EMI, Cash On Delivery)
- **Europe / EUR (`dk`, `de`, `fr`, etc.)**: Stripe (Credit Cards, Apple Pay, Google Pay, SEPA)

Both gateways support online payment confirmation, timing-safe cryptographic signature validation, automated webhook synchronization, and administrative refund execution.

---

## 1. Razorpay Configuration (India / INR)

### Step 1: Obtain API Keys
1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Navigate to **Account & Settings** -> **API Keys**.
3. Generate Key Pair:
   - For Testing: Copy `Key Id` (`rzp_test_...`) and `Key Secret`.
   - For Production: Switch to **Live Mode** and generate `rzp_live_...`.

### Step 2: Configure Webhook Endpoint
1. Go to **Account & Settings** -> **Webhooks** -> **Add New Webhook**.
2. **Webhook URL**: `https://api.everwear.com/store/webhooks/razorpay`
3. **Secret**: Enter a strong random secret (e.g., generated with `openssl rand -hex 24`).
4. **Active Events**: Select:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
5. Click **Save**.

### Step 3: Populate Environment Settings
In `apps/backend/.env` (or production container env):
```ini
RAZORPAY_KEY_ID=rzp_live_REPLACE_ME
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```
In `apps/storefront/.env.local`:
```ini
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_REPLACE_ME
```

### Signature Verification Architecture
When the frontend completes payment via Razorpay Checkout, it sends:
- `razorpayOrderId`
- `razorpayPaymentId`
- `razorpaySignature`

The backend verifies the payment via `verifyRazorpaySignature`:
$$\text{Expected} = \text{HMAC-SHA256}(\text{order\_id} \mathbin{\Vert} \text{payment\_id}, \text{secret})$$
using Node.js `crypto.timingSafeEqual` to avoid timing side-channel attacks.

---

## 2. Stripe Configuration (Europe / EUR)

### Step 1: Obtain API Keys
1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com).
2. Go to **Developers** -> **API keys**.
3. Copy:
   - **Publishable key** (`pk_live_...` or `pk_test_...`)
   - **Secret key** (`sk_live_...` or `sk_test_...`)

### Step 2: Configure Webhook Endpoint
1. In Stripe Dashboard, navigate to **Developers** -> **Webhooks** -> **Add destination**.
2. **Endpoint URL**: `https://api.everwear.com/store/webhooks/stripe`
3. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Click **Add endpoint** and reveal the **Signing secret** (`whsec_...`).

### Step 3: Populate Environment Settings
In `apps/backend/.env`:
```ini
STRIPE_SECRET_KEY=sk_live_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_ME
```
In `apps/storefront/.env.local`:
```ini
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_ME
```

### Webhook Verification Architecture
The backend verifies incoming `stripe-signature` headers via `verifyStripeWebhook`:
- Parses timestamp `t` and signature `v1`.
- Enforces a 300-second tolerance window to prevent replay attacks.
- Computes `HMAC-SHA256(timestamp + "." + rawBody, secret)` and timing-safely matches `v1`.

---

## 3. Idempotency & Duplicate Webhook Protection

Both webhook handlers implement atomic database guards:
```typescript
const result = await db.orders().updateOne(
  { _id: orderId, paymentStatus: { $ne: "paid" } },
  { $set: { paymentStatus: "paid", "paymentDetails.paidAt": new Date() } }
)
if (result.matchedCount === 0) {
  // Already processed; return 200 OK without duplicating side effects
  res.json({ status: "ok", duplicate: true })
}
```
If network retries occur, Everwear safely handles the event without duplicate GST invoice issuance or order status discrepancies.

---

## 4. Refund & Credit Note Settlement Workflow

When an order return is inspected and approved in the Admin Console (**Returns & Exchanges** or **Credit Notes & Refunds**):
1. Clicking **Issue Refund** invokes `POST /admin/orders/:id/return-request` with `{ action: "refund" }`.
2. The backend:
   - Identifies whether the order was paid via Razorpay or Stripe.
   - Triggers the live gateway refund API (`createRazorpayRefund` or `createStripeRefund`).
   - Idempotently generates a legal Credit Note (`CN-2026-XXXX`).
   - Marks the order's `paymentStatus` as `refunded` and links the gateway's `refundId`.
