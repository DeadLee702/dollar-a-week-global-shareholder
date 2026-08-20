# 🌍 Dollar a Week Global Shareholder

## The Global Initiative

A globally replicable, member-funded infrastructure protocol built around a simple principle:

**$1 USD per person per week, or local equivalent.**

The objective is to transform small recurring contributions into collectively governed productive infrastructure.

## Core Sequence

**LAND → WATER → ENERGY → HOUSING → PRODUCTIVE INFRASTRUCTURE**

Land is the first major physical acquisition.

The Seed Cell establishes a physical foundation before infrastructure deployment proceeds.

## Seed Cell

The initial operating unit is the Seed Cell.

Target:

**10,000 verified members**

At $1 per member per week:

- $10,000 per week
- $520,000 per year

The global target model is:

**3.5 billion participants**

which represents a theoretical:

- $3.5 billion per week
- $182 billion per year
- $546 billion over three years

These are theoretical contribution figures, not currently available capital.

Actual deployable capital depends on payment processing, compliance, reserves, operations, taxes, infrastructure costs, and other legitimate expenses.

## Authority Model

> **THE PROTOCOL IS THE AUTHORITY.**
>
> **THE HUMANS ARE THE MECHANICS.**
>
> **THE LEDGER IS THE WITNESS.**

The system is not designed around unilateral control by a CEO, administrator, custodian, or other individual.

Critical actions are constrained by protocol rules, governance, database controls, multi-signature custody, and audit records.

## Governance

The foundational governance principle is:

**ONE VERIFIED MEMBER = ONE VOTE**

Voting power does not automatically increase because a member contributes more money.

## Treasury

Treasury execution requires multiple protocol conditions, including:

- Governance approval
- Required custodian signatures
- Sufficient deployable capital
- Required due diligence
- Valid protocol state
- Server-side enforcement
- Database-level execution controls

No single individual should have unilateral control of collective funds.

## Land Gate

The Land Gate is the first major physical deployment stage.

The intended workflow is:

**Contribution → Capital Threshold → Land Proposal → Due Diligence → Member Vote → Multi-Signature Authorization → Land Acquisition → Asset Recording**

The acquired land becomes the physical foundation for subsequent infrastructure.

## Universal Resource Ledger

The Universal Resource Ledger records the system's financial and physical history.

It is designed to track:

- Contributions
- Treasury activity
- Governance decisions
- Land
- Infrastructure
- Projects
- Assets
- Milestones
- State transitions
- Audits

The objective is verifiable transparency rather than reliance on personal trust.

## Infrastructure Lifecycle

Assets are tracked through explicit lifecycle states:

**PLANNED → PROPOSED → APPROVED → ACQUIRED → DEPLOYED → OPERATIONAL → RETIRED**

The system must distinguish planned infrastructure from infrastructure that actually exists.

## Security Principles

The frontend is never the security boundary.

Critical protocol rules are enforced server-side and, where appropriate, at the database level.

The architecture includes:

- Authentication
- Authorization
- Database constraints
- Audit logging
- Idempotency protection
- Multi-signature controls
- Cryptographic signature verification
- Due-diligence records
- State-machine enforcement
- Row-Level Security policies
- Payment webhook verification

## Current Status

The repository currently contains the backend protocol implementation, database migrations, Prisma schema, governance and treasury services, Land Gate workflow, multi-signature controls, resource ledger, infrastructure primitives, audit infrastructure, and automated tests.

**Important:** Tests and builds still require a configured development environment with PostgreSQL and the required environment variables.

This repository does not claim that physical infrastructure, land ownership, membership totals, or treasury balances exist merely because corresponding software records exist.

## Development

Install dependencies:

```bash
npm ci
