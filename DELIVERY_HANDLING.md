# Delivery Handling: Shipping Address, Tracking & Auto-Confirmation

## Overview

Add shipping address collection, seller sales dashboard, tracking integration with Ship24, and auto-delivery confirmation after 3 days.

## Complete Flow

```
Buyer wins auction / Buy Now
    ↓
Buyer has shipping address? (required before bid/purchase)
    ↓
Settlement created with buyer's shipping address
    ↓
Seller sees sale in "My Sales" with buyer address
    ↓
Seller ships + enters tracking # (USPS/FedEx/UPS)
    ↓
Backend creates Ship24 tracker ($0.01/track)
    ↓
Ship24 sends webhook when "Delivered"
    ↓
Wait 3 days → Auto-release escrow to seller
    ↓
Buyer can still manually confirm earlier
```

---

## Phase 1: Database Schema

**New Migration:** `Pokemon/supabase/migrations/010_shipping_tracking.sql`

```sql
-- Add shipping address to profiles (optional, user can save default)
ALTER TABLE profiles ADD COLUMN shipping_address JSONB;
-- Format: { street, city, state, zip, country, phone }

-- Add shipping info to settlements
ALTER TABLE settlements ADD COLUMN shipping_address JSONB;
ALTER TABLE settlements ADD COLUMN tracking_number TEXT;
ALTER TABLE settlements ADD COLUMN tracking_carrier TEXT; -- usps, fedex, ups
ALTER TABLE settlements ADD COLUMN ship24_tracker_id TEXT;
ALTER TABLE settlements ADD COLUMN shipped_at TIMESTAMPTZ;
ALTER TABLE settlements ADD COLUMN delivered_at TIMESTAMPTZ;
ALTER TABLE settlements ADD COLUMN auto_release_at TIMESTAMPTZ; -- delivered_at + 3 days
```

---

## Phase 2: Shipping Address Collection

### 2.1 Backend: Address Endpoints

**File:** `src/controllers/profile.controller.ts` (NEW)

- `GET /api/v1/profile/shipping-address` - Get user's saved address
- `PUT /api/v1/profile/shipping-address` - Save/update address

**File:** `src/routes/profile.routes.ts` (NEW)

### 2.2 Frontend: Address Form Component

**File:** `Pokemon/src/components/shipping-address-form.tsx` (NEW)

- Form fields: street, city, state, zip, country, phone
- Used in account settings AND as modal during checkout if missing

**File:** `Pokemon/src/components/account-settings.tsx` or similar

- Add "Shipping Address" section

### 2.3 Address Required Before Bid/Purchase

**Backend Changes:**

| Endpoint | Change |
|----------|--------|
| `POST /api/v1/stripe/bids` | Check user has shipping address, return error if not |
| `POST /api/v1/stripe/buy-now` | Check user has shipping address, return error if not |
| `POST /api/v1/stripe/payment-methods` | Check user has shipping address, return error if not |

**Frontend Changes:**

| Component | Change |
|-----------|--------|
| `Pokemon/src/components/place-bid-drawer.tsx` | Show address form modal if missing before allowing bid |
| Buy Now flow | Show address form modal if missing before purchase |
| Payment method setup | Show address form modal if missing |

### 2.4 Copy Address to Settlement

When settlement is created (auction win or Buy Now), copy buyer's address from profile to `settlements.shipping_address`.

**Files:**
- `src/services/stripe/settlement.service.ts` - Update `settleAuction()` and `processBuyNow()`

---

## Phase 3: Seller "My Sales" Dashboard

### 3.1 Backend: Seller Sales Endpoints

**File:** `src/controllers/seller.controller.ts`

Add endpoint: `GET /api/v1/seller/sales` - Get seller's sold listings with buyer info

```typescript
// Response type
interface Sale {
  settlementId: string;
  listingId: string;
  cardName: string;
  cardSet: string;
  imageUrl: string;
  amount: number;
  soldAt: string;
  buyerDisplayName: string;
  buyerUsername: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
  };
  trackingNumber: string | null;
  trackingCarrier: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  deliveryConfirmedAt: string | null;
  status: 'awaiting_shipment' | 'shipped' | 'delivered' | 'completed';
}
```

**File:** `src/routes/seller.routes.ts`

- Add `GET /api/v1/seller/sales` route

### 3.2 Frontend: My Sales Drawer

**File:** `Pokemon/src/components/my-sales-drawer.tsx` (NEW)

- List of sold items grouped by status (Awaiting Shipment, Shipped, Completed)
- Each sale shows: card image, card name, amount, buyer name, "Add Tracking" button
- Clicking opens sale detail drawer

**File:** `Pokemon/src/components/sale-detail-drawer.tsx` (NEW)

- Full sale details: card info, buyer address (formatted for label printing)
- "Mark as Shipped" with:
  - Tracking number input
  - Carrier selector dropdown (USPS, FedEx, UPS)
- Tracking status display once shipped

**File:** `Pokemon/src/lib/connect.ts`

- Add `getSales()` function
- Add `addTracking(settlementId, trackingNumber, carrier)` function

---

## Phase 4: Ship24 Integration

### 4.1 Environment Variables

**Backend `.env`:**
```
SHIP24_API_KEY=<your-api-key>
SHIP24_WEBHOOK_SECRET=<generated-when-setting-up-webhook>
```

### 4.2 Backend: Ship24 Service

**File:** `src/services/ship24.service.ts` (NEW)

```typescript
class Ship24Service {
  // Create tracker when seller enters tracking # ($0.01 per track)
  async createTracker(trackingNumber: string, carrier?: string): Promise<string>;

  // Get current tracking status
  async getTrackingStatus(trackerId: string): Promise<TrackingStatus>;

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): boolean;

  // Parse webhook payload
  parseWebhook(payload: any): {
    trackingNumber: string;
    status: string;
    deliveredAt?: string;
  };
}
```

### 4.3 Backend: Add Tracking Endpoint

**File:** `src/controllers/seller.controller.ts`

Add endpoint: `POST /api/v1/seller/sales/:settlementId/tracking`

Flow:
1. Validate seller owns this sale
2. Validate tracking number format
3. Save tracking_number + tracking_carrier to settlement
4. Create Ship24 tracker (API call)
5. Save ship24_tracker_id to settlement
6. Set shipped_at = now
7. Return success

### 4.4 Backend: Ship24 Webhook

**File:** `src/controllers/webhooks.controller.ts` (existing or new)

Add endpoint: `POST /api/v1/webhooks/ship24`

Flow:
1. Verify webhook signature using SHIP24_WEBHOOK_SECRET
2. Parse webhook payload to get tracking number + status
3. Find settlement by tracking_number
4. Update settlement based on status:
   - If "delivered":
     - Set delivered_at = now
     - Set auto_release_at = now + 3 days
5. Log the event

**File:** `src/routes/webhooks.routes.ts` (may need to create)

- Add Ship24 webhook route (no JWT auth, verify signature instead)

### 4.5 Ship24 Webhook Setup (Manual Step)

After deploying, register webhook URL in Ship24 dashboard:
- URL: `https://<your-heroku-app>.herokuapp.com/api/v1/webhooks/ship24`
- Events: All tracking status updates

---

## Phase 5: Auto-Release Escrow

### 5.1 Backend: Auto-Release Logic

**File:** `src/services/stripe/payout.service.ts`

Add method:
```typescript
async processAutoReleases(): Promise<{ processed: number; errors: string[] }> {
  // Find settlements where:
  // - delivered_at is set (package was delivered)
  // - auto_release_at <= now (3 days have passed)
  // - delivery_confirmed_at is null (not manually confirmed)
  // - status = 'charged' (payment was successful)

  // For each: call existing releaseEscrowToSeller() logic
  // This transfers funds to seller's Connect account
}
```

### 5.2 Cron Job Endpoint

**File:** `src/controllers/settlement.controller.ts`

Add endpoint: `POST /api/v1/cron/auto-release`

- Protected by API key (same pattern as settle-auctions)
- Calls `payoutService.processAutoReleases()`
- Schedule to run daily via Heroku Scheduler

---

## Phase 6: Frontend Updates

### 6.1 Purchase Detail - Show Tracking

**File:** `Pokemon/src/components/purchase-detail-drawer.tsx`

Add tracking section (after seller info):
- If shipped: Show tracking number, carrier, "Track Package" link
- Current status from Ship24 (if available)
- Estimated delivery / delivered date

### 6.2 Navigation - Add My Sales

**File:** `Pokemon/src/components/header.tsx` or menu component

- Add "My Sales" menu item for users who have a seller Connect account
- Links to My Sales drawer

---

## Files Summary

### Backend (pokemon-backend)

| File | Action |
|------|--------|
| `src/services/ship24.service.ts` | **NEW** - Ship24 API client |
| `src/controllers/profile.controller.ts` | **NEW** - Shipping address endpoints |
| `src/routes/profile.routes.ts` | **NEW** - Profile routes |
| `src/controllers/seller.controller.ts` | **MODIFY** - Add sales list, tracking entry |
| `src/routes/seller.routes.ts` | **MODIFY** - Add sales routes |
| `src/controllers/webhooks.controller.ts` | **MODIFY** - Add Ship24 webhook handler |
| `src/routes/webhooks.routes.ts` | **MODIFY** - Add webhook route |
| `src/services/stripe/settlement.service.ts` | **MODIFY** - Copy address to settlement |
| `src/services/stripe/payout.service.ts` | **MODIFY** - Add auto-release logic |
| `src/controllers/stripe.controller.ts` | **MODIFY** - Require address for bid/buy |
| `src/controllers/settlement.controller.ts` | **MODIFY** - Add auto-release cron endpoint |

### Frontend (Pokemon)

| File | Action |
|------|--------|
| `src/components/shipping-address-form.tsx` | **NEW** - Address form component |
| `src/components/my-sales-drawer.tsx` | **NEW** - Seller sales list |
| `src/components/sale-detail-drawer.tsx` | **NEW** - Sale details + tracking entry |
| `src/components/purchase-detail-drawer.tsx` | **MODIFY** - Show tracking info |
| `src/components/place-bid-drawer.tsx` | **MODIFY** - Require address before bid |
| `src/lib/connect.ts` | **MODIFY** - Add sales API functions |

### Database (Pokemon/supabase)

| File | Action |
|------|--------|
| `migrations/010_shipping_tracking.sql` | **NEW** - Schema changes |

---

## Implementation Order

1. **Database migration** - Schema changes first
2. **Backend: Address endpoints** - GET/PUT shipping address
3. **Backend: Require address** - Modify bid/buy-now to check address
4. **Frontend: Address form** - Create reusable component
5. **Frontend: Integrate address** - Add to bid/buy flows
6. **Backend: Seller sales endpoint** - GET /api/v1/seller/sales
7. **Frontend: My Sales drawer** - List sold items
8. **Backend: Ship24 service** - API client
9. **Backend: Add tracking endpoint** - POST tracking number
10. **Frontend: Sale detail drawer** - Tracking entry UI
11. **Backend: Ship24 webhook** - Receive delivery updates
12. **Backend: Auto-release job** - Process after 3 days
13. **Frontend: Show tracking** - Update purchase detail
14. **Test end-to-end flow**
15. **Deploy + register Ship24 webhook URL**

---

## API Reference

### Ship24 API Docs
- https://docs.ship24.com/getting-started
- https://docs.ship24.com/trackers

### Ship24 Webhook Events
- `tracking.checkpoint` - New tracking event
- Status values: `pending`, `info_received`, `in_transit`, `out_for_delivery`, `delivered`, `failed`, `exception`
