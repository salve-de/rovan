function text(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function integer(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

export const env = {
  siteUrl: text("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  openAiKey: text("OPENAI_API_KEY"),
  openAiDiscoveryModel: text("OPENAI_DISCOVERY_MODEL", "gpt-5.6-luna"),
  openAiSearchModel: text("OPENAI_SEARCH_MODEL", "gpt-5.6-luna"),
  geminiKey: text("GEMINI_API_KEY"),
  geminiModel: text("GEMINI_MODEL", "gemini-3.6-flash"),
  perplexityKey: text("PERPLEXITY_API_KEY"),
  perplexityModel: text("PERPLEXITY_MODEL", "sonar"),
  supabaseUrl: text("SUPABASE_URL"),
  supabaseServiceKey: text("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: text("STRIPE_SECRET_KEY"),
  stripePriceId: text("STRIPE_PRICE_ID"),
  stripeWebhookSecret: text("STRIPE_WEBHOOK_SECRET"),
  resendApiKey: text("RESEND_API_KEY"),
  watchFromEmail: text("WATCH_FROM_EMAIL"),
  cronSecret: text("CRON_SECRET"),
  adminSecret: text("ADMIN_SECRET"),
  rateLimitSalt: text("RATE_LIMIT_SALT", "development-only"),
  freeScansPerHour: Math.max(1, integer("FREE_SCANS_PER_HOUR", 4)),
  watchPromptBatchSize: Math.min(12, Math.max(1, integer("WATCH_PROMPT_BATCH_SIZE", 8))),
  watchObservationConcurrency: Math.min(12, Math.max(1, integer("WATCH_OBSERVATION_CONCURRENCY", 9))),
  watchResumeMinutes: Math.min(60, Math.max(5, integer("WATCH_RESUME_MINUTES", 15))),
  googleClientId: text("GOOGLE_CLIENT_ID"),
  googleClientSecret: text("GOOGLE_CLIENT_SECRET"),
  // Intentionally no hardcoded fallback here: a missing AUTH_SECRET in
  // production must make session signing fail closed, not sign with a
  // guessable default. lib/auth.ts decides the safe fallback per environment
  // at call time. See lib/auth.ts#getSecretKey.
  authSecret: text("AUTH_SECRET"),
};

export function providerReadiness() {
  return {
    openai: Boolean(env.openAiKey),
    gemini: Boolean(env.geminiKey),
    perplexity: Boolean(env.perplexityKey),
  };
}
