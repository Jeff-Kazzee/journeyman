import { LoginLinkStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const LINK_LIFETIME_MS = 15 * 60 * 1000;

function generateCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function createLoginLink() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateCode();
    try {
      await prisma.loginLink.create({
        data: { code, expiresAt: new Date(Date.now() + LINK_LIFETIME_MS) },
      });
      return { code, expiresAt: new Date(Date.now() + LINK_LIFETIME_MS) };
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error("Could not create a login code.");
}

export async function getLinkStatus(code: string) {
  const link = await prisma.loginLink.findUnique({ where: { code } });
  if (!link || link.expiresAt <= new Date()) return { linked: false };
  return { linked: link.status === LoginLinkStatus.LINKED };
}

export async function consumeLinkedLogin(code: string) {
  return prisma.$transaction(async (tx) => {
    const link = await tx.loginLink.findUnique({ where: { code } });
    if (!link || link.expiresAt <= new Date()) {
      if (link && link.status === LoginLinkStatus.PENDING) {
        await tx.loginLink.update({ where: { id: link.id }, data: { status: LoginLinkStatus.EXPIRED } });
      }
      return null;
    }
    if (link.status !== LoginLinkStatus.LINKED || !link.userId) return null;

    await tx.loginLink.update({
      where: { id: link.id },
      data: { status: LoginLinkStatus.CONSUMED, consumedAt: new Date() },
    });
    return link.userId;
  });
}