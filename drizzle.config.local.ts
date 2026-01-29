import { defineConfig } from 'drizzle-kit';

// Local config for generating migrations (no remote connection needed)
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
});
