### Payments & Stripe

This project includes a Stripe integration boundary and a payments flow designed to be safe and idempotent.

What the code provides:
- A Payments API endpoint to create a pending Contribution and a Stripe Checkout session (POST /payments/create-session).
- A StripeService that creates a pending contribution record and calls Stripe to create a Checkout Session embedding contribution_id in session.metadata.
- A PaymentReconciliationService that processes Stripe webhooks and atomically marks contributions SUCCEEDED via the database function `fn_mark_contribution_succeeded`.

Important notes for running locally:
- Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your environment to enable real Stripe calls.
- If STRIPE_SECRET_KEY is not configured, the service will return a dev session URL and will not call Stripe. This allows local development without secrets.
- The Stripe webhook handler expects the raw request body for signature verification. When using Express, ensure you capture raw body: e.g., `app.use(express.raw({ type: 'application/json' }))` for the webhook route.

Idempotency & safety:
- Webhook events are processed idempotently using the idempotency_keys table.
- Contributions are only marked SUCCEEDED by the server after trusted webhook verification and atomic DB function execution.

