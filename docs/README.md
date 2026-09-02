# Softmato Platform — Documentation

**Start here.** Read in this order before writing any code.

| #   | File                                           | What it answers                                |
| --- | ---------------------------------------------- | ---------------------------------------------- |
| 1   | [`PRD.md`](./PRD.md)                           | What we're building, for whom, and why         |
| 2   | [`ARCHITECTURE.md`](./ARCHITECTURE.md)         | How the system is shaped and how data flows    |
| 3   | [`RULES.md`](./RULES.md)                       | Hard boundaries. **Read this twice.**          |
| 4   | [`PHASES.md`](./PHASES.md)                     | Build order and acceptance criteria            |
| 5   | [`DATABASE.md`](./DATABASE.md)                 | Schema design and the guarantees it enforces   |
| 6   | [`API.md`](./API.md)                           | Payment API + provider integration specs       |
| 6a  | [`INTEGRATION.md`](./INTEGRATION.md)           | What a SaaS team reads to integrate us         |
| 7   | [`DESIGN.md`](./DESIGN.md)                     | Visual system, tokens, NPR/BS formatting       |
| 8   | [`FOLDER_STRUCTURE.md`](./FOLDER_STRUCTURE.md) | Where code goes                                |
| 9   | [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) | Conventions, especially money handling         |
| 10  | [`ENVIRONMENT.md`](./ENVIRONMENT.md)           | Local setup, env vars, deployment              |
| 11  | [`TESTING.md`](./TESTING.md)                   | What must pass before anything goes live       |
| 12  | [`MEMORY.md`](./MEMORY.md)                     | Running state. **Update after every session.** |
| 13  | [`CHANGELOG.md`](./CHANGELOG.md)               | Shipped changes                                |

Reference material:

- [`CHART_OF_ACCOUNTS.md`](./CHART_OF_ACCOUNTS.md) — account codes and every posting rule
- [`EMAIL_SYSTEM.md`](./EMAIL_SYSTEM.md) — sender identity, categories, and every trigger
- [`schema.sql`](./schema.sql) — full PostgreSQL DDL

---

## The one-paragraph version

Softmato Technology Pvt Ltd is a Nepali software company. It runs its own SaaS
products and does agency work. This platform is four things in one Next.js app:
a public marketing site, a founder-only admin panel, a centralized payment
platform that all the SaaS products call instead of integrating eSewa/Khalti
themselves, and a double-entry accounting system that is the company's
authoritative financial record.

The payment and accounting parts handle real money. `RULES.md` exists because
of that. When those rules conflict with convenience, the rules win.

---

## Before you start a session

1. Read `MEMORY.md` — it tells you where the last session stopped
2. Read the current phase in `PHASES.md`
3. Re-read `RULES.md` if you'll touch payments, the ledger, or auth

## Before you end a session

1. Update `MEMORY.md`: what you completed, what's in progress, what you learned,
   what you need from the founder
2. Add a `CHANGELOG.md` entry if anything shipped
3. Never leave a payment path half-implemented across a session boundary —
   finish it or revert it
