import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function getCurrentUser() {
  const store = await cookies();
  const session = verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}