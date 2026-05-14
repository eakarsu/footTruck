# Audit Apply Notes — foodTruck

Source: `_AUDIT/reports/batch_10.md` § Substantive #4 foodTruck

## Original audit recommendations

Audit verdict: **SUBSTANTIVE** — 13 routes, 11 AI endpoints. Existing AI endpoints already cover recommendations, demand forecasting, location suggestion, social post generation, customer reply, menu insights.

### What's missing
- Real-time customer app for browsing, pre-ordering, payment
- Dynamic pricing optimization (surge pricing for busy hours)
- Supplier/ingredient sourcing optimization
- Predictive maintenance for equipment
- Customer loyalty/rewards program
- Crew scheduling optimization

### Custom feature ideas
- Real-time mobile customer app with location-based push
- Computer vision-based food quality/plating feedback
- Dynamic pricing engine
- Supplier agent (auto-place ingredient orders)
- Crew scheduling AI (fair scheduling, fatigue management, skill matching)
- Voice order-taking

## Implemented this pass

All implemented in `backend/src/routes/ai.js`, mounted under `/api/ai`:

- `POST /api/ai/truck/:truckId/dynamic-pricing` — pulls truck, menu items, recent orders, current weather (via existing `weatherService`), and asks the model for per-item price adjustments. Returns JSON `{window, items[{item_id, current_price, recommended_price, delta_pct, reason}], global_strategy, warnings}`. Mechanical implementation of "Dynamic pricing engine".
- `POST /api/ai/truck/:truckId/predict-maintenance` — accepts caller-supplied `equipment` list, returns JSON predicted failure windows and preventive actions per item. Mechanical implementation of "Predictive maintenance for equipment".
- `POST /api/ai/truck/:truckId/crew-schedule` — accepts `{ crew, shifts, constraints }` and returns JSON shift→crew assignments, fairness score, unassigned shifts, warnings. Mechanical implementation of "Crew scheduling AI".

All three reuse the existing `openrouter.chat` helper, `prisma`, `authenticate` middleware, and the strict-JSON parsing pattern already used elsewhere in this file. Prisma calls are wrapped in `.catch(() => [])` so missing tables (e.g. `menuItem`, `order`) do not break the endpoints. Syntax-checked with `node --check`.

## Backlog (not implemented)

### Needs schema/data model work
- Customer loyalty/rewards program — needs loyalty table + rules engine.
- Supplier sourcing optimization — needs supplier catalog + price feed schema.

### Needs frontend work (forbidden this pass)
- Real-time customer app for browsing/pre-ordering/payment.
- Computer-vision food quality feedback (UI capture flow).

### Needs creds / external deps
- Voice order-taking (telephony provider — Twilio, etc.).
- Real-time push (FCM/APNs or OneSignal).

## Categorisation

- MECHANICAL: dynamic-pricing, predict-maintenance, crew-schedule (all done).
- NEEDS-SCHEMA: loyalty program, supplier sourcing.
- NEEDS-FRONTEND: customer app, food-quality vision.
- NEEDS-CREDS: voice telephony, push notifications.

## Apply pass 3 (frontend)

Verified existing FE wiring; **LEFT-AS-IS**.

- `frontend/src/pages/AIAdvanced.jsx` already exercises all three pass-2 endpoints.
- `frontend/src/services/api.js` exports `dynamicPricing`, `predictMaintenance`, `crewSchedule` axios helpers.
- `App.jsx` registers `<Route path="/ai-advanced" element={<AIAdvanced />} />`.
- Bearer auth handled by the shared axios instance interceptor (token from localStorage).
- No code changes; idempotence rule applied. Log: `_AUDIT/apply3_logs/ab3_59.md`.

## Apply pass 4 (mechanical backlog)

SKIPPED — no MECHANICAL items remain in backlog.

Backlog categorisation (from prior section):
- NEEDS-SCHEMA: customer loyalty/rewards program, supplier sourcing optimization.
- NEEDS-FRONTEND-only (no new mechanical backend work): real-time customer app, computer-vision food quality feedback.
- NEEDS-CREDS: voice order-taking (Twilio etc.), real-time push (FCM/APNs/OneSignal).

No code changes. Log: `_AUDIT/apply4_logs/ab3_59.md`.
