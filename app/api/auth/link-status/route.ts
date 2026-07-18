import { NextRequest, NextResponse } from "next/server";
import { getLinkStatus } from "@/lib/login-links";
import { LINK_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.cookies.get(LINK_COOKIE)?.value;
  if (!code) return NextResponse.json({ linked: false });
  try {
    return NextResponse.json(await getLinkStatus(code));
  } catch {
    return NextResponse.json({ linked: false }, { status: 503 });
  }
}