# MONEYBOOK — Progress

## Phases
| # | Phase | Status |
|---|-------|--------|
| 1 | Project setup + database + Prisma | ✅ code + generate OK |
| 2 | Authentication (argon2, JWT, global guard, default categories) | ✅ |
| 3 | Accounts + Categories | ✅ |
| 4 | Transactions + Transfer + Balance engine | ✅ (54 test) |
| 5 | Dashboard | ✅ |
| 6 | Budget | ✅ |
| 7 | Debt + Recurring | ✅ |
| 8 | Reports | ✅ |
| 9 | Testing | ✅ 54 unit/e2e test, no DB needed |
| 10 | Docker + CI + README | ✅ |
| FE | Next.js UI (all pages) | ✅ `next build` OK |

## Verified in the build sandbox
- API: `tsc`, `eslint`, `jest` (54 pass), `nest build`
- Web: `tsc`, `eslint`, `next build`

## NOT verified yet (needs a real Postgres) — do these first on your machine
- [ ] `npm install`, copy the 3 `.env` files (see README §8)
- [ ] `npm run db:up && npm run db:generate && npm run db:migrate -- --name init` (commit `prisma/migrations`)
- [ ] `npm run db:seed` then log in with demo@moneybook.app / Demo123!
- [ ] Click through every page; check an account's `GET /accounts/:id/reconcile` -> `matches: true`
- [ ] Optional: apply `prisma/constraints.sql` as an extra migration (README §8)
- [ ] `docker compose up --build`
- [ ] Add screenshots to `docs/screenshots/`

## Supabase
- Schema now has `directUrl = env("DIRECT_URL")` -> both `DATABASE_URL` and `DIRECT_URL` must be set (locally they can be identical).
- Run `apps/api/prisma/supabase-rls.sql` once in Supabase SQL Editor (blocks the public Data API).

## Design decisions
- Monorepo (npm workspaces): `apps/api`, `apps/web`; no `packages/shared` yet.
- Money: `Decimal(19,2)`; the API returns money as strings.
- `Transaction` = INCOME/EXPENSE only; transfers live in `Transfer`.
- `Account.balance` changes only through `applyBalanceDelta` (atomic increment inside `$transaction`).
- Dates: `@db.Date` + Asia/Ho_Chi_Minh for "today".
- Credit card: negative balance = debt; net worth treats negative balances as liabilities.
- Creating a debt does not touch balances; a payment with an account does (LEND +, BORROW −).

## Known limitations
- Single currency (VND); API error messages are English; JWT is in localStorage (MVP).
- Transfers have their own tab (no merged income/expense/transfer timeline).
- Balance tests use an in-memory fake DB, not real PostgreSQL.
