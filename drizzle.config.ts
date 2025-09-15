import { defineConfig } from "drizzle-kit";
import { getEnvVar } from './lib/env-security';

const databaseUrl = getEnvVar('DATABASE_URL');

if (!databaseUrl) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
