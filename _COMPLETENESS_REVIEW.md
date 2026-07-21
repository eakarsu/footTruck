# Completeness Review: footTruck

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 144 project files (131 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished commerce/order operations application, not just an empty scaffold. Inspection found 131 source files across `frontend/`, `backend/` using Next.js, React, Express, Prisma; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Implement an idempotent order state machine covering reservation, payment, cancellation, refund, fulfillment, and exception recovery.
2. Connect real inventory, tax, payment, shipping/delivery, and partner-webhook providers behind retry-safe adapters.
3. Add role-scoped customer, operator, and merchant workflows with immutable order and refund audit history.
4. Test duplicate webhooks, partial fulfillment, payment failure, overselling, and reconciliation end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.
- Regression risk is high because no recognizable project-owned automated tests cover the main path.

## Evidence inspected

- `README.md`
- `backend/src/index.js:95`
- `backend/prisma/seed.js:9`
- `frontend/src/App.jsx`
- `backend/package.json`
- `start.sh`

## Recommended next action

Choose one real commerce/order operations journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress (2026-07-20)

Implemented the source-actionable review in the commerce/order journey. Orders now use a database-enforced, idempotent state machine for inventory reservation, payment, cancellation, refund, partial fulfillment, delivery, reconciliation exceptions, and explicit recovery. Recipe-backed inventory is transactionally locked to reject overselling; tax, payment, refund, delivery, and partner-webhook evidence passes through typed, fail-closed provider adapters with replay protection and HMAC verification. Customer access uses private order tokens, truck membership exposes viewer/operator/manager workflows with immediate revocation, and order, refund, provider, and inventory evidence is protected by eight database triggers and a verifiable hash-chained audit log. Executable generated gap, generic-LLM, mock social, demo-location, and destructive seed/reset paths were removed.

Added a checked-in baseline migration, 21 unit/integration assertions covering duplicate and altered webhooks, role scope and revocation, payment failure/recovery, exact idempotency, overselling rollback, partial fulfillment, refund limits, customer access, audit integrity, and database tamper rejection. Added fail-closed startup, environment and provider-contract documentation, container definitions, security guidance, and CI for migration, drift-adjacent status, tests, builds, dependency audits, image builds, and secret scanning. Independent verification separated migration from startup and the runtime image, made unmigrated startup fail closed, removed wildcard socket CORS, required live non-revoked identities plus truck/order authorization for sensitive socket rooms and broadcasts, added a complete safe environment template, generated CI/test secrets ephemerally, and hardened the runtime image to a non-root user. Verified from an empty disposable PostgreSQL 17 instance: migration deploy/status passed, migration-to-schema diff reported no difference, all 21 tests passed, and all eight custom triggers were installed. Backend syntax/schema validation and both dependency audits passed with zero vulnerabilities; the Vite production build, explicit migration/startup boundary, live health check, Docker Compose configuration, and history/current-tree Gitleaks scans passed. Local Docker image execution remains externally unverified because the machine's Colima daemon is stopped; CI performs both image builds.

## Runtime acceptance (2026-07-20)

The non-suite runtime validator passed on the fresh assigned PostgreSQL/API/UI ports `55652/6108/6109`: the disposable schema was applied, the explicit provisioning command created a bcrypt-12 verified administrator, `start.sh` required the assigned loopback ports and mapped the validator's equivalent non-production secret names, login issued the signed bearer token, and `/api/auth/me` reloaded the user from PostgreSQL after blacklist validation. The smoke test recorded `API_VERIFIED — startup_login_session_api`. Production startup still requires the actual Prisma migration ledger; only `NODE_ENV=test` accepts direct disposable schema evidence. All 21 commerce tests, backend source/syntax validation, the frontend production build, shell/JSON validation, and `git diff --check` passed. All acceptance and test ports were released.
