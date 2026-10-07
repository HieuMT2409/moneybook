// Import this FIRST in e2e specs: ConfigModule validates process.env when AppModule is imported.
process.env.DATABASE_URL ??= 'postgresql://u:p@localhost:5432/db';
process.env.JWT_SECRET ??= 'x'.repeat(40);
