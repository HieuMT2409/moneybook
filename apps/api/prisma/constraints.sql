-- Defense in depth: the API already validates these, the database enforces them too.
-- Apply as an extra migration (see README, "Database constraints").
ALTER TABLE "transactions"        ADD CONSTRAINT "transactions_amount_positive"        CHECK ("amount" > 0);
ALTER TABLE "transfers"           ADD CONSTRAINT "transfers_amount_positive"           CHECK ("amount" > 0);
ALTER TABLE "transfers"           ADD CONSTRAINT "transfers_accounts_differ"           CHECK ("from_account_id" <> "to_account_id");
ALTER TABLE "budgets"             ADD CONSTRAINT "budgets_amount_positive"             CHECK ("amount" > 0);
ALTER TABLE "budgets"             ADD CONSTRAINT "budgets_month_range"                 CHECK ("month" BETWEEN 1 AND 12);
ALTER TABLE "debts"               ADD CONSTRAINT "debts_amounts_valid"                 CHECK ("total_amount" > 0 AND "paid_amount" >= 0 AND "paid_amount" <= "total_amount");
ALTER TABLE "debt_payments"       ADD CONSTRAINT "debt_payments_amount_positive"       CHECK ("amount" > 0);
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_amount_positive"        CHECK ("amount" > 0);
