### README additions

This repository branch init/protocol-scaffold contains an evolving implementation of the Dollar a Week Global Shareholder protocol.

Recent additions:
- Universal Resource Ledger (resource_ledger table)
- Project & infrastructure lifecycle services and controllers
- Protocol state log and enforcement primitives
- Infrastructure asset recording (water, energy, housing, productive infrastructure)
- Multisig treasury & land gate enhancements

Run the project locally (development):
1. Ensure PostgreSQL is running and set DATABASE_URL in .env
2. Apply migrations in order: migrations/001_init.sql, 002_governance_reconciliation.sql, 003_multisig_land.sql, 004_projects_states.sql
3. npm ci
4. npm run seed
5. npm start

Testing:
- Tests require a running Postgres and applied migrations. Tests will create and clean records in the configured DB. Run `npm test` after migrations are applied.

Security notes:
- RLS policies are intentionally not enabled by default. Review migrations/005_rls_policies.sql (if present) before enabling.
- Do not use demo data in production environments.
