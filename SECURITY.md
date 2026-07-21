# Security policy

Report suspected vulnerabilities privately to the repository owner. Do not include customer data, provider credentials, order access tokens, or exploit details in a public issue.

## Operational requirements

- Generate independent random values of at least 32 characters for `JWT_SECRET`, `CUSTOMER_TOKEN_SECRET`, and `COMMERCE_WEBHOOK_SECRET`.
- Use TLS for every browser, provider, SMTP, and database connection outside a private container network.
- Scope provider tokens to the minimum operations needed and rotate them after suspected exposure.
- Keep PostgreSQL backups encrypted and test restoration regularly. Immutable audit rows are a control, not a backup.
- Review truck memberships and revoke departed operators immediately.
- Do not run development migrations, seeds, or database reset commands against production.

Supported deployments should install current Node.js 22 and PostgreSQL 16 security releases. Dependency and container checks run in CI; deployment owners remain responsible for patching base images and infrastructure.
