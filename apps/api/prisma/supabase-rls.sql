-- SUPABASE ONLY. Run once in Supabase Dashboard -> SQL Editor, after the first migration.
--
-- Why: Supabase auto-exposes tables in the `public` schema through its REST "Data API" using the public
-- anon key. Tables created by Prisma have Row Level Security OFF, so anyone holding the anon key could
-- read or write them directly, bypassing this API's auth. Enabling RLS with NO policies blocks that path.
-- The API is unaffected: Prisma connects as the `postgres` role, which bypasses RLS.
ALTER TABLE "users"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transfers"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budgets"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "debts"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "debt_payments"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "todos"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations"     ENABLE ROW LEVEL SECURITY;
