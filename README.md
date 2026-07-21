# Food Truck Operations

Food Truck Operations is a React and Express application for truck managers, operators, and customers. Its commerce path reserves recipe-backed inventory, obtains authoritative tax and payment evidence, prevents duplicate work with idempotency keys, handles partial fulfillment and refunds, and records a database-protected audit chain.

## Production guarantees

- Every order mutation uses an explicit state transition and an `Idempotency-Key`.
- Inventory is locked and reserved transactionally, so an order cannot oversell its configured recipe.
- Payment, refund, delivery, tax, reconciliation, and signed webhook evidence is stored with a unique provider event identity.
- Order events, provider evidence, refunds, and inventory movements are append-only at the database layer.
- Customers need the private access token returned at order creation to view or cancel an order.
- Truck membership roles are `VIEWER`, `OPERATOR`, and `MANAGER`; revocation is checked on every request.
- Migrations are an explicit release step; application startup never migrates, resets, creates, seeds, or rewrites a database.

## Requirements

- Node.js 22
- PostgreSQL 16
- Licensed tax, payment, and delivery providers implementing the contract below
- SMTP and SMS providers for transactional notifications

Copy `.env.example` to `.env`, replace every example secret and provider value, then start each service in a separate terminal:

```bash
npm --prefix backend ci
npm --prefix frontend ci
./migrate.sh
./start.sh backend
./start.sh frontend
```

The backend defaults to port `4000` and the Vite development frontend to port `3000`. Set `CORS_ALLOWED_ORIGINS=http://localhost:3000` for local development. No provider-dependent commerce action succeeds when its provider configuration is missing.

For a container deployment, populate `.env` and run:

```bash
docker compose up --build
```

The frontend is then served at `http://localhost:8080`. The compose database uses a persistent named volume. Treat `docker compose down -v` as destructive because it removes that database volume.

## Commerce provider contract

The backend sends an HTTPS `POST` with bearer authorization and an `Idempotency-Key`. The JSON body contains `operation`, `sourceOrderRef`, `currency`, `amountCents`, optional `lineItems` or `destination`, and typed metadata. The provider must return JSON shaped like:

```json
{
  "licensed": true,
  "provider": "provider-name",
  "eventId": "globally-unique-event-id",
  "sourceTimestamp": "2026-07-20T12:00:00.000Z",
  "sourceOrderRef": "the-submitted-reference",
  "status": "SUCCEEDED",
  "result": {}
}
```

Supported statuses are `PENDING`, `REQUIRES_ACTION`, `AUTHORIZED`, `SUCCEEDED`, and `FAILED`. A tax quote result must contain a non-negative integer `taxCents`. Payment results use a provider `paymentIntentId`; refund results use a provider `refundId`; delivery results use a provider delivery reference. Provider endpoints must return the identical result when an idempotency key is replayed.

Partner webhooks are sent to `POST /api/commerce/webhooks/:provider`. Sign the exact request bytes with HMAC-SHA256 using `COMMERCE_WEBHOOK_SECRET` and place the lowercase hex digest in `X-Commerce-Signature`. Webhook payloads use the response evidence fields above plus `operation` (`PAYMENT`, `REFUND`, or `DELIVERY`) and `orderId`. Reusing an event ID with altered evidence is rejected.

## Verification

Run the same checks as CI:

```bash
npm --prefix backend run lint
npm --prefix backend test
npm --prefix backend audit --audit-level=low
npm --prefix frontend run build
npm --prefix frontend audit --audit-level=low
```

Integration tests require `DATABASE_URL` pointing to a disposable PostgreSQL database with `npx --prefix backend prisma migrate deploy` already applied. The suite covers duplicate and altered webhooks, idempotent creation, overselling rollback, failed-payment recovery, partial fulfillment, refund bounds, role revocation, reconciliation behavior, customer access, and database tamper rejection.

## Recovery and operations

Failed payment, delivery, or reconciliation evidence places an order into `EXCEPTION`. A manager must investigate the stored provider evidence and use the explicit recovery endpoint with a reason; operators cannot silently overwrite a status. Captured payments must be fully refunded before cancellation. Reconciliation mismatches remain visible as exceptions until reviewed.

Monitor `/api/health`, provider error rates, orders in `EXCEPTION`, failed notification delivery, inventory reconciliation, and audit-chain verification. Back up PostgreSQL before each deployment and test restores. See `SECURITY.md` for secret and access controls.
