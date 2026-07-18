import { createHmac, timingSafeEqual } from "node:crypto";
import { requireSessionSecret } from "@/lib/config";

export const SESSION_COOKIE = "journeyman_session";
export const LINK_COOKIE = "journeyman_link_code";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function signature(payload: string) {
  return createHmac("sha256", requireSessionSecret()).update(payload).digest("hex");
}

export function signSession(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySession(value?: string) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [userId, rawExpiry, suppliedSignature] = parts;
  const expiry = Number(rawExpiry);
  if (!userId || !Number.isSafeInteger(expiry) || expiry < Date.now() / 1000) return null;

  const expected = signature(`${userId}.${rawExpiry}`);
  const supplied = Buffer.from(suppliedSignature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) return null;

  return { userId, expiresAt: expiry };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

export const linkCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 15,
};