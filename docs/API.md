# API Reference - MagnetRaffic

Base URL: `{APP_URL}` (default: http://localhost:3000)

## Authentication

Todas las rutas `/api/*` (excepto auth) requieren header:
```
Authorization: Bearer {token}
```

---

## Auth

### POST /api/auth/login
Admin login.
```json
Body: { "email": "admin@example.com", "password": "..." }
Response: { "token": "jwt...", "user": { "id", "email", "name", "role" } }
```

### POST /api/auth/affiliate/login
Affiliate login.
```json
Body: { "email": "...", "password": "..." }
Response: { "token": "jwt...", "affiliate": { "id", "email", "ref_id", "name" } }
```

### POST /api/auth/affiliate/register
Register new affiliate. If `parent_ref_id` is provided, auto-assigns parent.
```json
Body: { "email", "password", "first_name", "last_name", "company_name", "phone", "website", "company_id", "parent_ref_id" }
Response: { "status": "registered", "affiliate_id": 1, "ref_id": "AFF...", "parent_ref_id": null }
```

---

## Tracking (Public - No Auth)

### GET /track
Click tracking. Redirects to campaign URL.
```
Params: ref_id (required), campaign_id, sub_id1, sub_id2, sub_id3
Sets cookies: _aff_click, _aff_ref
```

### GET /postback
Conversion postback. Called from client's server.
```
Params (one required): click_id | ref_id | coupon
Optional: campaign_id, order_id, amount, email, first_name, customer_id, new_customer
Response: { "status": "ok", "conversion_id": 1, "commission": 25.00, "tracking_method": "s2s" }
```

---

## Affiliates

### GET /api/affiliates
List affiliates. Params: `status`, `search`, `page`, `limit`

### GET /api/affiliates/:id
Get affiliate by ID.

### PATCH /api/affiliates/:id/status
Update status. Body: `{ "status": "approved" | "suspended" | "rejected" }`

### GET /api/affiliates/:id/stats
Get affiliate stats + balance. Params: `start_date`, `end_date`

---

## Campaigns

### GET /api/campaigns
List campaigns.

### POST /api/campaigns
Create campaign.
```json
Body: { "name", "url", "description", "commission_type": "cpa|revshare|hybrid",
        "commission_amount", "commission_percent", "cookie_days", "mlm_enabled" }
```

### POST /api/campaigns/:id/affiliates
Assign affiliate to campaign. Body: `{ "affiliate_id", "custom_commission_type", "custom_commission_amount", "custom_commission_percent" }`

### GET /api/campaigns/:id/stats
Campaign stats (clicks, conversions, affiliates).

---

## Ranks

### GET /api/ranks
List all 10 ranks for company.

### PUT /api/ranks/:rankNumber
Update rank config.
```json
Body: { "name", "color", "can_recruit", "max_recruit_depth",
        "min_personal_sales", "min_team_sales", "min_direct_recruits" }
```

### PUT /api/ranks/:rankNumber/commissions/:campaignId
Set commission for rank + campaign.
```json
Body: { "direct_commission_percent", "direct_commission_fixed",
        "override_commission_percent", "override_commission_fixed",
        "override_by_level": [{"level":1,"percent":5,"fixed":2}] }
```

### GET /api/ranks/commissions/:campaignId
View all rank commissions for a campaign.

### PATCH /api/ranks/assign/:affiliateId
Assign rank. Body: `{ "rank_number": 3, "reason": "Promotion" }`

### GET /api/ranks/history/:affiliateId
Rank change history.

### POST /api/ranks/evaluate
Evaluate all agents for auto-promotion. Returns: `{ "evaluated": 50, "promoted": 3, "promotions": [...] }`

### GET /api/ranks/settings
Get override mode and max depth.

### PUT /api/ranks/settings
Set override mode. Body: `{ "override_mode": "fixed" | "difference", "max_recruitment_depth": 10 }`

---

## Team

### GET /api/team/:id/tree
Recursive team tree. Params: `depth` (default 10).
Returns hierarchical tree with children arrays.

### GET /api/team/:id/stats
Team summary: personal stats, direct recruits, team totals, MLM earnings, stats by level.

### GET /api/team/:id/top
Top performers in team. Params: `limit` (default 10).

---

## Conversions (Admin)

### GET /api/conversions/list
List conversions with filters. Params: `status`, `affiliate_id`, `campaign_id`, `start_date`, `end_date`, `page`, `limit`.

### PATCH /api/conversions/:id/approve
Approve conversion.

### PATCH /api/conversions/:id/reject
Reject conversion. Atomically reverts all commissions (direct + MLM chain).

---

## Reports

### GET /api/reports/dashboard
Overview stats (affiliates, clicks, conversions, revenue, commission, today stats).

### GET /api/reports/by-date
Revenue by date. Params: `start_date`, `end_date`, `group_by` (day|month).

### GET /api/reports/top-affiliates
Top affiliates by revenue. Params: `limit`.

### GET /api/reports/search
Global search. Params: `q` (min 2 chars). Searches affiliates, campaigns, conversions.

---

## Coupons

### GET /api/coupons
List coupons with affiliate and campaign info.

### POST /api/coupons
Create coupon. Body: `{ "code", "affiliate_id", "campaign_id", "discount_type", "discount_value", "max_usage", "expires_at" }`

### DELETE /api/coupons/:id
Deactivate coupon.

---

## Payouts

### GET /api/payouts
List payouts.

### POST /api/payouts
Create payout (atomic - verifies balance, deducts with lock).
```json
Body: { "affiliate_id", "amount", "payment_method": "paypal|bank_transfer|crypto|check", "notes" }
```

### PATCH /api/payouts/:id/complete
Mark as completed. Body: `{ "transaction_id" }`

---

## Fraud

### GET /api/fraud/logs
Fraud alerts. Params: `severity`, `limit`.

### GET /api/fraud/stats
Fraud summary (total, today, critical, high, blocked IPs).

### GET /api/fraud/blocked-ips
List blocked IPs.

### POST /api/fraud/block-ip
Block IP. Body: `{ "ip_address", "reason" }`

### DELETE /api/fraud/unblock-ip/:ip
Unblock IP.

### GET /api/fraud/suspicious-ips
Top 20 suspicious IPs by alert count.

---

## Notifications

### GET /api/notifications
List notifications. Params: `unread_only` (true/false), `limit`.
Returns: `{ "notifications": [...], "unread": 5 }`

### PATCH /api/notifications/:id/read
Mark single notification as read.

### PATCH /api/notifications/read-all
Mark all as read.

---

## Webhooks

### GET /api/webhooks
List webhooks.

### POST /api/webhooks
Create webhook.
```json
Body: { "name", "url", "secret" (optional, for HMAC), "events": ["new_conversion", "new_affiliate", "rank_promotion", ...] }
Valid events: new_conversion, new_affiliate, affiliate_approved, payout_completed, rank_promotion, fraud_alert
```

### PUT /api/webhooks/:id
Update webhook.

### DELETE /api/webhooks/:id
Delete webhook.

### POST /api/webhooks/:id/test
Send test webhook.

**Webhook payload format:**
```json
{
  "event": "new_conversion",
  "timestamp": "2026-04-07T...",
  "data": { ... }
}
Headers: X-Webhook-Event, X-Webhook-Signature (HMAC-SHA256 if secret configured)
```

---

## Health

### GET /health
```json
Response: { "status": "ok", "timestamp": "...", "uptime": 12345 }
```
