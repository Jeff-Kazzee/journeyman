import { NextRequest, NextResponse } from "next/server";
import { consumeLinkedLogin } from "@/lib/login-links";
import { LINK_COOKIE, SESSION_COOKIE, linkCookieOptions, sessionCookieOptions, signSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const failure = new URL("/login?error=link-not-ready", request.url);
  const code = request.cookies.get(LINK_COOKIE)?.value;
  if (!code) return NextResponse.redirect(failure);

  try {
    const userId = await consumeLinkedLogin(code);
    if (!userId) return NextResponse.redirect(failure);
    const response = NextResponse.redirect(new URL("/app", request.url));
    response.cookies.set(SESSION_COOKIE, signSession(userId), sessionCookieOptions);
    response.cookies.set(LINK_COOKIE, "", { ...linkCookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.redirect(failure);
  }
}