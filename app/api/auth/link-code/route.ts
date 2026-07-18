import { NextResponse } from "next/server";
import { createLoginLink } from "@/lib/login-links";
import { LINK_COOKIE, linkCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { code } = await createLoginLink();
    const response = NextResponse.json({ code });
    response.cookies.set(LINK_COOKIE, code, linkCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "The login service is not connected yet. Set DATABASE_URL and try again." }, { status: 503 });
  }
}