/**
 * Only pass a thrown Error's message through to the client when it is one of
 * our own intentional, user-facing validation messages. Anything else
 * (upstream provider error text, HTTP status codes, Supabase/Stripe errors,
 * stack traces, JSON parser errors, ...) must never reach the browser, so it
 * is replaced with a generic fallback. The original error is still available
 * to the caller for `console.error` logging.
 */
export function safeErrorMessage(
  error: unknown,
  fallback: string,
  allow: readonly string[] | ((message: string) => boolean) = [],
): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message;
  const isAllowed = typeof allow === "function" ? allow(message) : allow.includes(message);
  return isAllowed ? message : fallback;
}
