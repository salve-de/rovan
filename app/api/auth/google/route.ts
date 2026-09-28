import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createOAuthState, buildOAuthStateCookieHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/callback/google`;

  if (!env.googleClientId) {
    // Google未設定はユーザーに開発者向け情報を見せず、通常のログイン導線へ戻す。
    return NextResponse.redirect(new URL("/login?error=google_unavailable", url.origin));
  }

  const state = createOAuthState();
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", env.googleClientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.headers.set("Set-Cookie", buildOAuthStateCookieHeader(state));
  return response;
}
