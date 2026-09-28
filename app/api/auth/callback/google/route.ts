import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSessionToken, buildSessionCookieHeader, parseOAuthStateCookie, verifyOAuthState, buildClearOAuthStateCookieHeader } from "@/lib/auth";
import { findWatchesByEmail } from "@/lib/storage";

function redirectWithClearedState(destination: URL) {
  const response = NextResponse.redirect(destination);
  response.headers.append("Set-Cookie", buildClearOAuthStateCookieHeader());
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const stateParam = url.searchParams.get("state");
  const stateCookie = parseOAuthStateCookie(request.headers.get("cookie"));

  if (error || !code) {
    return redirectWithClearedState(new URL(`/login?error=${encodeURIComponent(error || "cancelled")}`, url.origin));
  }

  // Login CSRF protection: the state issued when the flow started must match
  // what Google echoes back. This also implicitly requires the state cookie
  // to be present, so a forged callback without a prior /api/auth/google
  // visit from this browser is rejected.
  if (!verifyOAuthState(stateCookie, stateParam)) {
    return redirectWithClearedState(new URL("/login?error=state_mismatch", url.origin));
  }

  if (!env.googleClientId || !env.googleClientSecret) {
    return redirectWithClearedState(new URL("/login?error=google_not_configured", url.origin));
  }

  try {
    const redirectUri = `${url.origin}/api/auth/callback/google`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      return redirectWithClearedState(new URL("/login?error=google_token_failed", url.origin));
    }

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoResponse.json();
    const email = typeof userInfo.email === "string" ? userInfo.email.trim().toLowerCase() : "";

    if (!email) {
      return redirectWithClearedState(new URL("/login?error=email_not_provided", url.origin));
    }
    // Google's userinfo v2 endpoint marks unverified addresses as
    // verified_email: false. Do not let someone log in as an email they do
    // not actually control.
    if (userInfo.verified_email === false) {
      return redirectWithClearedState(new URL("/login?error=email_not_verified", url.origin));
    }

    const watches = await findWatchesByEmail(email);
    const latestWatch = watches[0];

    const sessionToken = createSessionToken({
      email,
      watchToken: latestWatch?.token,
      brandName: latestWatch?.latest?.discovery?.brandName,
    });

    const destination = latestWatch?.token
      ? new URL(`/watch?token=${encodeURIComponent(latestWatch.token)}`, url.origin)
      : new URL("/billing", url.origin);

    const response = redirectWithClearedState(destination);
    response.headers.append("Set-Cookie", buildSessionCookieHeader(sessionToken));
    return response;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return redirectWithClearedState(new URL("/login?error=oauth_internal_error", url.origin));
  }
}
