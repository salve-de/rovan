import assert from "node:assert/strict";
import test from "node:test";
import { configurationFailures, durableStorageAvailable } from "../lib/runtime-readiness";

test("production cannot silently fall back to volatile storage", () => {
  assert.throws(() => durableStorageAvailable({ NODE_ENV: "production" }), /保存先/);
  assert.equal(durableStorageAvailable({ NODE_ENV: "development" }), false);
  assert.equal(durableStorageAvailable({ NODE_ENV: "production", SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "test" }), true);
});

test("production configuration rejects private origin and weak rate-limit salt", () => {
  const configuration = { OPENAI_API_KEY: "test", SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "test", RATE_LIMIT_SALT: "s".repeat(32), NEXT_PUBLIC_SITE_URL: "https://rovan.example", AUTH_SECRET: "a".repeat(32) };
  assert.deepEqual(configurationFailures(configuration), []);
  assert.ok(configurationFailures({ ...configuration, NEXT_PUBLIC_SITE_URL: "http://localhost:3000", RATE_LIMIT_SALT: "development-only" }).length >= 2);
  assert.ok(configurationFailures({ ...configuration, NEXT_PUBLIC_SITE_URL: "https://user:password@rovan.example" }).length);
  assert.ok(configurationFailures({ ...configuration, SUPABASE_SERVICE_ROLE_KEY: "" }).includes("SUPABASE_SERVICE_ROLE_KEY"));
});

test("production configuration requires a strong AUTH_SECRET", () => {
  const configuration = { OPENAI_API_KEY: "test", SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "test", RATE_LIMIT_SALT: "s".repeat(32), NEXT_PUBLIC_SITE_URL: "https://rovan.example", AUTH_SECRET: "a".repeat(32) };
  assert.ok(configurationFailures({ ...configuration, AUTH_SECRET: "" }).includes("AUTH_SECRET"));
  assert.ok(configurationFailures({ ...configuration, AUTH_SECRET: "short" }).includes("AUTH_SECRET:too-short"));
});
