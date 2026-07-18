import { MessageChannel, OutboundMessageStatus } from "@prisma/client";
import {
  activateNextScheduledTask,
  chunkTelegramMessage,
  renderTaskCard,
  scheduledUsers,
  stalledUsersSince,
} from "./conversation.ts";
import { prisma } from "./prisma.ts";

export type TelegramSender = (telegramId: string, text: string) => Promise<void>;

async function recordOutbound(userId: string, body: string, status: OutboundMessageStatus) {
  await prisma.outboundMessage.create({
    data: {
      userId,
      channel: MessageChannel.TELEGRAM,
      body,
      status,
      ...(status === OutboundMessageStatus.SENT ? { sentAt: new Date() } : {}),
    },
  });
}

async function sendAndRecord(userId: string, telegramId: string, body: string, send: TelegramSender): Promise<void> {
  for (const chunk of chunkTelegramMessage(body)) {
    try {
      await send(telegramId, chunk);
      await recordOutbound(userId, chunk, OutboundMessageStatus.SENT);
    } catch (error) {
      await recordOutbound(userId, chunk, OutboundMessageStatus.FAILED).catch(() => undefined);
      console.warn(`[daily] Telegram delivery failed for ${userId}: ${error instanceof Error ? error.message : "unknown error"}`);
      return;
    }
  }
}

/** Runs at 07:00. It only activates a SCHEDULED task when the user has no ACTIVE task. */
export async function deliverScheduledTasks(send: TelegramSender): Promise<void> {
  const users = await scheduledUsers();
  for (const user of users) {
    if (!user.telegramId) continue;
    const task = await activateNextScheduledTask(user.id);
    if (task) await sendAndRecord(user.id, user.telegramId, renderTaskCard(task), send);
  }
}

function localStartOfDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Runs at 19:00. At most one coach-style nudge per user per local calendar day. */
export async function nudgeStalledLearners(send: TelegramSender, now = new Date()): Promise<void> {
  const startOfDay = localStartOfDay(now);
  const stalled = await stalledUsersSince(startOfDay);
  for (const learner of stalled) {
    const alreadyNudged = await prisma.outboundMessage.findFirst({
      where: {
        userId: learner.id,
        channel: MessageChannel.TELEGRAM,
        body: { startsWith: "Nudge:" },
        sentAt: { gte: startOfDay },
      },
      select: { id: true },
    });
    if (alreadyNudged) continue;
    await sendAndRecord(
      learner.id,
      learner.telegramId,
      `Nudge: no pressure—your active task is “${learner.task.title}.” If today got away from you, it will still be here tomorrow. Use /task when a small next step is possible.`,
      send,
    );
  }
}