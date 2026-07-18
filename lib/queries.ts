import { prisma } from "@/lib/prisma";

export async function getTranscriptBySlug(slug: string) {
  return prisma.user.findUnique({
    where: { slug },
    select: {
      slug: true,
      createdAt: true,
      profile: { select: { goal: true, targetRole: true } },
      transcriptEntries: { orderBy: { createdAt: "desc" } },
    },
  });
}